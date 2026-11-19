# 📋 Version Compatibility Matrix

This document defines the supported platforms, operating systems, and framework versions for **`react-native-live-widgets`**.

---

## 🚀 Core Compatibility Matrix

| Library Version | React Native | Expo SDK | iOS Minimum | Android Minimum | Architecture | Swift | Kotlin | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`v1.2.x` (Latest)** | **0.72 – 0.77+** | **SDK 50, 51, 52** | **iOS 16.1+** *(17.0+ interactive)* | **Android 12 (API 31)+** | **Old Arch & New Arch** | Swift 5.9 / Swift 6 | 1.9+ / 2.0+ | 🟢 Active |
| **`v1.1.x`** | 0.70 – 0.74 | SDK 49, 50 | iOS 16.1+ | Android 10 (API 29)+ | Old Arch | Swift 5.7+ | 1.8+ | 🟡 Maintenance |
| **`v1.0.x`** | 0.69 – 0.72 | SDK 48, 49 | iOS 16.1+ | Android 10 (API 29)+ | Old Arch | Swift 5.5+ | 1.7+ | 🔴 Deprecated |

---

## 📱 Operating System Feature Gates

Certain capabilities require specific OS versions due to native platform API limitations:

### 🍎 iOS Feature Support
| Feature | Minimum iOS Version | Device Constraint | Notes |
| :--- | :--- | :--- | :--- |
| **Live Activities (Lock Screen)** | iOS 16.1+ | All supported iPhones | Displayed on Lock Screen banner |
| **Dynamic Island (Expanded / Compact)** | iOS 16.1+ | iPhone 14 Pro, 15, 15 Pro, 16, 16 Pro | Automatically falls back to Lock Screen on non-Island devices |
| **Interactive Widgets (AppIntents)** | iOS 17.0+ | All supported devices | Buttons/toggles work without launching main app |
| **Static Home Screen Widgets** | iOS 14.0+ | All supported devices | WidgetKit timeline presentations |
| **Push-to-Update (APNs)** | iOS 16.1+ | Real device required | Push token provided via `onActivityToken` hook |

### 🤖 Android Feature Support
| Feature | Minimum Android Version | Target API | Notes |
| :--- | :--- | :--- | :--- |
| **Home Screen Widgets** | Android 8.0 (API 26)+ | API 34 / 35 | Rendered via RemoteViews |
| **Pixel-Exact Touch Layer** | Android 12 (API 31)+ | API 34 / 35 | Precision click coordinate compensation |
| **Live Updates (ProgressStyle)** | Android 16+ (or compat) | API 35 | Ongoing notifications with hardware chronometers |
| **Background Remote Fetch** | Android 8.0 (API 26)+ | API 34 / 35 | Managed by WorkManager periodic sync |

---

## 🏗️ Architecture & Toolchain Support

### React Native New Architecture (TurboModules & Fabric)
- `react-native-live-widgets` is fully compatible with both the **Legacy Paper/Bridge** architecture and the **New Architecture** (enabled via `newArchEnabled=true` in `gradle.properties` / `ios/Podfile.properties.json`).
- Widget Extension processes run independently of the JS runtime, ensuring zero thread contention with Fabric rendering.

### Xcode & Swift 6 Strict Concurrency
- Fully compiled and tested with **Xcode 15** and **Xcode 16**.
- Native modules use `@MainActor` isolation and Sendable data models to ensure 100% compliance with Swift 6 strict concurrency checks.

### Expo & Bare React Native
- **Expo Managed Workflow:** Fully supported via config plugin (`app.plugin.js`). Requires `npx expo prebuild` or EAS Build (custom dev client).
- **Bare React Native:** Automated setup via `npx react-native-live-widgets init` which configures Xcode PBX targets, Info.plist, and AndroidManifest.xml.
