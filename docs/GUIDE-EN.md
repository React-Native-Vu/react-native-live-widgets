# REACT-NATIVE-LIVE-WIDGETS — COMPLETE SETUP & DEVELOPER GUIDE 🚀

> 🌐 **Language:** [Tiếng Việt (GUIDE-VI.md)](./GUIDE-VI.md) | **English**

Comprehensive guide covering installation, native setup (iOS & Android), and building 100% JavaScript/TypeScript declarative layouts for **Live Activities (Dynamic Island / Lock Screen / Android Live Updates)** and **Interactive Multi-Page Home Screen Widgets**.

---

## TABLE OF CONTENTS
1. [Overview & Architecture](#1-overview--architecture)
2. [Installation & Project Setup](#2-installation--project-setup)
   - [Package Installation](#package-installation)
   - [iOS Setup (Xcode & Widget Extension)](#ios-setup-xcode--widget-extension)
   - [Android Setup (Manifest & Permissions)](#android-setup-manifest--permissions)
3. [Core API Reference](#3-core-api-reference)
   - [LiveActivity API (Lock Screen, Dynamic Island & 3 Push Token Types)](#1-liveactivity-api)
   - [Widget API (Home Screen Widgets, Multi-Page & Background Sync)](#2-widget-api-home-screen-widgets)
   - [SharedStorage API (App Groups & SharedPreferences)](#3-sharedstorage-api)
4. [Declarative UI Engine (`UI.*`)](#4-declarative-ui-engine-ui)
   - [UI.VStack & UI.HStack](#uivstack--uihstack)
   - [UI.Text](#uitext)
   - [UI.Timer (Zero-Battery Hardware Timer)](#uitimer-zero-battery-hardware-timer)
   - [UI.Progress (Bar, Segmented & Circular Progress)](#uiprogress-bar-segmented--circular-progress)
   - [UI.Image (Remote URL, Base64, File, Asset & SF Symbols)](#uiimage-remote-url-base64-file-asset--sf-symbols)
   - [UI.Button (Interactive Page Switching, Task Toggle, API Refresh & Deep Links)](#uibutton-interactive-widget-buttons)
5. [Dynamic Island Configuration (iPhone 14 Pro, 15, 16, 17)](#5-dynamic-island-configuration-iphone-14-pro-15-16-17)
6. [Building Multi-Page & Interactive Home Screen Widgets in JavaScript](#6-building-multi-page--interactive-home-screen-widgets-in-javascript)
7. [Background API Auto-Sync When App Is Killed (`Widget.setRemoteConfig`)](#7-background-api-auto-sync-when-app-is-killed-widgetsetremoteconfig)
8. [Managing All 3 Push Token Types (APNs & FCM)](#8-managing-all-3-push-token-types-apns--fcm)
9. [State Machine & Timed Phases (`phases`)](#9-state-machine--timed-phases-phases)
10. [Server Push Payload Structure (APNs & FCM)](#10-server-push-payload-structure-apns--fcm)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview & Architecture

**`react-native-live-widgets`** is an all-in-one library that lets you author **100% of your Home Screen Widget and Live Activity UI directly in React Native (`App.tsx`)**, rendering natively on both iOS and Android without writing custom SwiftUI or RemoteViews XML for each screen:

- **Live Activity (iOS 16.1+ ActivityKit & Dynamic Island):** Real-time ongoing activities (attendance shifts, ride-hailing, food delivery, Pomodoro timers).
- **Live Update (Android API 24 -> Android 16 API 36 `Notification.ProgressStyle`):** Promoted ongoing notifications on Android featuring custom avatars (`LargeIcon`), multi-step segmented progress bars, chronometer countdowns, and interactive action buttons.
- **Home Screen Widgets (iOS WidgetKit & Android AppWidget High-DPI Canvas Renderer):** Home screen widgets (`small`, `medium`, `large`) supporting in-place tab/page switching (`pages`), interactive checklists (`toggle`), remote URL/Base64 images, and background API synchronization even when the app is force-killed.
- **Shared Storage:** Instant bridge between React Native and Native Widgets backed by iOS App Groups and Android `SharedPreferences`.

---

## 2. Installation & Project Setup

### Package Installation
From the root directory of your React Native project:
```bash
npm install react-native-live-widgets
# or
yarn add react-native-live-widgets

# Automatically configure Info.plist, Entitlements, AndroidManifest & Widget templates
npx react-native-live-widgets init --group group.com.yourcompany.app
```

---

### iOS Setup (Xcode & Widget Extension)

#### Step 1: Enable Live Activities & App Groups
Running `npx react-native-live-widgets init` automatically configures `Info.plist` and `.entitlements`:
```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```
And in both `<YourApp>.entitlements` and `LiveWidgetsExtension.entitlements`:
```xml
<key>aps-environment</key>
<string>development</string>
<key>com.apple.security.application-groups</key>
<array>
  <string>group.<your_bundle_id></string>
</array>
```

#### Step 2: Create the Widget Extension Target in Xcode (if not created yet)
1. Open your `.xcworkspace` in Xcode.
2. Go to **File -> New -> Target... -> Widget Extension**.
3. Set **Product Name:** `LiveWidgets` (or `LiveWidgetsExtension`), and uncheck *Include Configuration App Intent*.
4. Replace `LiveWidgetsBundle.swift` with:
```swift
import WidgetKit
import SwiftUI
import react_native_live_widgets

@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }
    DynamicHomeScreenWidget()
  }
}
```

#### Step 3: Configure `Podfile` & Install Pods
In `ios/Podfile`, link `react-native-live-widgets` to your Widget Extension target:
```ruby
target 'LiveWidgetsExtension' do
  use_modular_headers!
  pod 'react-native-live-widgets', :path => '../node_modules/react-native-live-widgets'
end
```
Then run:
```bash
cd ios && pod install
```

---

### Android Setup (Manifest & Permissions)

The library **automatically registers** `DynamicHomeScreenWidgetProvider` (Home Screen Widget) and `LiveActivityReceiver` (Background Sync & Interactive Action Handler) in its own `AndroidManifest.xml`, which merges seamlessly into your Android app.

On Android 13+ (API 33+), request the `android.permission.POST_NOTIFICATIONS` runtime permission before starting a Live Update notification.

---

## 3. Core API Reference

```typescript
import { LiveActivity, Widget, SharedStorage, UI } from 'react-native-live-widgets';
```

### 1. `LiveActivity` API
- `LiveActivity.start(options)`: Starts a Live Activity (iOS) or Live Update Notification (Android). Returns `{ activityId, activityPushToken }`.
- `LiveActivity.update(options)`: Updates the UI layout and alert state of a running `activityId`.
- `LiveActivity.end(activityId)`: Ends a specific activity session.
- `LiveActivity.endAll()`: Ends all active sessions.
- `LiveActivity.registerForPushNotifications()`: Requests notification permissions and registers for an APNs Device Token.
- `LiveActivity.getAllPushTokens(activityId?)`: Returns all 3 push tokens (`devicePushToken`, `pushToStartToken`, `activityUpdateToken`).
- `LiveActivity.getDevicePushToken()`: Gets the APNs Device Token (iOS) or stored FCM Token (Android).
- `LiveActivity.getPushToStartToken()`: Gets the APNs Push-to-Start Token (iOS 17.2+).
- `LiveActivity.getActivityPushToken(activityId?)`: Gets the APNs Activity Update Token for a running activity.
- `LiveActivity.setDevicePushToken(token)`: Stores the Android FCM token into the unified token manager.
- `LiveActivity.onDevicePushTokenChange(cb)` / `onPushToStartTokenChange(cb)` / `onActivityUpdateTokenChange(cb)`: Real-time listeners for token generation and rotation.

### 2. `Widget` API (Home Screen Widgets)
- `Widget.setLayout(widgetKey, layoutConfig, appGroup?)`: Updates the dynamic widget layout (`small`, `medium`, `large`, `pages`, `initialPage`) and prefetches/downscales any remote URL images in the layout tree.
- `Widget.setRemoteConfig(config, widgetKey?, appGroup?)`: Configures a remote HTTP endpoint so the Widget automatically fetches fresh JSON data in the background even when the app is killed.
- `Widget.reloadAll()`: Forces iOS/Android to redraw all Home Screen Widgets immediately.
- `Widget.reload(kind)`: Reloads a specific widget by kind.
- `Widget.getInteractiveState(widgetKey?, appGroup?)`: Reads the current interactive state (`activePage`, `toggledItems`, `lastSyncTime`, `remoteVariables`).
- `Widget.onWidgetAction(cb)`: Subscribes to button tap actions triggered from the Widget or Notification.

### 3. `SharedStorage` API
- `SharedStorage.set(key, value, appGroup?)`: Saves a string or JSON object to App Group `UserDefaults` (iOS) or `SharedPreferences` (Android).
- `SharedStorage.get<T>(key, appGroup?)`: Reads shared data.
- `SharedStorage.remove(key, appGroup?)`: Removes a key.
- `SharedStorage.clear(appGroup?)`: Clears all shared widget data (useful on user logout).

---

## 4. Declarative UI Engine (`UI.*`)

### `UI.VStack` & `UI.HStack`
Vertical (`VStack`) and horizontal (`HStack`) flex-like containers:
```typescript
UI.VStack(
  {
    padding: 14,
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    spacing: 8,
    alignItems: 'leading', // 'leading' | 'center' | 'trailing'
  },
  // child nodes...
)
```

### `UI.Text`
Renders styled text with automatic `{{variable}}` interpolation from background API responses and automatic strikethrough when linked to an interactive checklist item:
```typescript
UI.Text('Checked in at {{checkinTime}}', {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 'bold',
  maxLines: 1,
  strikethroughWhenToggled: 'task_1', // Automatically strikes through and dims when 'task_1' is toggled!
})
```

### `UI.Timer` (Zero-Battery Hardware Timer)
Real-time `countdown` or `countup` timer rendered directly by the OS on Lock Screen, Dynamic Island, and Home Screen Widgets:
```typescript
UI.Timer(targetTimestampInSeconds, {
  mode: 'countdown',
  color: '#FFA500',
  fontSize: 16,
  fontWeight: 'bold',
  showsHours: false, // Compact MM:SS format ideal for Dynamic Island Compact
})
```

### `UI.Progress` (Bar, Segmented & Circular Progress)
Supports 3 visual styles: `'bar'` (continuous bar), `'segmented'` (multi-step delivery/shift stages), and `'circular'` (ring progress gauge):
```typescript
// 1. 4-Step Segmented Progress Bar
UI.Progress({
  style: 'segmented',
  segments: 4,
  currentSegment: 3, // Or pass value: 0.75
  tintColor: '#10B981',
  trackColor: '#374151',
  segmentSpacing: 6,
  height: 8,
})

// 2. Circular Progress Ring
UI.Progress({
  style: 'circular',
  value: 0.68,
  tintColor: '#10B981',
  trackColor: '#064E3B',
  height: 64,
  showPercentage: true,
})
```

### `UI.Image` (Remote URL, Base64, File, Asset & SF Symbols)
Supports **5 image sources** across both iOS and Android. When you pass a remote `url` (`https://...`), the library automatically downloads, downscales (`maxDimension = 360px` to stay safely below WidgetKit's 30MB memory ceiling), caches it on disk/memory, and refreshes the widget:
```typescript
// 1. Remote URL Image (Circular Avatar with Border)
UI.Image({
  url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  width: 44,
  height: 44,
  cornerRadius: 999,       // 999 = Full circle mask
  contentMode: 'fill',     // 'fill' | 'fit'
  borderColor: '#60A5FA',  // Border color
  borderWidth: 2,          // Border width
})

// 2. Base64 Encoded Image (QR Code, Barcode, Badge...)
UI.Image({
  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
  width: 36,
  height: 36,
  cornerRadius: 8,
})

// 3. System Icon (SF Symbols on iOS / Vector Mapping on Android)
UI.Image({
  systemName: 'bicycle',
  tintColor: '#FB923C',
  width: 18,
  height: 18,
})
```

### `UI.Button` (Interactive Widget Buttons)
Lets users interact directly on the Widget surface (via iOS 17+ `AppIntents` and Android `PendingIntent` hit zones) **without opening the app**:
```typescript
// 1. Switch to another page/tab inside the Widget
UI.Button({
  title: 'Tasks →',
  actionId: 'page:tasks', // Or 'page:next' / 'page:prev'
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  fontSize: 11,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 8,
})

// 2. Toggle a task item directly on the Widget
UI.Button({
  title: 'Review attendance module PR',
  actionId: 'toggle:task_1', // Automatically toggles [ ] <-> [✓]
  backgroundColor: '#F8FAFC',
  activeBackgroundColor: '#DCFCE7',
  color: '#1E293B',
  activeColor: '#15803D',
})

// 3. Trigger an immediate background API refresh
UI.Button({
  title: '↻ Sync',
  actionId: 'refresh',
  backgroundColor: '#1E293B',
  color: '#60A5FA',
})
```

---

## 5. Dynamic Island Configuration (iPhone 14 Pro, 15, 16, 17)

```typescript
dynamicIsland: {
  compactLeading: UI.HStack(
    { spacing: 4 },
    UI.Image({
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
      width: 18,
      height: 18,
      cornerRadius: 999,
    }),
    UI.Text('08:02', { color: '#60A5FA', fontSize: 12, fontWeight: 'bold' })
  ),
  compactTrailing: UI.Timer(shiftEndTimestamp, {
    mode: 'countdown',
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: 'bold',
    showsHours: false,
  }),
  minimal: UI.Image({ systemName: 'clock.fill', tintColor: '#60A5FA', width: 14, height: 14 }),
  expanded: {
    leading: UI.Text('ON SHIFT', { color: '#60A5FA', fontSize: 12, fontWeight: 'bold' }),
    trailing: UI.Timer(shiftEndTimestamp, { mode: 'countdown', color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }),
    bottom: UI.VStack(
      { spacing: 6 },
      UI.Progress({ style: 'segmented', segments: 4, value: 0.75, tintColor: '#3B82F6', height: 6 }),
      UI.Text('Checked in: District 1 Office', { color: '#94A3B8', fontSize: 11 })
    ),
  },
}
```

---

## 6. Building Multi-Page & Interactive Home Screen Widgets in JavaScript

Pass a `pages` map to `Widget.setLayout` to create multiple interactive screens/tabs inside a single Widget:

```typescript
await Widget.setLayout('main', {
  initialPage: 'overview',
  // Fallback default layout
  medium: overviewMediumNode,
  // Named pages switched via actionId: 'page:<page_name>'
  pages: {
    overview: {
      small: overviewSmallNode,
      medium: overviewMediumNode,
      large: overviewLargeNode,
    },
    tasks: {
      small: tasksSmallNode,
      medium: tasksMediumNode,
      large: tasksLargeNode,
    },
    stats: {
      small: statsSmallNode,
      medium: statsMediumNode,
      large: statsLargeNode,
    },
  },
});
```

---

## 7. Background API Auto-Sync When App Is Killed (`Widget.setRemoteConfig`)

When the user swipes away (force-kills) the main app, the React Native JS thread stops. To keep your Widget updated with live server data autonomously:

```typescript
await Widget.setRemoteConfig({
  url: 'https://api.yourcompany.com/v1/widget-summary',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  intervalMinutes: 15, // OS-scheduled background sync every 15 minutes
});
```

- **How it works:**
  - **iOS**: `DynamicWidgetProvider` performs an asynchronous HTTP request during its WidgetKit timeline reload (or immediately when the user taps a button with `actionId: 'refresh'`), flattens the JSON response, and injects values into `{{fieldName}}` placeholders across your UI tree.
  - **Android**: `AlarmManager` schedules `LiveActivityReceiver` (`ACTION_WIDGET_SYNC`), fetches fresh JSON in the background (`goAsync()`), updates `SharedPreferences`, and redraws `DynamicHomeScreenWidgetProvider`.
  - The built-in `{{_lastSyncTime}}` placeholder automatically resolves to the latest sync timestamp (`HH:mm:ss`).

---

## 8. Managing All 3 Push Token Types (APNs & FCM)

To control Live Activities and notifications from your backend server, the library exposes 3 token types:
1. **`devicePushToken`**: Standard APNs Device Token (iOS) / FCM Token (Android).
2. **`pushToStartToken` (iOS 17.2+)**: Allows your backend to remotely start a brand-new Live Activity even when the app is closed.
3. **`activityUpdateToken`**: Unique token per active Live Activity used by your server to push real-time content updates or end that specific activity.

```typescript
// 1. Request permission & register with APNs
await LiveActivity.registerForPushNotifications();

// 2. Fetch all 3 tokens at once
const tokens = await LiveActivity.getAllPushTokens();
console.log(tokens.devicePushToken, tokens.pushToStartToken, tokens.activityUpdateToken);

// 3. Subscribe to real-time token rotation events
const sub1 = LiveActivity.onDevicePushTokenChange(({ token }) => {
  api.syncDeviceToken(token);
});
const sub2 = LiveActivity.onPushToStartTokenChange((token) => {
  api.syncPushToStartToken(token);
});
const sub3 = LiveActivity.onActivityUpdateTokenChange(({ activityId, token }) => {
  api.syncActivityUpdateToken(activityId, token);
});
```

---

## 9. State Machine & Timed Phases (`phases`)

Declare scheduled transitions ahead of time so the native layer updates alerts and UI at exact timestamps without requiring a server push:

```typescript
phases: [
  {
    id: 'warning_phase',
    triggerTimestamp: targetTimestamp - 300, // 5 minutes before deadline
    alertTitle: 'Shift starting soon!',
    alertBody: 'Only 5 minutes left to check in.',
  },
  {
    id: 'late_phase',
    triggerTimestamp: targetTimestamp, // Deadline reached
    alertTitle: 'Late for shift!',
    alertBody: 'Your shift start time has passed.',
  },
]
```

---

## 10. Server Push Payload Structure (APNs & FCM)

### APNs HTTP/2 Headers (iOS Live Activity):
- `apns-push-type`: `liveactivity`
- `apns-topic`: `<your_bundle_id>.push-type.liveactivity`
- `apns-priority`: `10`

### APNs JSON Body:
```json
{
  "aps": {
    "timestamp": 1711890000,
    "event": "update",
    "content-state": {
      "layoutJson": "{\"lockScreen\":{...},\"dynamicIsland\":{...}}"
    },
    "alert": {
      "title": "Order Delivered!",
      "body": "Enjoy your meal."
    }
  }
}
```

---

## 11. Troubleshooting

1. **Home Screen Widget displays the default placeholder text:**
   - Verify that both the main app target and the Widget Extension target share the same App Group identifier (`group.<bundle_id>`).
   - Ensure `await Widget.setLayout('main', ...)` has been called from React Native.
2. **Dynamic Island Compact pill stretches too wide when using `UI.Timer`:**
   - Pass `showsHours: false` to `UI.Timer` in `compactTrailing`. The native renderer automatically constrains the timer frame width so the Dynamic Island stays compact.
3. **Remote images (`https://...`) do not appear immediately:**
   - Ensure the URL uses `https://`. The library prefetches, downscales to `360px`, caches the image in the App Group / cache directory, and automatically triggers a widget reload once the download finishes.

---

## 📄 License
MIT © vu-tran
