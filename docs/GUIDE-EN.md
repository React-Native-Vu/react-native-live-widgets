# REACT-NATIVE-LIVE-WIDGETS — COMPLETE SETUP & DEVELOPER GUIDE 🚀

> 🌐 **Language:** [Tiếng Việt (GUIDE-VI.md)](./GUIDE-VI.md) | **English** • [⚡ Dedicated Expo Guide (EXPO-GUIDE-EN.md)](./EXPO-GUIDE-EN.md) • [🌐 Web Docs & Live Simulator](https://react-native-vu.github.io/react-native-live-widgets/)

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
11. [Server Push Payload Structure (APNs & FCM)](#10-server-push-payload-structure-apns--fcm)
12. [Troubleshooting](#11-troubleshooting)
13. [Advanced Styling Modifiers, UI IR, Exact Hit Layer & Platform Matrix (v1.2.1)](#12-advanced-styling-modifiers--platform-capability-matrix)

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
npx react-native-live-widgets init
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
1. After calling `Widget.setLayout('main', { small, medium, large })` (or alias `Widget.update(...)`) in your app, go to the Android Home Screen.
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

## 4. Declarative UI Engine

The library supports **2 dual UI authoring styles** side-by-side depending on your preferences:
1. **Style 1: React JSX / TSX Components (`<VStack>`, `<Text>`, `<Button>`)** — Write widgets exactly like building standard React Native components. Fully supports the standard `style` prop, conditional style arrays, and nested hierarchies.
2. **Style 2: Functional DSL (`UI.VStack(...)`)** — Concise and functional, with zero JSX tags to import.

Both styles compile down automatically to the exact same native engine (SwiftUI on iOS and 2D Canvas on Android).

---

### Style 1: Building Widgets with JSX / TSX Components

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Widget, VStack, HStack, Text, Badge, Progress, Button } from 'react-native-live-widgets';

export const MyWidgetLayout = (
  <VStack style={styles.card}>
    <HStack style={styles.header}>
      <Text style={styles.title}>Shift Check-in</Text>
      <Badge text="07:54 (Valid)" backgroundColor="#064E3B" textColor="#6EE7B7" />
    </HStack>
    <Progress value={0.75} style="segmented" segments={4} tintColor="#38BDF8" height={8} />
    <Button title="Refresh Data" actionId="refresh" fullWidth />
  </VStack>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  header: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
```

---

### In-App Widget Preview (`<WidgetPreview>` / `<VoltraWidgetPreview>`)

Embed a realistic, pixel-accurate widget mockup inside any app screen to test layout bounds and button click interactions without leaving your application:

```tsx
import { WidgetPreview, VStack, HStack, Text, Button } from 'react-native-live-widgets';

export function PreviewScreen() {
  return (
    <WidgetPreview
      size="medium"                // 'small' | 'medium' | 'large' | 'lockScreen'
      showBadge={true}             // Shows 'Medium • 338×158'
      interactiveSizeSwitch={true} // Quick tabs to switch small / medium / large
      onAction={(actionId) => {
        console.log('Action tapped inside preview:', actionId);
      }}
    >
      <VStack padding={16} backgroundColor="#0F172A" borderRadius={20}>
        <HStack justifyContent="spaceBetween">
          <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Project Progress</Text>
          <Text fontSize={12} color="#38BDF8">75%</Text>
        </HStack>
        <Button title="Update" actionId="refresh" fullWidth />
      </VStack>
    </WidgetPreview>
  );
}
```

---

### Style 2: Functional DSL (`UI.StyleSheet` & Reusable Styling)
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

> [!IMPORTANT]
> **Architectural Recommendation for Terminated (Force-Killed) Apps:**
> - **iOS:** When the main app is force-killed by the user, the JavaScript engine (Hermes/JSC) is terminated. Widget button taps are handled natively by Swift (`AppIntent`) and stored in App Groups. JavaScript callbacks (`registerActionHandler`) **cannot run** until the app is reopened.
> - **Android:** While `HeadlessJsTaskService` can wake the JS runtime in the background, aggressive OEM battery savers (MIUI, ColorOS, OneUI) may delay or suppress headless execution.
> - **Production Rule:** For mission-critical actions (e.g., employee attendance check-ins or financial authorizations), adopt an **Offline-First & Local State Queue** pattern: Native widgets record the action in `SharedStorage`, and `App.tsx` reads and synchronizes the queue when the app is next launched.

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

> [!NOTE]
> **Platform Differences: iOS Dynamic Island vs. Android Live Updates:**
> - **iOS:** The `dynamicIsland` configuration maps directly to Apple's hardware Dynamic Island pill (iPhone 14 Pro+) via ActivityKit and SwiftUI (`compactLeading`, `compactTrailing`, `minimal`, `expanded`).
> - **Android:** Because standard Android devices do not feature Apple's hardware island cutout, this configuration is mapped to an **Ongoing Promoted Notification (`Notification.ProgressStyle`)** with an avatar icon, progress segments, and action buttons on the notification bar.

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
// Full standard signature:
await Widget.setRemoteConfig('main', {
  url: 'https://api.yourcompany.com/v1/widget-summary',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  refreshIntervalMinutes: 15, // OS-scheduled background sync (alias: intervalMinutes)
}, APP_GROUP);

// Or convenient shorthand (defaults to widgetKey = 'main'):
await Widget.setRemoteConfig({
  url: 'https://api.yourcompany.com/v1/widget-summary',
  refreshIntervalMinutes: 15,
}, APP_GROUP);
```

- **How it works:**
  - **iOS**: `DynamicWidgetProvider` performs an asynchronous HTTP request during its WidgetKit timeline reload (or immediately when the user taps a button with `actionId: 'refresh'`), flattens the JSON response, and injects values into `{{fieldName}}` placeholders across your UI tree.
  - **Android**: `AlarmManager` schedules `LiveActivityReceiver` (`ACTION_WIDGET_SYNC`), fetches fresh JSON in the background (`goAsync()`), updates `SharedPreferences`, and redraws `DynamicHomeScreenWidgetProvider`.
  - The built-in `{{_lastSyncTime}}` placeholder automatically resolves to the latest sync timestamp (`HH:mm:ss`).

> [!NOTE]
> **Understanding Polling Intervals & OS Widget Budget:**
> - The `intervalMinutes: 15` option specifies the *desired* refresh cadence. Both iOS and Android apply strict battery and resource policies:
>   - **iOS WidgetKit Budget:** Apple enforces a daily budget (~40 to 70 reloads per day). If the device is in Low Power Mode or the daily quota is exhausted, reloads may be delayed.
>   - **Android Doze Mode:** Batches recurring background alarms to preserve battery health.
> - **Recommendation:** If your application requires precise, second-by-second updates (e.g., driver location or emergency shifts), always rely on **Server Push Notifications (APNs / FCM)** as the primary transport and treat background polling as a fallback.

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

---

## 12. Advanced Styling Modifiers & Platform Capability Matrix

### 12.1. Styling Modifiers Reference

Elevate your widgets and Live Activities with design system fundamentals:

1. **🌈 Linear & Radial Gradients**:
   ```tsx
   <VStack
     gradient={{
       colors: ['#1E3A8A', '#3B82F6'],
       startPoint: { x: 0, y: 0 },
       endPoint: { x: 1, y: 1 },
       angle: 45,
     }}
     padding={16}
   >
     <Text typography="headline" color="#FFFFFF">Gradient Card</Text>
   </VStack>
   ```
   > [!TIP]
   > **Graceful Fallback**: If an older OS version or platform does not support gradient shaders, the renderer automatically uses the first color in `colors` as the solid fallback `backgroundColor`.

2. **🔲 Borders & Dashed Lines**:
   ```tsx
   <VStack
     borderWidth={1.5}
     borderColor="#38BDF8"
     borderStyle="dashed"
     borderRadius={12}
     padding={12}
   >
     <Text fontSize={12} color="#94A3B8">Dashed card border</Text>
   </VStack>
   ```

3. **🌑 Shadows & Elevation**:
   ```tsx
   <Button
     title="Confirm"
     backgroundColor="#2563EB"
     shadowColor="#2563EB"
     shadowRadius={6}
     shadowOpacity={0.4}
     shadowOffset={{ x: 0, y: 3 }}
   />
   ```

4. **🔤 Typography & Dynamic Type (Accessibility Scaling)**:
   - Scale levels: `largeTitle` (34), `title1` (28), `title2` (22), `title3` (20), `headline` (17 bold), `body` (17 regular), `callout` (16), `subheadline` (15), `footnote` (13), `caption1` (12), `caption2` (11).
   - `fontDesign`: `'default' | 'monospaced' | 'rounded' | 'serif'`.
   - `dynamicType`: Defaults to `true` — automatically respects the user's OS Accessibility font size setting.

5. **🌗 Tinted / Dark Mode (iOS 18 Accentable & Android Dynamic Theming)**:
   ```tsx
   <Text color={{ light: '#0F172A', dark: '#F8FAFC', tinted: '#38BDF8' }}>
     Theme-adaptive text
   </Text>
   ```

6. **🌍 RTL Internationalization**:
   ```tsx
   <HStack direction="rtl" isRTL={true} spacing={8}>
     <Text>مرحبا بك</Text>
   </HStack>
   ```

---

### 12.2. Platform Capability & Fallback Matrix

Rather than making unverified claims of "100% parity", the engine provides an explicit, transparent capability matrix paired with automatic **Graceful Fallbacks**:

| Feature / Modifier | iOS WidgetKit | iOS Live Activity | Android Ongoing Notification | Android Home Widget | Graceful Fallback Strategy |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Declarative Layouts (`VStack`/`HStack`/`Grid`)** | ✅ SwiftUI | ✅ SwiftUI | ✅ Canvas | ✅ 2D Canvas | 100% pixel-aligned cross-platform |
| **Linear / Radial Gradients** | ✅ SwiftUI | ✅ SwiftUI | ✅ Shader | ✅ Shader | Automatically falls back to dominant solid `backgroundColor` |
| **Card & Text Shadows** | ✅ SwiftUI | ✅ SwiftUI | ⚠️ Text Only | ✅ `setShadowLayer` | Falls back to elevation or thin border stroke |
| **Dashed / Dotted Borders** | ✅ StrokeStyle | ✅ StrokeStyle | ⚠️ Solid | ✅ `DashPathEffect` | Automatically falls back to solid border |
| **Dynamic Type (Accessibility)** | ✅ Native | ✅ Native | ✅ `fontScale` | ✅ `fontScale` | Automatically scales with OS font multiplier |
| **RTL Layout Mirroring** | ✅ Native | ✅ Native | ✅ RTL | ✅ RTL | Reverses flex order and flips text alignment |
| **Accessibility (TalkBack / VoiceOver)** | ✅ Native VoiceOver | ✅ Native VoiceOver | ✅ Notification Text | ✅ A11y Summary + Hit-Zones | Aggregated semantic `contentDescription` ensures full screen-reader readability |
| **iOS 18 Tinted Mode** | ✅ Accentable | N/A | N/A | ✅ Material You | Resolves `tinted` key on iOS 18; falls back to dark/light color |
| **Interactive Background Intents** | ✅ iOS 17+ | ✅ iOS 17+ | ✅ PendingIntent | ✅ PendingIntent | Updates local Shared Storage and refreshes timeline |

---

### 12.3. ♿ Accessibility & Semantics (Phase 1 Fallback Layer)

To ensure users with visual impairments or screen-reader users (**VoiceOver on iOS**, **TalkBack on Android**) receive full context, the engine provides standard accessibility props:

```tsx
<VStack padding={16} backgroundColor="#0F172A">
  {/* Header with semantic role */}
  <Text
    typography="title2"
    accessibilityRole="header"
    accessibilityLabel="Shift Attendance Dashboard"
  >
    ATTENDANCE DASHBOARD
  </Text>

  {/* Progress gauge with spoken percentage */}
  <Progress
    value={0.86}
    accessibilityLabel="Shift completion progress"
    accessibilityValue="86 percent"
  />

  {/* Interactive button with action hint */}
  <Button
    title="Clock In"
    actionId="CLOCK_IN"
    accessibilityRole="button"
    accessibilityLabel="Clock in to shift"
    accessibilityHint="Double tap to confirm attendance"
  />

  {/* Decorative element hidden from screen readers */}
  <Image systemName="sparkles" accessible={false} />
</VStack>
```

#### How Phase 1 Accessibility Works:
1. **iOS (SwiftUI)**: Maps directly to native `.accessibilityLabel()`, `.accessibilityHint()`, `.accessibilityValue()`, and `.accessibilityAddTraits()`. Elements with `accessible={false}` receive `.accessibilityHidden(true)`.
2. **Android (Canvas 2D)**:
   - Recursively extracts an intelligent text summary (`extractAccessibilitySummary`) and binds it to the canvas `ImageView`'s `contentDescription`.
   - Each interactive hit-zone receives its own `contentDescription` and action hint so TalkBack speaks each button individually when focused.
3. **In-App Preview**: Maps to React Native Web/Mobile accessibility props.

---

### 12.4. Programmatic Capability Inspection (`Widget.getCapabilities`)
```typescript
const caps = await Widget.getCapabilities();
console.log(`Running on: ${caps.platform} (OS: ${caps.osVersion})`);

if (caps.supportsDynamicIsland) {
  console.log('Device has Dynamic Island hardware!');
}

if (caps.supportsTintedMode) {
  console.log('Device supports iOS 18 Tinted Home Screen mode!');
}
```

---

### 12.5. 🌲 UI Intermediate Representation (IR) & Semantic Tree (Phase 2)

Rather than compiling directly from `DSL ➔ Canvas Bitmap`, the engine introduces a decoupled **UI Intermediate Representation (IR v2.0)** and a **Renderer Planner**:

```
React Native DSL (JSX / UI.*)
       ↓
UI Intermediate Representation (IR v2.0)
 ├── UI Tree (unique ID for every node)
 ├── Semantic Tree (independent of visual renderer)
 ├── State Bindings (toggle:<key>, page:<id>)
 └── Renderer Planner (classifies Native RemoteViews vs Canvas Bitmap)
       ↓
 ├── [NATIVE] RemoteViews (TextView, Button, ProgressBar)
 └── [CANVAS] Canvas 2D Bitmap (Gauge 240°, Equalizer, Shader)
```

#### Inspecting and Compiling IR:
```typescript
import { Widget, UI } from 'react-native-live-widgets';

const layout = UI.VStack({
  padding: 16,
  backgroundColor: '#0F172A',
  children: [
    UI.Text('ATTENDANCE DASHBOARD', { typography: 'title2' }),
    UI.Progress({ value: 0.86, accessibilityLabel: 'Shift completion' }),
    UI.Button({ title: 'Clock In', actionId: 'toggle:attendance' }),
    UI.Gauge({ value: 0.92, label: 'Efficiency' })
  ]
});

// 1. Inspect architectural plan and accessibility synthesis
console.log(Widget.inspectIR(layout));

// 2. Compile to raw IR object
const ir = Widget.compileIR(layout);
console.log('Synthesized A11y Summary:', ir.semanticSummary);
```

---

### 12.6. ⚡ Native State Sync, Sub-renderer Optimization & Automated Test Suite

#### 1. Native State Synchronization (Phase 4):
- Instant action & toggle responses: Native Android (`LiveActivityReceiver.kt` & `DynamicWidgetStateStore`) immediately updates `SharedPreferences` and triggers a widget redraw with zero UI lag even if the app was killed.
- React hooks (`useWidgetStorage`, `useWidgetAction`) reconcile the latest state upon app launch.

#### 2. Canvas Sub-renderer Optimization (Phase 5):
- `renderSubNodeBitmap`: Isolates bitmap allocation solely to the sub-component's bounding box (e.g. 64dp Gauge consumes only ~40KB bitmap) instead of allocating a full-screen canvas bitmap.
- Completely avoids Android Binder IPC `TransactionTooLargeException`.

#### 3. Advanced JSX Components & Automated Tests (Phase 6):
- New JSX components: `<Toggle>`, `<Switch>`, and `<Checkbox>` with `checked`/`isChecked`, `tintColor`, and `strikethroughOnCheck`.
- Automated test suite verifying 100% assertions:
  ```bash
  npm test
  ```

---

### 12.7. 🎯 Exact Dynamic Hit Layer, Live Chronometer Countdown & Swift 6 Compatibility (v1.2.1)

Version **v1.2.1** addresses critical real-world interaction challenges on physical devices:

#### 1. Exact Dynamic Hit Layer
* **Previous Issue**: With static coordinate grids, layout reflows or dynamic content caused buttons to trigger adjacent items or blank spaces to activate phantom taps.
* **v1.2.1 Solution**:
  - Replaced the fixed grid with a dynamic `FrameLayout` container (`rn_hit_layer` paired with `rn_live_widget_hit_zone.xml`).
  - Implemented the **`computeCanvasMapping`** algorithm to calculate aspect ratio letterboxing (`fitCenter`) between the Canvas Bitmap and the Launcher Widget bounds.
  - Generates independent RemoteViews hit zones that align 100% with the rendered element bounding box. Empty areas receive no touch events.

#### 2. Native Live Countdown Chronometer (`android.widget.Chronometer`)
* **Previous Issue**: Drawing countdown text directly on Canvas required broadcasting and re-rendering the bitmap every second, causing battery drain and rate-limiting from Android system schedulers.
* **v1.2.1 Solution**:
  - Integrated native `android.widget.Chronometer` into the widget host layout.
  - Automatically configured with `setChronometerCountDown(true)` and `baseMillis = SystemClock.elapsedRealtime() + remainingMillis`.
  - The renderer suppresses static timer text when an active chronometer is present, allowing continuous 1-second countdown ticks driven natively by Android OS.

#### 3. Dynamic Template Variable Interpolation & Initial State Store
* **Variable Interpolation**: Supports dynamic string templates (`{{id}}`, `{{title}}`, counter values) directly in the layout JSON, automatically resolved against action responses and local state.
* **`defaultChecked` Persistence**: Switches and checkboxes with `checked: true` have their initial state committed to `DynamicWidgetStateStore` on initial render, allowing them to be toggled off immediately on the first tap.

#### 4. Swift 6 Language Mode Compatibility (iOS Xcode)
* **Resolved `type '()' cannot conform to 'View'`**:
  - Encapsulated `Font` resolution in `renderText()` within self-invoking closures `{ ... }()`.
  - Refactored `DynamicNodeAccessibilityModifier` procedural assignments into a dedicated `buildAccessibilityView(content:) -> AnyView` helper method.
  - Added fallback `else { EmptyView() }` branches to `backgroundView` and `borderOverlay` in `ContainerStyleModifier`.

---

### 12.8. 📱 Extended Widget Families (`extraLarge`, `standBy`, `ControlWidget`) & Complete Live Activity Lifecycle

#### 1. Extended Widget Families
Beyond `small`, `medium`, `large`, and Lock Screen (`accessoryRectangular`, `accessoryCircular`, `accessoryInline`) layouts:
- **`extraLarge?: LayoutNode`**: Targets iPadOS (`systemExtraLarge`) and Android tablets (`widgetHeightDp >= 280dp`). Supported in `<WidgetPreview size="extraLarge">`.
- **`standBy?: LayoutNode`**: Automatically activated in iOS 17+ StandBy Mode (`family == .systemSmall && !showsWidgetContainerBackground`), alongside `.applyStandByMargins()` and `widgetAccentable` support on `Text`, `Progress`, `Gauge`, and `Image`. Supported in `<WidgetPreview size="standBy">`.
- **iOS 18+ Control Widgets & Android Quick Settings Tile (`ControlWidget` / `Widget.setControl`)**: Configure iOS 18 Control Center, Lock Screen controls, and Action Button widgets natively via `ios/Widgets/DynamicControlWidget.swift` (`DynamicControlWidget` & `DynamicControlToggleWidget`) and Android Quick Settings Tiles via `DynamicQuickSettingsTileService.kt`, connected directly to `DynamicWidgetStateStore` and `useWidgetAction`:
  ```typescript
  import { ControlWidget, UI, WidgetPreview } from 'react-native-live-widgets';

  const shiftControl = ControlWidget.toggle({
    title: 'Work Shift',
    subtitle: 'Tap to clock in',
    checkedTitle: 'On Shift',
    checkedSubtitle: 'Tap to clock out',
    systemName: 'clock.badge.checkmark.fill',
    checked: true,
    actionId: 'toggle:attendance',
  });

  await ControlWidget.set('toggle', shiftControl);
  // Also supports UI.ControlButton({ ... }) and Widget.setControl('main', ...)
  // Preview in-app: <WidgetPreview size="control" controlConfig={shiftControl} />
  ```

#### 2. Complete Live Activity Lifecycle API
- **Multi-Activity Management**: `LiveActivity.getActiveActivities()`, `LiveActivity.get(activityId)`, `LiveActivity.isActive(activityId)`, and `LiveActivity.endAll()` return user-assigned `activityId`, `systemActivityId`, state flags, and tokens.
- **Stale State (`staleTimestamp`, `staleLockScreen`, `staleDynamicIsland`)**: Automatically transitions UI to fallback views when stale (`context.isStale` on iOS 16.2+ / timestamp check on Android).
- **Relevance Score (`relevanceScore`)**: Prioritizes ordering in Dynamic Island / Lock Screen (`ActivityContent.relevanceScore`) and Android Notification Shade (`setSortKey`).
- **Alert Configuration (`alertConfig`)**: Supports `{ title, body, sound }` via iOS 16.2+ `AlertConfiguration` and Android notification alerts on updates.
- **Scheduled End & Auto-Expiration (`scheduledEndTimestamp`, `autoEndAfterSeconds`, `expiredLockScreen`, `expiredDismissalPolicy`)**: Automatically updates or dismisses activities on expiration, plus `LiveActivity.cleanupExpired()` and `LiveActivity.onStateChange((ev) => ...)` emitting `'active' | 'started_by_push' | 'stale' | 'expired' | 'ended' | 'dismissed'`.
- **Upgraded `useLiveActivity()` Hook**: Exposes `activities`, `lifecycleState`, `isStale`, `refreshActivities`, and `cleanupExpired`.

---

### 🌐 Online Interactive Web Documentation

- **Web Documentation & Live Simulator**: [https://react-native-vu.github.io/react-native-live-widgets/](https://react-native-vu.github.io/react-native-live-widgets/)
- **AI Agent Quick Reference (`llms.txt`)**: [https://react-native-vu.github.io/react-native-live-widgets/llms.txt](https://react-native-vu.github.io/react-native-live-widgets/llms.txt)
- **AI Agent Full Manual (`llms-full.txt`)**: [https://react-native-vu.github.io/react-native-live-widgets/llms-full.txt](https://react-native-vu.github.io/react-native-live-widgets/llms-full.txt)

---

## 📄 License
MIT © vu-tran

