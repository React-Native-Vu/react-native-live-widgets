# 🚀 Release Notes — `react-native-live-widgets` v1.2.4

**Ngày phát hành / Release Date:** 2026-11-24  
**Trạng thái tương thích / Compatibility:** 100% Backward-Compatible với `v1.2.x` (React Native 0.72 – 0.80+, Expo SDK 50 – 52, iOS 16.1+, Android 12+).

---

## 🌟 Tổng quan bản phát hành v1.2.4 (Enterprise & Ecosystem Milestone)

Phiên bản **v1.2.4** là bước nâng cấp toàn diện đưa `react-native-live-widgets` lên chuẩn **Enterprise Tier-1** với 5 trụ cột lớn (Nhóm A → E) và **41/41 bộ kiểm thử tự động**:

---

### ♿ 1. True Native Accessibility Tree (Nhóm A — TalkBack & VoiceOver)
* **Android Native Semantic Overlay (`rn_semantic_layer`):** Thay vì gom cả widget thành 1 chuỗi văn bản trên Canvas, mỗi phần tử (`Text`, `Header`, `Progress`, `Gauge`, `Badge`, `Timer`, `Group`) có 1 node trợ năng trong suốt độc lập khớp tọa độ pixel giúp TalkBack focus từng phần tử riêng biệt.
* **iOS SwiftUI Accessibility:** Hỗ trợ đầy đủ `.accessibilitySortPriority()`, `.accessibilityElement(children: .combine | .contain)`, `.isHeader`, `.isSelected`, `.updatesFrequently` và đảo chiều RTL.
* **Props mới:** `accessibilityFocusOrder`, `accessibilityGroup`, `accessibilityState` (`checked`, `disabled`, `expanded`, `selected`, `busy`), `accessibilityAdjustable`, `accessibilityLiveRegion`, `layoutDirection: 'rtl'`.
* **Inspector:** `Widget.inspectAccessibilityTree(layout, { rtl })`.
* 📖 Chi tiết: [Native Accessibility & TalkBack Guide](capabilities/accessibility-and-talkback.md)

---

### 🔄 2. Persistent Action Queue & Atomic State Lifecycle (Nhóm B — Offline-First HRM/Approval)
* **Persistent Action Queue:** `Widget.enqueueAction()`, `Widget.getPendingActions()`, `Widget.syncPendingActions({ handler, retry })`, `Widget.recoverPendingActions()`, `Widget.clearPendingActions()`, và React Hook `usePendingActions()`.
* **Idempotency & Deduplication:** Tự động sinh `Idempotency-Key` và chặn double-tap trùng lặp trong cửa sổ `dedupeWindowMs`.
* **Retry Policy & Dead-Letter:** Hỗ trợ `exponential` / `linear` / `fixed` backoff + jitter; tự chuyển action lỗi vĩnh viễn sang `dead_letter`.
* **State Versioning, Migration & Atomic Update:** `Widget.registerStateSchema()`, `Widget.getVersionedState()`, `Widget.updateStateAtomic()` kèm Conflict Resolution (`last_write_wins`, `server_wins`, `client_wins`, custom merge) và Multi-Instance Isolation (`instanceId`).
* 📖 Chi tiết: [State Management & Persistent Action Queue Guide](capabilities/state-and-action-queue.md)

---

### 🌐 3. Background Data Engine 2.1 — SWR, Full REST & Secure Credentials (Nhóm C)
* **Full REST:** Mở rộng hỗ trợ **`PATCH` & `DELETE`** kèm JSON body trên cả Android và iOS.
* **Stale-While-Revalidate (SWR):** `cacheStrategy: 'stale_while_revalidate'`, `staleTtlSeconds`, `offlineFallback: 'stale_cache'` — hiển thị cache cũ tức thì (<5ms) trong khi âm thầm revalidate ngầm.
* **Cache Invalidation, Data Diff & Telemetry:** `Widget.invalidateCache()`, `Widget.computeDataDiff()`, `Widget.evaluateCacheStatus()`, `Widget.getSyncStatus()`.
* **Secure Credentials:** `Widget.setSecureToken()` / `Widget.removeSecureToken()` — Native tự nội suy `Bearer {{$secure.<key>}}` trong HTTP headers.
* 📖 Chi tiết: [Background Remote Sync Guide](capabilities/background-remote-sync.md)

---

### 🔬 4. Visual Widget Inspector, Snapshot Testing, Profiler & Diagnostics (Nhóm D)
* **Visual Widget Inspector:** `Widget.exportInspectorHTML(layout)` xuất giao diện DevTools HTML 3 cột tự chứa (UI Tree, Preview SVG Dark/Light/Tinted, Semantic Focus Tree & Diagnostics).
* **Widget Snapshot Testing:** `Widget.createSnapshot()` & `Widget.compareSnapshots()` kiểm thử regression đa kích thước & Light/Dark/Tinted/RTL ngay trong CI (<50ms).
* **Native Renderer Profiler:** `Widget.profileIR()`, `Widget.getProfilerReport()`, `Widget.formatProfilerReport()` đo thời gian compile IR, Bitmap RAM (MB), RemoteViews action count trên Android và cảnh báo ngưỡng **40 reload/ngày của iOS WidgetKit**.
* **Diagnostics Engine:** `Widget.diagnose()` phát hiện lỗi schema, gõ nhầm prop (`backgroudColor`), Canvas fallback, thiếu nhãn A11y và lỗi Dead-Letter Queue.
* 📖 Chi tiết: [DevTools & Debugging Guide](capabilities/devtools-and-debugging.md)

---

### 🎵 5. Native MediaSession, Navigation Live UI, Smart Home & Primitives (Nhóm E)
* **Standalone Native `MediaSession`:** `setMetadata`, `setPlaybackState`, `clear`, `onRemoteCommand` kết nối thẳng iOS `MPNowPlayingInfoCenter`/`MPRemoteCommandCenter` và Android `android.media.session.MediaSession` (độc lập với AudioPlayer nội bộ).
* **`NavigationLive` (Turn-by-Turn):** `start`, `updateManeuver`, `end`, `buildLayout` cho Dynamic Island & Lock Screen.
* **`SmartHomeControl`:** `createToggle` (Đèn, Điều hòa, Khóa cửa) & `createSceneButton` cho iOS 18 Control Center & Android Quick Settings.
* **Curated Primitives & Utilities:** `createListNode` (có `maxItems` cap), `createTimelineNode`, `createDonutChartNode`, `createSparklineNode`, `whenNode`, `responsiveLayout`, `LocaleFormatter`, `Widget.prefetchImages()`, `Widget.clearImageCache()`.
* 📖 Chi tiết: [Ecosystem & Media Guide](capabilities/ecosystem-and-media.md)

---

### 🧪 6. Android Debug FCM Push Simulator (`adb`) & Stability Fixes
* Bổ sung `DebugFcmPushReceiver` (chỉ chạy ở bản Debug `FLAG_DEBUGGABLE`, tự khóa trên Release) giúp test giả lập FCM Push-to-Start / Push-to-Update / Widget Sync ngay qua `adb` mà không cần cấu hình Firebase:
  ```bash
  adb shell pm grant <your.package.id> android.permission.POST_NOTIFICATIONS
  adb shell 'am broadcast -a com.reactnativeliveactivity.ACTION_SIMULATE_FCM_PUSH -n <your.package.id>/com.reactnativeliveactivity.DebugFcmPushReceiver --es type live_activity --es activityId fcm_demo --es title "Order #FD-8821" --es subtitle "Driver arriving (85%)" --ef progress 0.85'
  ```
* Khắc phục triệt để lỗi `"Can't load widget"` trên Android Launcher do các lệnh reflection không thuộc `@RemotableViewMethod`.

---

## 📦 Hướng dẫn nâng cấp lên v1.2.4

```bash
npm install react-native-live-widgets@1.2.4
# iOS:
cd ios && pod install && cd ..
# Android:
npx react-native run-android
```
