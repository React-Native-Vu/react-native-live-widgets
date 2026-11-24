# 🔄 State Management, Persistent Action Queue & Lifecycle Engine

Enterprise-grade offline-first state and action synchronization for HRM, timekeeping, and approval workflows in **`react-native-live-widgets`**.

---

## 🌟 Core Capabilities (Group B – P0)

| Feature | Purpose |
| :--- | :--- |
| **Persistent Action Queue** | Persists widget actions when offline (`queued` ➔ `syncing` ➔ `acked` / `dead_letter`) |
| **Idempotency Key** | Guarantees backend never double-processes a retried action |
| **Action Deduplication** | Prevents accidental double-taps within `dedupeWindowMs` |
| **Retry Policy** | Supports `exponential`, `linear`, and `fixed` backoff with jitter |
| **Pending Action Recovery** | Automatically recovers stuck `syncing` actions after app crash/kill |
| **State Versioning & Migration** | Auto-upgrades stored widget state (`v1` ➔ `v2`) on app upgrade |
| **Atomic State Update** | Sequential lock + `_rev` revisioning with Conflict Resolution (`last_write_wins`, `server_wins`, `client_wins`, custom merge) |
| **Multi-Instance Isolation** | Isolates state & action queues by `(widgetKey, instanceId)` |

---

## 💻 Real-World Example: Offline Check-in on Home Screen

```tsx
import { Widget, usePendingActions } from 'react-native-live-widgets';

// 1. Enqueue offline action with Idempotency Key & Deduplication
await Widget.enqueueAction('CHECK_IN', {
  widgetKey: 'shift',
  instanceId: 'branch_hcm',
  payload: { shiftId: 'MORNING_01', timestamp: Date.now() },
  idempotencyKey: 'checkin_emp42_2026_11_24',
  dedupeWindowMs: 5000,
});

// 2. Inspect & Sync when online or when app resumes
const queue = await Widget.getPendingActions({ widgetKey: 'shift', instanceId: 'branch_hcm' });

const report = await Widget.syncPendingActions({
  widgetKey: 'shift',
  instanceId: 'branch_hcm',
  retry: { maxRetries: 3, strategy: 'exponential', baseDelayMs: 1000 },
  handler: async (action) => {
    const res = await fetch('https://api.example.com/v3/timekeeping/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': action.idempotencyKey,
      },
      body: JSON.stringify(action.payload),
    });
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  },
});

// 3. Clear dead-letter or all actions
await Widget.clearPendingActions({ widgetKey: 'shift', instanceId: 'branch_hcm', status: 'dead_letter' });
```

---

## 📦 State Versioning, Migration & Atomic Updates

```tsx
// Register schema migration once at app startup
Widget.registerStateSchema('attendance', {
  version: 2,
  migrate: (oldData, fromVersion) => ({
    status: oldData.checkedIn ? 'ACTIVE' : 'IDLE',
    migratedFrom: fromVersion,
  }),
});

// Atomic update isolated by instanceId with conflict resolution
await Widget.updateStateAtomic(
  'attendance',
  (prev) => ({ ...(prev || {}), status: 'PENDING_SYNC' }),
  {
    instanceId: 'branch_hcm',
    source: 'widget',
    conflictStrategy: 'last_write_wins',
  }
);
```
