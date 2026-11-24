import { ActionRetryPolicy, ConflictResolutionStrategy, EnqueueActionOptions, PendingActionStatus, PendingWidgetAction, StateEnvelope, StateSchemaConfig, SyncPendingActionsOptions, SyncPendingActionsResult } from './types';
export interface StorageBackend {
    get<T = any>(key: string, appGroup?: string): Promise<T | null>;
    set(key: string, value: any, appGroup?: string): Promise<boolean>;
    remove(key: string, appGroup?: string): Promise<boolean>;
}
export declare function setEngineStorageBackend(backend: StorageBackend): void;
export declare function computeRetryDelayMs(attempt: number, policy?: ActionRetryPolicy): number;
/**
 * 📥 Đẩy 1 hành động vào Persistent Action Queue với Idempotency Key & Deduplication.
 * Phù hợp cho bài toán Offline-First (vd: Check-in chấm công khi mất mạng).
 */
export declare function enqueuePendingAction(actionId: string, options?: EnqueueActionOptions): Promise<{
    enqueued: boolean;
    deduplicated: boolean;
    action: PendingWidgetAction;
}>;
/**
 * 📋 Lấy danh sách các Pending Actions đang nằm trong hàng đợi.
 */
export declare function getPendingActions(options?: {
    widgetKey?: string;
    instanceId?: string;
    appGroup?: string;
    status?: PendingActionStatus;
}): Promise<PendingWidgetAction[]>;
/**
 * 🔄 Khôi phục các action bị treo ở trạng thái 'syncing' (do app bị kill/crash giữa chừng)
 * về trạng thái 'queued' để sẵn sàng chạy lại an toàn.
 */
export declare function recoverPendingActions(options?: {
    widgetKey?: string;
    instanceId?: string;
    appGroup?: string;
    staleSyncingMs?: number;
}): Promise<number>;
/**
 * ⚡ Đồng bộ toàn bộ Pending Actions lên backend với Retry Policy & Idempotency Key.
 */
export declare function syncPendingActions(options: SyncPendingActionsOptions): Promise<SyncPendingActionsResult>;
/**
 * 🧹 Xóa các Pending Actions khỏi hàng đợi (toàn bộ hoặc theo status).
 */
export declare function clearPendingActions(options?: {
    widgetKey?: string;
    instanceId?: string;
    appGroup?: string;
    status?: PendingActionStatus | 'all';
}): Promise<boolean>;
export declare function registerStateSchema<T = any>(key: string, config: StateSchemaConfig<T>): void;
export declare function readVersionedState<T = any>(key: string, options?: {
    instanceId?: string;
    appGroup?: string;
    defaultValue?: T;
}): Promise<StateEnvelope<T> | null>;
export declare function resolveStateConflict<T>(local: StateEnvelope<T>, remote: StateEnvelope<T>, strategy?: ConflictResolutionStrategy<T>): T;
/**
 * 🔒 Atomic State Update: Khóa tuần tự theo (key, instanceId) + tăng _rev + hỗ trợ Migration & Conflict Resolution.
 */
export declare function updateStateAtomic<T = any>(key: string, updater: (current: T | null) => T, options?: {
    instanceId?: string;
    appGroup?: string;
    source?: 'app' | 'widget' | 'server';
    version?: number;
    conflictStrategy?: ConflictResolutionStrategy<T>;
}): Promise<StateEnvelope<T>>;
export declare function computeDataDiff(prev: Record<string, any> | null | undefined, next: Record<string, any> | null | undefined): {
    hasChanges: boolean;
    changedKeys: string[];
    patch: Record<string, any>;
};
export declare function evaluateCacheStatus(nowMs: number, lastUpdatedAtMs: number | undefined, ttlSeconds?: number, staleTtlSeconds?: number): 'fresh' | 'stale' | 'miss';
//# sourceMappingURL=actionQueue.d.ts.map