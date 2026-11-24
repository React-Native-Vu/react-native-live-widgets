# 🎵 Native MediaSession, Navigation Live UI, Smart Home & Ecosystem Primitives

High-value native platform integrations and curated UI primitives in **`react-native-live-widgets`**.

---

## 1. 🎵 Standalone Native MediaSession & Now Playing

Decoupled from internal audio playback so apps using `react-native-track-player`, `expo-av`, or `react-native-video` can drive native **iOS `MPNowPlayingInfoCenter` / `MPRemoteCommandCenter`** and **Android `MediaSession`** directly:

```tsx
import { MediaSession } from 'react-native-live-widgets';

await MediaSession.setMetadata({
  title: 'Midnight Focus',
  artist: 'Lofi Beats',
  album: 'Deep Work',
  durationSeconds: 215,
});

await MediaSession.setPlaybackState({
  state: 'playing',
  positionSeconds: 42,
  rate: 1.0,
});

const unsub = MediaSession.onRemoteCommand((cmd) => {
  // Handles Lock Screen, Dynamic Island, Android Media Player & Bluetooth buttons
  console.log(cmd.type, cmd.positionSeconds);
});
```

---

## 2. 🗺️ Navigation Live UI (Turn-by-Turn)

```tsx
import { NavigationLive } from 'react-native-live-widgets';

await NavigationLive.start('trip_01', {
  destination: 'Tan Son Nhat Airport',
  maneuver: 'turn_right',
  instruction: 'Turn right onto Truong Son St',
  distanceMeters: 350,
  etaTimestamp: Date.now() + 14 * 60 * 1000,
  routeProgress: 0.68,
});
```

---

## 3. 🏠 Smart Home Controls (iOS 18 Control Center & Android Quick Settings)

```tsx
import { ControlWidget, SmartHomeControl } from 'react-native-live-widgets';

const acConfig = SmartHomeControl.createToggle({
  deviceId: 'living_room_ac',
  name: 'Living Room AC',
  deviceType: 'ac',
  isOn: true,
  detailText: '24°C',
});
await ControlWidget.set(acConfig);
```

---

## 4. 🧩 Curated High-ROI Primitives & Utilities

- **`createListNode` (`Repeater`)**: Dynamic data-driven list with RAM-safe `maxItems` cap & `emptyFallback`.
- **`createTimelineNode`**: Vertical work shift / schedule / delivery timeline.
- **`createDonutChartNode`**: Multi-segment ring chart with center label.
- **`createSparklineNode`**: Compact KPI trend line with accessible trend summary.
- **`whenNode` & `responsiveLayout`**: Clean conditional & multi-family widget layouts.
- **`Widget.prefetchImages(urls)` & `Widget.clearImageCache()`**: Public Image Cache API.
- **`LocaleFormatter`**: `formatCurrency`, `formatNumber`, `formatDate`, `formatRelativeTime`.
