# 🌐 Background Remote Sync Guide

Update widgets with fresh JSON data from your backend API even when your app is completely closed or force-killed by the user.

---

## 🌟 How It Works

1. You register a remote URL and polling interval via `Widget.setRemoteConfig()`.
2. The native system schedules low-power periodic background fetch:
   - **iOS:** Managed through `BGAppRefreshTask` / TimelineProvider reload intervals.
   - **Android:** Managed through Android `WorkManager` PeriodicWorkRequest.
3. When the scheduled window triggers, native OS code performs an HTTP GET request to your endpoint, parses the returned JSON payload, and updates the widget UI directly.

---

## 💻 Configuration (Stale-While-Revalidate, REST & Secure Credentials)

```tsx
import { Widget } from 'react-native-live-widgets';

// 1. Store auth token securely (interpolated natively via {{$secure.access_token}})
await Widget.setSecureToken('access_token', 'YOUR_SECURE_JWT');

// 2. Configure Background Data Engine with SWR & Offline-First Cache
await Widget.setRemoteConfig('crypto_prices', {
  url: 'https://api.yourdomain.com/widgets/crypto?symbol=BTC',
  method: 'GET', // Supports GET, POST, PUT, PATCH, DELETE
  headers: {
    'Authorization': 'Bearer {{$secure.access_token}}',
    'Accept': 'application/json',
  },
  cacheTtlSeconds: 60,
  staleTtlSeconds: 600,
  cacheStrategy: 'stale_while_revalidate', // Instant render (<5ms) + background refresh
  offlineFallback: 'stale_cache',
  enableETag: true,
  enableDataDiff: true, // Skips reload if payload unchanged
  parallelStrategy: 'all_settled',
  partialFailurePolicy: 'keep_cached',
  refreshIntervalMinutes: 15,
});

// 3. Proactively invalidate cache or inspect sync observability telemetry
await Widget.invalidateCache('crypto_prices');
const telemetry = await Widget.getSyncStatus('crypto_prices');
console.log(telemetry.cacheStatus, telemetry.state);
```

### Backend JSON Contract
Your server endpoint should return a lightweight JSON matching your widget's data schema:

```json
{
  "symbol": "BTC/USD",
  "price": "$92,450.00",
  "change24h": "+4.12%",
  "updatedAt": 1795105000000
}
```
