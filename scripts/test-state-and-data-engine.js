#!/usr/bin/env node

/**
 * 🧪 Test Suite for Nhóm B (State Management & Persistent Action Queue - P0)
 * & Nhóm C (Background Data Engine: SWR & Data Diff - P1)
 */

const assert = require('assert');
const {
  setEngineStorageBackend,
  enqueuePendingAction,
  getPendingActions,
  recoverPendingActions,
  syncPendingActions,
  clearPendingActions,
  registerStateSchema,
  readVersionedState,
  updateStateAtomic,
  computeDataDiff,
  evaluateCacheStatus,
  computeRetryDelayMs,
} = require('../lib/actionQueue');

// In-memory StorageBackend mock for deterministic unit testing
const memStore = new Map();
setEngineStorageBackend({
  async get(key) {
    return memStore.has(key) ? JSON.parse(JSON.stringify(memStore.get(key))) : null;
  },
  async set(key, value) {
    memStore.set(key, JSON.parse(JSON.stringify(value)));
    return true;
  },
  async remove(key) {
    memStore.delete(key);
    return true;
  },
});

(async () => {
  console.log('🧪 [Test Suite] Running State Management, Action Queue (Group B) & Data Engine (Group C) Tests...');

  // ── Test 1: Persistent Action Queue & Idempotency Key ──────────────────────
  console.log('   ✓ Test 1: Enqueue offline Check-in action with Idempotency Key...');
  const q1 = await enqueuePendingAction('CHECK_IN', {
    widgetKey: 'shift',
    instanceId: 'branch_hcm',
    payload: { shiftId: 'S01', lat: 10.77 },
    idempotencyKey: 'checkin_user1_20261124_morning',
  });
  assert.strictEqual(q1.enqueued, true);
  assert.strictEqual(q1.deduplicated, false);
  assert.strictEqual(q1.action.idempotencyKey, 'checkin_user1_20261124_morning');
  assert.strictEqual(q1.action.status, 'queued');

  // ── Test 2: Action Deduplication ───────────────────────────────────────────
  console.log('   ✓ Test 2: Verifying Action Deduplication prevents double Check-in...');
  const q2 = await enqueuePendingAction('CHECK_IN', {
    widgetKey: 'shift',
    instanceId: 'branch_hcm',
    payload: { shiftId: 'S01', lat: 10.77 },
    idempotencyKey: 'checkin_user1_20261124_morning',
  });
  assert.strictEqual(q2.enqueued, false);
  assert.strictEqual(q2.deduplicated, true);
  const pendingList = await getPendingActions({ widgetKey: 'shift', instanceId: 'branch_hcm' });
  assert.strictEqual(pendingList.length, 1, 'Duplicate tap must NOT create a second queued action');

  // ── Test 3: Exponential Backoff Retry Policy & ACK Cleanup ─────────────────
  console.log('   ✓ Test 3: Verifying Exponential Backoff Retry Policy & backend ACK...');
  assert.strictEqual(computeRetryDelayMs(1, { strategy: 'exponential', baseDelayMs: 100 }), 100);
  assert.strictEqual(computeRetryDelayMs(2, { strategy: 'exponential', baseDelayMs: 100 }), 200);
  assert.strictEqual(computeRetryDelayMs(3, { strategy: 'exponential', baseDelayMs: 100 }), 400);

  let callCount = 0;
  const syncRes = await syncPendingActions({
    widgetKey: 'shift',
    instanceId: 'branch_hcm',
    retry: { maxRetries: 3, strategy: 'exponential', baseDelayMs: 50 },
    handler: async (action) => {
      callCount++;
      assert.strictEqual(action.idempotencyKey, 'checkin_user1_20261124_morning');
      if (callCount < 2) return { ok: false, error: 'HTTP 503 Service Unavailable' };
      return { ok: true };
    },
  });
  assert.strictEqual(callCount, 2, 'Should retry once after 503 and succeed on 2nd attempt');
  assert.strictEqual(syncRes.acked, 1);
  assert.strictEqual(syncRes.failed, 0);
  const afterSync = await getPendingActions({ widgetKey: 'shift', instanceId: 'branch_hcm' });
  assert.strictEqual(afterSync.length, 0, 'Acked actions should be removed from queue by default');

  // ── Test 4: Dead-Letter Transition & Clear by Status ───────────────────────
  console.log('   ✓ Test 4: Verifying Dead-Letter transition & clearPendingActions...');
  await enqueuePendingAction('APPROVE_FORM', { widgetKey: 'shift', maxRetries: 1 });
  const failRes = await syncPendingActions({
    widgetKey: 'shift',
    retry: { maxRetries: 1, strategy: 'fixed', baseDelayMs: 50 },
    handler: async () => ({ ok: false, error: 'Permanent 400' }),
  });
  assert.strictEqual(failRes.deadLettered, 1);
  await clearPendingActions({ widgetKey: 'shift', status: 'dead_letter' });
  assert.strictEqual((await getPendingActions({ widgetKey: 'shift' })).length, 0);

  // ── Test 5: Pending Action Recovery after App Crash ────────────────────────
  console.log('   ✓ Test 5: Verifying Pending Action Recovery for stuck syncing actions...');
  const stuckKey = 'widget_action_queue_shift_default';
  memStore.set(stuckKey, [
    {
      id: 'act_stuck_1',
      actionId: 'CHECK_OUT',
      widgetKey: 'shift',
      instanceId: 'default',
      idempotencyKey: 'idem_stuck',
      status: 'syncing',
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
    },
  ]);
  const recoveredCount = await recoverPendingActions({ widgetKey: 'shift' });
  assert.strictEqual(recoveredCount, 1);
  const recoveredList = await getPendingActions({ widgetKey: 'shift' });
  assert.strictEqual(recoveredList[0].status, 'queued');

  // ── Test 6: State Versioning & Automatic Migration (v1 -> v2) ──────────────
  console.log('   ✓ Test 6: Verifying State Versioning & Automatic Migration (v1 -> v2)...');
  memStore.set('widget_vstate_attendance', {
    _v: 1,
    _rev: 1,
    _updatedAt: Date.now() - 1000,
    _source: 'app',
    _instanceId: 'default',
    data: { checkedIn: true },
  });
  registerStateSchema('attendance', {
    version: 2,
    migrate: (oldData) => ({
      status: oldData.checkedIn ? 'ACTIVE' : 'IDLE',
      migratedFromV1: true,
    }),
  });
  const migrated = await readVersionedState('attendance');
  assert.strictEqual(migrated._v, 2);
  assert.strictEqual(migrated.data.status, 'ACTIVE');
  assert.strictEqual(migrated.data.migratedFromV1, true);

  // ── Test 7: Atomic State Update & Conflict Resolution ──────────────────────
  console.log('   ✓ Test 7: Verifying Atomic State Update & Conflict Resolution...');
  await updateStateAtomic('counter_atomic', () => ({ count: 10 }), { source: 'widget' });
  const resolved = await updateStateAtomic(
    'counter_atomic',
    (prev) => ({ count: (prev?.count || 0) + 5 }),
    { source: 'server', conflictStrategy: 'server_wins' }
  );
  assert.strictEqual(resolved.data.count, 15);
  assert.strictEqual(resolved._rev, 2);

  // ── Test 8: Multi-Instance Isolation ───────────────────────────────────────
  console.log('   ✓ Test 8: Verifying Multi-Instance State Isolation...');
  await updateStateAtomic('branch_kpi', () => ({ revenue: 100 }), { instanceId: 'hcm' });
  await updateStateAtomic('branch_kpi', () => ({ revenue: 250 }), { instanceId: 'hn' });
  const hcmState = await readVersionedState('branch_kpi', { instanceId: 'hcm' });
  const hnState = await readVersionedState('branch_kpi', { instanceId: 'hn' });
  assert.strictEqual(hcmState.data.revenue, 100);
  assert.strictEqual(hnState.data.revenue, 250);

  // ── Test 9: Data Diff / Incremental Update (Group C) ───────────────────────
  console.log('   ✓ Test 9: Verifying Data Diff skips reload when payload unchanged...');
  const diffSame = computeDataDiff({ a: 1, b: 'ok' }, { a: 1, b: 'ok' });
  assert.strictEqual(diffSame.hasChanges, false);
  assert.strictEqual(diffSame.changedKeys.length, 0);

  const diffChanged = computeDataDiff({ a: 1, b: 'ok' }, { a: 2, b: 'ok', c: true });
  assert.strictEqual(diffChanged.hasChanges, true);
  assert.deepStrictEqual(diffChanged.changedKeys.sort(), ['a', 'c']);
  assert.strictEqual(diffChanged.patch.a, 2);

  // ── Test 10: Stale-While-Revalidate (SWR) Cache Evaluator (Group C) ────────
  console.log('   ✓ Test 10: Verifying Stale-While-Revalidate (fresh / stale / miss)...');
  const now = 1_000_000;
  assert.strictEqual(evaluateCacheStatus(now, now - 30_000, 60, 300), 'fresh');
  assert.strictEqual(evaluateCacheStatus(now, now - 120_000, 60, 300), 'stale');
  assert.strictEqual(evaluateCacheStatus(now, now - 500_000, 60, 300), 'miss');

  console.log('\n🎉 [State & Data Engine Test] All 10 test suites passed with 100% assertions satisfied!\n');
})().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
