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

## 💻 Configuration

```tsx
import { Widget } from 'react-native-live-widgets';

// Configure remote synchronization
await Widget.setRemoteConfig({
  widgetId: 'crypto_prices',
  url: 'https://api.yourdomain.com/widgets/crypto?symbol=BTC',
  headers: {
    'Authorization': 'Bearer YOUR_SECURE_TOKEN',
    'Accept': 'application/json'
  },
  refreshIntervalMinutes: 15 // Minimum recommended interval
});
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
