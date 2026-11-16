# REACT-NATIVE-LIVE-WIDGETS — COMPLETE SETUP & DEVELOPER GUIDE 🚀

> 🌐 **Language:** [Tiếng Việt (GUIDE-VI.md)](./GUIDE-VI.md) | **English** • [⚡ Dedicated Expo Guide (EXPO-GUIDE-EN.md)](./EXPO-GUIDE-EN.md)

Comprehensive guide covering installation, native setup (iOS & Android), and building 100% JavaScript/TypeScript declarative layouts for **Live Activities (Dynamic Island / Lock Screen / Android Live Updates)** and **Interactive Multi-Page Home Screen Widgets**.

> [!TIP]
> **Using Expo (SDK 50, 51, 52, 58+)?** Check out the [Dedicated Expo Integration Guide (EXPO-GUIDE-EN.md)](./EXPO-GUIDE-EN.md) for full details on Expo Config Plugins and EAS Build!

---

## TABLE OF CONTENTS
1. [Overview & Architecture](#1-overview--architecture)
2. [Official Live Demo Repositories (Expo & Bare RN)](#2-official-live-demo-repositories-expo--bare-rn)
3. [Installation & Project Setup](#3-installation--project-setup)
   - [For Expo Projects](#for-expo-projects)
   - [Package Installation (Bare React Native)](#package-installation)
   - [iOS Setup (Xcode & Widget Extension)](#ios-setup-xcode--widget-extension)
   - [Android Setup (Gradle, Manifest, MainApplication & Permissions)](#android-setup-gradle-manifest-mainapplication--permissions)
   - [Native Directory Architecture (`ios/` & `android/`)](#native-directory-architecture-ios--android)
4. [Core API Reference](#4-core-api-reference)
   - [LiveActivity API (Lock Screen, Dynamic Island & 3 Push Token Types)](#1-liveactivity-api)
   - [Widget API (Home Screen Widgets, Multi-Page & Background Sync)](#2-widget-api-home-screen-widgets)
   - [SharedStorage API (App Groups & SharedPreferences)](#3-sharedstorage-api)
5. [Declarative UI Engine (`UI.*`)](#5-declarative-ui-engine-ui)
   - [UI.VStack & UI.HStack](#uivstack--uihstack)
   - [UI.Text](#uitext)
   - [UI.Timer (Zero-Battery Hardware Timer)](#uitimer-zero-battery-hardware-timer)
   - [UI.Progress (Bar, Segmented & Circular Progress)](#uiprogress-bar-segmented--circular-progress)
   - [UI.Equalizer (Realtime Animated Music Waveform)](#uiequalizer-realtime-animated-music-waveform)
   - [UI.Image (Remote URL, Base64, File, Asset & SF Symbols)](#uiimage-remote-url-base64-file-asset--sf-symbols)
   - [UI.Button (Interactive Page Switching, Task Toggle, API Refresh & Deep Links)](#uibutton-interactive-widget-buttons)
6. [Dynamic Island Configuration (iPhone 14 Pro, 15, 16, 17)](#6-dynamic-island-configuration-iphone-14-pro-15-16-17)
7. [Building Multi-Page & Interactive Home Screen Widgets in JavaScript](#7-building-multi-page--interactive-home-screen-widgets-in-javascript)
   - [Lock Screen Widgets on iOS (accessoryRectangular, circular, inline)](#lock-screen-widgets-on-ios)
   - [In-App Pin Widget on Android](#in-app-pin-widget-on-android)
8. [Background API Auto-Sync When App Is Killed (`Widget.setRemoteConfig`)](#8-background-api-auto-sync-when-app-is-killed-widgetsetremoteconfig)
9. [Managing All 3 Push Token Types (APNs & FCM)](#9-managing-all-3-push-token-types-apns--fcm)
10. [State Machine & Timed Phases (`phases`)](#10-state-machine--timed-phases-phases)
11. [Server Push Payload Structure (APNs & FCM)](#11-server-push-payload-structure-apns--fcm)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview & Architecture

**`react-native-live-widgets`** is an all-in-one library that lets you author **100% of your Home Screen Widget and Live Activity UI directly in React Native (`App.tsx`)**, rendering natively on both iOS and Android without writing custom SwiftUI or RemoteViews XML for each screen:

- **Live Activity (iOS 16.1+ ActivityKit & Dynamic Island):** Real-time ongoing activities (attendance shifts, ride-hailing, food delivery, Pomodoro timers).
- **Live Update (Android API 24 -> Android 16 API 36 `Notification.ProgressStyle`):** Promoted ongoing notifications on Android featuring custom avatars (`LargeIcon`), multi-step segmented progress bars, chronometer countdowns, and interactive action buttons.
- **Home Screen Widgets (iOS WidgetKit & Android AppWidget High-DPI Canvas Renderer):** Home screen widgets (`small`, `medium`, `large`) supporting in-place tab/page switching (`pages`), interactive checklists (`toggle`), remote URL/Base64 images, and background API synchronization even when the app is force-killed.
- **Shared Storage:** Instant bridge between React Native and Native Widgets backed by iOS App Groups and Android `SharedPreferences`.

---

## 2. Official Live Demo Repositories (Expo & Bare RN)

To inspect real-world implementation patterns and test immediately on a simulator or device, check out the two official demo projects:

| Architecture | GitHub Repository | Highlights |
| :--- | :--- | :--- |
| **🚀 Expo (SDK 58 / CNG)** | 👉 **[https://github.com/React-Native-Vu/LiveWidgetsExampleExpo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)** | Continuous Native Generation with Expo Config Plugin (`app.plugin.js`), zero manual Xcode/Gradle editing required. |
| **⚛️ Bare React Native CLI** | 👉 **[https://github.com/React-Native-Vu/LiveWidgetsExample](https://github.com/React-Native-Vu/LiveWidgetsExample)** | Full Xcode Widget Extension and Android Studio project structure for standard React Native CLI setups. |

### ⚡ Quick Start with Expo Demo (LiveWidgetsExampleExpo):
```bash
git clone https://github.com/React-Native-Vu/LiveWidgetsExampleExpo.git
cd LiveWidgetsExampleExpo
npm install
npx expo prebuild
npm run setup:widgets
npx expo run:ios # or npx expo run:android
```

---

## 3. Installation & Project Setup

### For Expo Projects
If you are using **Expo**, the library provides an **Expo Config Plugin (`app.plugin.js`)** and **CLI Wizard** out of the box.
👉 **See the dedicated step-by-step guide: [Expo Integration Guide (EXPO-GUIDE-EN.md)](./EXPO-GUIDE-EN.md)**

```bash
# 1. Install package
npx expo install react-native-live-widgets

# 2. Add plugin to app.json & generate native projects
npx expo prebuild

# 3. Automatically link and configure Widget Extension
npx react-native-live-widgets init --group group.com.yourcompany.app
```

---

### Package Installation (Bare React Native CLI)
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

### Android Setup (Gradle, Manifest, MainApplication & Permissions)

On Android, most of the native setup is **handled automatically** out of the box via Gradle's **Android Manifest Merger**. Below is a complete breakdown of what is pre-configured and what you should verify in your project:

#### 1. What the Library Auto-Registers for You (Zero Manual Manifest Setup)
The library's bundled `AndroidManifest.xml` automatically merges the following into your app at build time:
- **System Permissions:**
  - `android.permission.INTERNET` (downloads remote URL images & executes background Widget API calls).
  - `android.permission.POST_NOTIFICATIONS` (displays Live Update Notifications on Android 13+).
  - `android.permission.POST_PROMOTED_NOTIFICATIONS` (enables status-bar Live Update chips on Android 16 / API 36).
  - `android.permission.VIBRATE`.
- **Home Screen Widget Provider (`DynamicHomeScreenWidgetProvider`):** Linked with `@xml/rn_live_widgets_info` supporting free horizontal & vertical resizing (`resizeMode="horizontal|vertical"`).
- **Broadcast Receiver (`LiveActivityReceiver`):** Handles interactive button taps on both Notifications and Home Screen Widgets.

#### 2. Step 1: Verify SDK Versions in `android/build.gradle`
Ensure your root `android/build.gradle` uses `minSdkVersion >= 24` and `compileSdkVersion >= 35` (or `36` for Android 16 Live Updates):
```groovy
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35 // Or 36 for Android 16
        targetSdkVersion = 35
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
}
```

#### 3. Step 2: Verify `MainApplication.kt`
React Native 0.7x / 0.8x **Autolinking** (`PackageList(this).packages`) automatically registers `LiveActivityPackage`.
> ⚠️ **Important Note for React Native 0.80+:** Ensure `loadReactNative(this)` is called inside `MainApplication.onCreate()` so SoLoader/JSI initializes properly on launch:
```kotlin
package com.yourcompany.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages, // LiveActivityPackage() is auto-linked here
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this) // Required on React Native 0.80+
  }
}
```

#### 4. Step 3: Request Runtime Notification Permission on Android 13+ (API 33+)
On Android 13 (API 33) and above, request `POST_NOTIFICATIONS` at runtime before starting a Live Update notification:
```typescript
import { Platform, PermissionsAndroid } from 'react-native';
import { LiveActivity } from 'react-native-live-widgets';

async function ensureAndroidNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  }
  // Or call the library's cross-platform helper directly:
  await LiveActivity.registerForPushNotifications();
}
```

#### 5. Step 4: Adding & Resizing Home Screen Widgets on Android (`small` / `medium` / `large`)
1. After calling `Widget.update('main', { small, medium, large })` in your app, go to the Android Home Screen.
2. **Long-press an empty area** on the Home Screen -> Tap **Widgets** -> Find your app -> Drag **Live Widgets** onto the Home Screen.
3. **Responsive Family Switching (`small` / `medium` / `large`):** Long-press the placed widget and release to show the resize handles:
   - Resize to **2×2 cells** (`width < 210dp`): Automatically renders the **`small`** layout (1:1 square aspect ratio).
   - Resize to **4×2 cells** (default): Automatically renders the **`medium`** layout.
   - Resize vertically to **4×4 cells** (`height >= 200dp`): Automatically renders the **`large`** layout.

---

### Native Directory Architecture (`ios/` & `android/`)

The native codebase is modularized by feature so you can easily navigate or extend it:

```text
react-native-live-widgets/
├── ios/
│   ├── Bridge/       # LiveActivityModule.swift/.m (React Native <-> iOS Bridge)
│   ├── Models/       # DynamicLayoutModels.swift, DynamicActivityAttributes.swift
│   ├── Storage/      # DynamicWidgetStateStore.swift, DynamicWidgetImageCache.swift
│   ├── Intents/      # DynamicWidgetActionIntent.swift (iOS 17+ interactive AppIntent)
│   ├── Renderer/     # DynamicNodeView.swift, ColorHexExtension.swift (SwiftUI JSON Renderer)
│   └── Widgets/      # DynamicHomeScreenWidget.swift, DynamicLiveActivityWidget.swift
└── android/src/main/java/com/reactnativeliveactivity/
    ├── bridge/       # LiveActivityModule.kt, LiveActivityPackage.kt
    ├── storage/      # DynamicWidgetStateStore.kt, DynamicWidgetImageCache.kt
    ├── renderer/     # DynamicWidgetCanvasRenderer.kt (2D Canvas Renderer + HitBox Calculator)
    ├── widgets/      # DynamicHomeScreenWidgetProvider.kt (Small/Medium/Large AppWidget Provider)
    └── liveactivity/ # LiveActivityNotifier.kt, LiveActivityReceiver.kt (Android 8 -> 16 Live Updates)
```

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

### 2. `Widget` API (Home Screen & Lock Screen Widgets)
- `Widget.setLayout(widgetKey, layoutConfig, appGroup?)`: Updates the dynamic widget layout (`small`, `medium`, `large` for Home Screen; `accessoryRectangular`, `accessoryCircular`, `accessoryInline` for iOS 16+ Lock Screen; `pages`, `initialPage` for multi-page tabs). Prefetches and downscales all remote URL images automatically.
- `Widget.requestPin()`: *(Android 8.0+)* Prompts the system dialog allowing the user to pin the widget directly to their home screen with a single tap from within the app!
- `Widget.isPinSupported()`: Checks if the current Android launcher supports in-app widget pinning.
- `Widget.setRemoteConfig(config, widgetKey?, appGroup?)`: Configures a remote HTTP endpoint so the Widget automatically fetches fresh JSON data in the background even when the app is killed.
- `Widget.reloadAll()`: Forces iOS/Android to redraw all Home Screen and Lock Screen Widgets immediately.
- `Widget.reload(kind)`: Reloads a specific widget by kind.
- `Widget.getInteractiveState(widgetKey?, appGroup?)`: Reads the current interactive state (`activePage`, `toggledItems`, `lastSyncTime`, `remoteVariables`).
- `Widget.onWidgetAction(cb)`: Subscribes to button tap actions triggered from the Widget or Notification.

### 3. `SharedStorage` API
- `SharedStorage.set(key, value, appGroup?)`: Saves a string or JSON object to App Group `UserDefaults` (iOS) or `SharedPreferences` (Android).
- `SharedStorage.get<T>(key, appGroup?)`: Reads shared data.
- `SharedStorage.remove(key, appGroup?)`: Removes a key.
- `SharedStorage.clear(appGroup?)`: Clears all shared widget data (useful on user logout).

### 4. `AudioPlayer` API (Music Playback & Equalizer Testing)
- `AudioPlayer.play(url)`: Plays audio directly from URL (`.mp3`, `.m4a`, `.aac`, `.wav`) through system speakers (iOS `AVPlayer` / Android `MediaPlayer`).
- `AudioPlayer.pause()`: Pauses the currently playing track.
- `AudioPlayer.resume()`: Resumes playback.
- `AudioPlayer.stop()`: Stops playback and releases audio resources.
- `AudioPlayer.getStatus()`: Returns current playback status (`{ isPlaying, currentTime, duration }`).

---

## 4. Declarative UI Engine (`UI.*`)

### `UI.StyleSheet` & Reusable Styling (`StyleProp`)
Just like React Native's `StyleSheet.create`, you can define reusable styles to keep your widget layouts modular and clean, supporting conditional style arrays:

```typescript
import { UI } from 'react-native-live-widgets';

const styles = UI.StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    spacing: 8,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  errorText: {
    color: '#EF4444',
  },
});

// Single style or conditional array:
UI.VStack(
  styles.card,
  UI.Text('REPORT TITLE', styles.headerText),
  UI.Text('Current Shift Status', [styles.titleText, isError && styles.errorText])
);
```

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

### `UI.Equalizer` (Realtime Animated Music Waveform)
A dedicated audio equalizer and waveform visualizer. On Dynamic Island and Lock Screen Live Activities (iOS), the equalizer automatically oscillates rhythmically in real-time (using SwiftUI `TimelineView(.animation)`) with zero battery drain; on Android and Home Screen, it renders crisp audio frequency bars:
```typescript
// 1. Used in Dynamic Island (compactTrailing or minimal)
UI.Equalizer({
  isPlaying: true,        // true: oscillating animated wave | false: paused
  barCount: 4,            // Number of wave bars (2 to 8)
  tintColor: '#10B981',   // Wave bar color (Spotify / Apple Music green)
  height: 14,             // Height in points
  barWidth: 3,            // Width of each bar
  spacing: 2,             // Spacing between bars
})

// 2. Used in Home Screen or Lock Screen Widget
UI.Equalizer({
  isPlaying: true,
  barCount: 5,
  tintColor: '#FFFFFF',
  height: 18,
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

### `UI.ZStack`, `UI.Grid` & `UI.Divider` (Advanced Layout Containers)
```typescript
// 1. ZStack: Overlay layers on top of each other
UI.ZStack(
  { zAlignment: 'bottomTrailing' },
  UI.Image('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', { width: 44, height: 44, borderRadius: 22 }),
  UI.Badge('●', { backgroundColor: '#10B981', textColor: '#FFFFFF', fontSize: 8 })
)

// 2. Grid: Multi-column grid layout (e.g., 2x2 KPI dashboard cards)
UI.Grid(
  { columns: 2, columnSpacing: 8, rowSpacing: 8 },
  UI.VStack({ padding: 8, backgroundColor: '#1E293B', borderRadius: 8 }, UI.Text('Revenue', { fontSize: 10, color: '#94A3B8' }), UI.Text('$128K', { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' })),
  UI.VStack({ padding: 8, backgroundColor: '#1E293B', borderRadius: 8 }, UI.Text('Orders', { fontSize: 10, color: '#94A3B8' }), UI.Text('1,420', { fontSize: 14, fontWeight: 'bold', color: '#34D399' }))
)

// 3. Divider: Horizontal or vertical separator line
UI.Divider({ color: '#334155', thickness: 1, marginVertical: 4 })
```

### `UI.Gauge` & `UI.Chart` (Speedometer KPI Gauge & Bar / Line Sparkline Charts)
```typescript
// 1. 240° Arc Speedometer / KPI Gauge
UI.Gauge(0.86, {
  size: 66,
  tintColor: '#38BDF8',
  trackColor: '#1E293B',
  textColor: '#F8FAFC',
  labelColor: '#94A3B8',
  valueText: '86%',
  label: 'Q4 KPI',
})

// 2. Bar Chart ('bar') or Sparkline Area Chart ('line')
UI.Chart([42, 58, 51, 74, 68, 92, 108], {
  style: 'bar', // 'bar' | 'line'
  labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  tintColor: '#38BDF8',
  secondaryColor: '#1E3A8A',
  labelColor: '#94A3B8',
  height: 48,
})
```

### `UI.Toggle`, `UI.Badge` & `UI.Link`
```typescript
// 1. Toggle: Interactive Checkbox or Switch directly on the Widget surface
UI.Toggle('Approve weekly revenue report', {
  actionId: 'toggle:kpi_approve',
  style: 'checkbox', // 'checkbox' | 'switch'
  tintColor: '#38BDF8',
  textColor: '#F8FAFC',
})

// 2. Badge: Pill / Capsule status tag
UI.Badge('+18% Above Target', {
  backgroundColor: '#064E3B',
  textColor: '#34D399',
  fontSize: 10,
})

// 3. Link: Wrap any container to open a Deep Link or trigger an interactive action
UI.Link(
  { deepLink: 'livewidgets://analytics/q4', padding: 10, backgroundColor: '#1E293B', borderRadius: 10 },
  UI.Text('View full analytics →', { fontSize: 12, fontWeight: 'bold', color: '#38BDF8' })
)
```

### `UI.Custom` & `DynamicNodeRegistry` (Register Custom Native SwiftUI / Kotlin Components)
You can register your own custom **SwiftUI View** or **Kotlin Canvas Drawer** without modifying the library's core code:

1. **Register on iOS (Swift — inside `LiveWidgetsBundle.swift`):**
```swift
import SwiftUI
import react_native_live_widgets

DynamicNodeRegistry.shared.registerView("WeatherCard") { node in
  let city = node.props?["city"]?.stringValue ?? "Hanoi"
  let temp = node.props?["temp"]?.stringValue ?? "28°C"
  HStack {
    Image(systemName: "sun.max.fill").foregroundColor(.yellow)
    Text("\(city): \(temp)").font(.headline)
  }
}
```

2. **Register on Android (Kotlin — inside `MainApplication.onCreate()`):**
```kotlin
import com.reactnativeliveactivity.DynamicNodeRegistry

DynamicNodeRegistry.register(
  componentName = "WeatherCard",
  heightDp = { 44f },
  drawer = { context, canvas, rect, props, density ->
    // Draw custom graphics onto the Widget Canvas
  }
)
```

3. **Invoke from React Native (`App.tsx`):**
```typescript
UI.Custom('WeatherCard', { city: 'Ho Chi Minh City', temp: '31°C' })
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

### Lock Screen Widgets on iOS
On iOS 16+, WidgetKit supports 3 lock screen accessory families:
- `accessoryRectangular`: Horizontal rectangle positioned below the clock.
- `accessoryCircular`: Compact circular gauge or indicator.
- `accessoryInline`: Compact single-line text row above the clock.

> [!NOTE]
> The library automatically strips opaque background colors and adapts paddings so that lock screen widgets render natively with system vibrancy against the user's wallpaper.

```typescript
await Widget.setLayout('main', {
  // Home Screen sizes
  small: smallNode,
  medium: mediumNode,
  large: largeNode,

  // Lock Screen sizes (iOS 16+)
  accessoryRectangular: UI.HStack(
    { spacing: 6 },
    UI.VStack(
      { spacing: 2 },
      UI.Text('Starboy', { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }),
      UI.Text('The Weeknd', { fontSize: 11, color: '#CCCCCC' })
    ),
    UI.Spacer(),
    UI.Equalizer({ isPlaying: true, barCount: 4, tintColor: '#FFFFFF', height: 16 })
  ),
  accessoryCircular: UI.VStack(
    { spacing: 2 },
    UI.Equalizer({ isPlaying: true, barCount: 4, tintColor: '#FFFFFF', height: 18 }),
    UI.Text('MUSIC', { fontSize: 8, fontWeight: 'bold', color: '#FFFFFF' })
  ),
  accessoryInline: UI.Text('♪ Starboy • The Weeknd', { fontSize: 12, fontWeight: 'medium' }),
});
```

### In-App Pin Widget on Android
On Android 8.0+ (API 26+), you can trigger the system dialog from inside your React Native app to pin a widget to the home screen without asking users to manually search the launcher:

```typescript
import { Widget } from 'react-native-live-widgets';

// Check if launcher supports in-app pinning
const isSupported = await Widget.isPinSupported();

if (isSupported) {
  // Request system dialog to pin widget
  const success = await Widget.requestPin();
  if (success) {
    console.log('Pin request accepted by system');
  }
}
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

