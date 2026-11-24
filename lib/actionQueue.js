"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEngineStorageBackend = setEngineStorageBackend;
exports.computeRetryDelayMs = computeRetryDelayMs;
exports.enqueuePendingAction = enqueuePendingAction;
exports.getPendingActions = getPendingActions;
exports.recoverPendingActions = recoverPendingActions;
exports.syncPendingActions = syncPendingActions;
exports.clearPendingActions = clearPendingActions;
exports.registerStateSchema = registerStateSchema;
exports.readVersionedState = readVersionedState;
exports.resolveStateConflict = resolveStateConflict;
exports.updateStateAtomic = updateStateAtomic;
exports.computeDataDiff = computeDataDiff;
exports.evaluateCacheStatus = evaluateCacheStatus;
const stateSchemas = new Map();
const atomicLocks = new Map();
let activeStorageBackend = null;
function setEngineStorageBackend(backend) {
    activeStorageBackend = backend;
}
function getStorage() {
    if (!activeStorageBackend) {
        throw new Error('[react-native-live-widgets] Storage backend has not been initialized.');
    }
    return activeStorageBackend;
}
function buildQueueStorageKey(widgetKey = 'main', instanceId = 'default') {
    return `widget_action_queue_${widgetKey}_${instanceId}`;
}
function buildIsolatedStateKey(key, instanceId = 'default') {
    return instanceId === 'default' ? `widget_vstate_${key}` : `widget_vstate_${key}__${instanceId}`;
}
function generateIdempotencyKey(actionId, instanceId) {
    const rand = Math.random().toString(36).slice(2, 8);
    return `idem_${actionId}_${instanceId}_${Date.now()}_${rand}`;
}
function computeRetryDelayMs(attempt, policy) {
    const strategy = policy?.strategy || 'exponential';
    const base = Math.max(50, policy?.baseDelayMs ?? 500);
    const maxDelay = Math.max(base, policy?.maxDelayMs ?? 30000);
    let delay = base;
    if (strategy === 'exponential') {
        delay = base * Math.pow(2, Math.max(0, attempt - 1));
    }
    else if (strategy === 'linear') {
        delay = base * Math.max(1, attempt);
    }
    else {
        delay = base;
    }
    delay = Math.min(delay, maxDelay);
    if (policy?.jitter) {
        const factor = 0.8 + Math.random() * 0.4;
        delay = Math.round(delay * factor);
    }
    return delay;
}
/**
 * 📥 Đẩy 1 hành động vào Persistent Action Queue với Idempotency Key & Deduplication.
 * Phù hợp cho bài toán Offline-First (vd: Check-in chấm công khi mất mạng).
 */
async function enqueuePendingAction(actionId, options = {}) {
    const widgetKey = options.widgetKey || 'main';
    const instanceId = options.instanceId || 'default';
    const storageKey = buildQueueStorageKey(widgetKey, instanceId);
    const dedupeWindowMs = options.dedupeWindowMs ?? 3000;
    const now = Date.now();
    const existing = (await getStorage().get(storageKey, options.appGroup)) || [];
    const queue = Array.isArray(existing) ? [...existing] : [];
    const dedupeKey = options.dedupeKey || `${actionId}:${JSON.stringify(options.payload || {})}`;
    // 1. Action Deduplication: Kiểm tra idempotencyKey trùng hoặc cùng dedupeKey trong cửa sổ thời gian
    const duplicate = queue.find((item) => {
        if (options.idempotencyKey && item.idempotencyKey === options.idempotencyKey) {
            return true;
        }
        const isActive = item.status === 'queued' || item.status === 'syncing';
        if (isActive && item.dedupeKey === dedupeKey && now - item.createdAt <= dedupeWindowMs) {
            return true;
        }
        return false;
    });
    if (duplicate) {
        return { enqueued: false, deduplicated: true, action: duplicate };
    }
    const newAction = {
        id: `act_${now}_${Math.random().toString(36).slice(2, 7)}`,
        actionId,
        widgetKey,
        instanceId,
        payload: options.payload,
        idempotencyKey: options.idempotencyKey || generateIdempotencyKey(actionId, instanceId),
        dedupeKey,
        status: 'queued',
        retries: 0,
        maxRetries: options.maxRetries ?? 3,
        createdAt: now,
        updatedAt: now,
    };
    queue.push(newAction);
    await getStorage().set(storageKey, queue, options.appGroup);
    return { enqueued: true, deduplicated: false, action: newAction };
}
/**
 * 📋 Lấy danh sách các Pending Actions đang nằm trong hàng đợi.
 */
async function getPendingActions(options) {
    const storageKey = buildQueueStorageKey(options?.widgetKey, options?.instanceId);
    const existing = (await getStorage().get(storageKey, options?.appGroup)) || [];
    const queue = Array.isArray(existing) ? existing : [];
    if (options?.status) {
        return queue.filter((a) => a.status === options.status);
    }
    return queue;
}
/**
 * 🔄 Khôi phục các action bị treo ở trạng thái 'syncing' (do app bị kill/crash giữa chừng)
 * về trạng thái 'queued' để sẵn sàng chạy lại an toàn.
 */
async function recoverPendingActions(options) {
    const storageKey = buildQueueStorageKey(options?.widgetKey, options?.instanceId);
    const staleMs = options?.staleSyncingMs ?? 0;
    const now = Date.now();
    const existing = (await getStorage().get(storageKey, options?.appGroup)) || [];
    if (!Array.isArray(existing) || existing.length === 0)
        return 0;
    let recovered = 0;
    const updated = existing.map((item) => {
        if (item.status === 'syncing' && now - item.updatedAt >= staleMs) {
            recovered++;
            return { ...item, status: 'queued', updatedAt: now };
        }
        return item;
    });
    if (recovered > 0) {
        await getStorage().set(storageKey, updated, options?.appGroup);
    }
    return recovered;
}
/**
 * ⚡ Đồng bộ toàn bộ Pending Actions lên backend với Retry Policy & Idempotency Key.
 */
async function syncPendingActions(options) {
    const widgetKey = options.widgetKey || 'main';
    const instanceId = options.instanceId || 'default';
    const storageKey = buildQueueStorageKey(widgetKey, instanceId);
    // Tự động recovery trước khi sync
    await recoverPendingActions({ widgetKey, instanceId, appGroup: options.appGroup });
    const existing = (await getStorage().get(storageKey, options.appGroup)) || [];
    const queue = Array.isArray(existing) ? [...existing] : [];
    const result = {
        total: queue.length,
        acked: 0,
        failed: 0,
        deadLettered: 0,
        skipped: 0,
        errors: [],
    };
    const now = Date.now();
    const maxRetriesGlobal = options.retry?.maxRetries;
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.status === 'acked' || item.status === 'dead_letter') {
            result.skipped++;
            continue;
        }
        if (item.nextRetryAt && item.nextRetryAt > now) {
            result.skipped++;
            continue;
        }
        const effectiveMaxRetries = maxRetriesGlobal ?? item.maxRetries ?? 3;
        queue[i] = { ...item, status: 'syncing', updatedAt: Date.now() };
        await getStorage().set(storageKey, queue, options.appGroup);
        let succeeded = false;
        let lastError = '';
        let attempts = item.retries;
        while (attempts <= effectiveMaxRetries) {
            try {
                const res = await options.handler(queue[i]);
                const ok = typeof res === 'boolean' ? res : Boolean(res?.ok);
                if (ok) {
                    succeeded = true;
                    break;
                }
                lastError = (typeof res === 'object' && res?.error) || 'Handler returned ok=false';
            }
            catch (err) {
                lastError = err?.message || String(err);
            }
            attempts++;
            if (attempts <= effectiveMaxRetries) {
                const delayMs = computeRetryDelayMs(attempts, options.retry);
                if (delayMs > 0 && delayMs <= 5000) {
                    await new Promise((r) => setTimeout(r, delayMs));
                }
            }
        }
        if (succeeded) {
            queue[i] = {
                ...queue[i],
                status: 'acked',
                retries: attempts,
                updatedAt: Date.now(),
                lastError: undefined,
            };
            result.acked++;
        }
        else {
            const isDead = attempts > effectiveMaxRetries;
            queue[i] = {
                ...queue[i],
                status: isDead ? 'dead_letter' : 'failed',
                retries: attempts,
                updatedAt: Date.now(),
                lastError,
                nextRetryAt: isDead ? undefined : Date.now() + computeRetryDelayMs(attempts, options.retry),
            };
            if (isDead)
                result.deadLettered++;
            else
                result.failed++;
            result.errors.push({ id: item.id, actionId: item.actionId, error: lastError });
        }
    }
    const finalQueue = options.keepAcked ? queue : queue.filter((a) => a.status !== 'acked');
    await getStorage().set(storageKey, finalQueue, options.appGroup);
    return result;
}
/**
 * 🧹 Xóa các Pending Actions khỏi hàng đợi (toàn bộ hoặc theo status).
 */
async function clearPendingActions(options) {
    const storageKey = buildQueueStorageKey(options?.widgetKey, options?.instanceId);
    if (!options?.status || options.status === 'all') {
        return await getStorage().remove(storageKey, options?.appGroup);
    }
    const existing = (await getStorage().get(storageKey, options?.appGroup)) || [];
    const filtered = Array.isArray(existing)
        ? existing.filter((a) => a.status !== options.status)
        : [];
    return await getStorage().set(storageKey, filtered, options?.appGroup);
}
// ─── STATE VERSIONING, MIGRATION, ATOMIC UPDATE & CONFLICT RESOLUTION ────────
function registerStateSchema(key, config) {
    stateSchemas.set(key, config);
}
async function readVersionedState(key, options) {
    const instanceId = options?.instanceId || 'default';
    const storageKey = buildIsolatedStateKey(key, instanceId);
    const raw = await getStorage().get(storageKey, options?.appGroup);
    if (raw === null || raw === undefined) {
        return null;
    }
    const schema = stateSchemas.get(key);
    let envelope;
    if (typeof raw === 'object' && raw !== null && typeof raw._v === 'number' && 'data' in raw) {
        envelope = raw;
    }
    else {
        envelope = {
            _v: 1,
            _rev: 1,
            _updatedAt: Date.now(),
            _source: 'app',
            _instanceId: instanceId,
            data: raw,
        };
    }
    // Tự động chạy State Migration nếu phiên bản dữ liệu cũ hơn schema hiện tại
    if (schema && envelope._v < schema.version && typeof schema.migrate === 'function') {
        const migratedData = schema.migrate(envelope.data, envelope._v);
        envelope = {
            ...envelope,
            _v: schema.version,
            _rev: envelope._rev + 1,
            _updatedAt: Date.now(),
            data: migratedData,
        };
        await getStorage().set(storageKey, envelope, options?.appGroup);
    }
    return envelope;
}
function resolveStateConflict(local, remote, strategy = 'last_write_wins') {
    if (typeof strategy === 'function') {
        return strategy(local, remote);
    }
    if (strategy === 'server_wins') {
        return remote._source === 'server' ? remote.data : local.data;
    }
    if (strategy === 'client_wins') {
        return local.data;
    }
    return remote._updatedAt >= local._updatedAt ? remote.data : local.data;
}
/**
 * 🔒 Atomic State Update: Khóa tuần tự theo (key, instanceId) + tăng _rev + hỗ trợ Migration & Conflict Resolution.
 */
async function updateStateAtomic(key, updater, options) {
    const instanceId = options?.instanceId || 'default';
    const storageKey = buildIsolatedStateKey(key, instanceId);
    const prevLock = atomicLocks.get(storageKey) || Promise.resolve();
    let releaseLock;
    const nextLock = new Promise((resolve) => {
        releaseLock = resolve;
    });
    atomicLocks.set(storageKey, prevLock.then(() => nextLock));
    await prevLock;
    try {
        const existing = await readVersionedState(key, { instanceId, appGroup: options?.appGroup });
        const schema = stateSchemas.get(key);
        const targetVersion = options?.version ?? schema?.version ?? existing?._v ?? 1;
        const nextData = updater(existing ? existing.data : null);
        const candidate = {
            _v: targetVersion,
            _rev: (existing?._rev ?? 0) + 1,
            _updatedAt: Date.now(),
            _source: options?.source || 'app',
            _instanceId: instanceId,
            data: nextData,
        };
        if (existing && options?.conflictStrategy && existing._source !== candidate._source) {
            candidate.data = resolveStateConflict(existing, candidate, options.conflictStrategy);
        }
        await getStorage().set(storageKey, candidate, options?.appGroup);
        return candidate;
    }
    finally {
        releaseLock();
    }
}
// ─── NHÓM C HELPERS: DATA DIFF & STALE-WHILE-REVALIDATE EVALUATOR ────────────
function computeDataDiff(prev, next) {
    const a = prev || {};
    const b = next || {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const changedKeys = [];
    const patch = {};
    for (const k of allKeys) {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
            changedKeys.push(k);
            if (k in b) {
                patch[k] = b[k];
            }
        }
    }
    return { hasChanges: changedKeys.length > 0, changedKeys, patch };
}
function evaluateCacheStatus(nowMs, lastUpdatedAtMs, ttlSeconds = 0, staleTtlSeconds = 0) {
    if (!lastUpdatedAtMs || lastUpdatedAtMs <= 0)
        return 'miss';
    const ageSeconds = Math.max(0, (nowMs - lastUpdatedAtMs) / 1000);
    if (ttlSeconds > 0 && ageSeconds < ttlSeconds)
        return 'fresh';
    if (staleTtlSeconds > 0 && ageSeconds < ttlSeconds + staleTtlSeconds)
        return 'stale';
    return 'miss';
}
//# sourceMappingURL=actionQueue.js.map