# EXPO INTEGRATION & USAGE GUIDE FOR REACT-NATIVE-LIVE-WIDGETS 🚀

> 🌐 **Language:** **English** • [🇻🇳 Hướng dẫn Tiếng Việt (EXPO-GUIDE-VI.md)](./EXPO-GUIDE-VI.md) • [📖 Bare RN Guide (GUIDE-EN.md)](./GUIDE-EN.md) • [⚡ Expo Live Demo Repository](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo) • [🌐 Web Docs (Live Simulator)](https://react-native-vu.github.io/react-native-live-widgets/)

This guide provides a comprehensive walkthrough for integrating **`react-native-live-widgets`** into **Expo (SDK 50, 51, 52, 58+)** projects — covering Expo Config Plugins, automatic iOS WidgetKit/ActivityKit configuration, local testing via Expo Dev Client, and production cloud builds with **EAS Build**.

---

## TABLE OF CONTENTS
1. [Understanding Expo & Native Widgets Architecture](#1-understanding-expo--native-widgets-architecture)
2. [Official Expo Demo Repository (LiveWidgetsExampleExpo)](#2-official-expo-demo-repository-livewidgetsexampleexpo)
3. [Step-by-Step Installation & Setup](#3-step-by-step-installation--setup)
   - [Step 1: Install Package](#step-1-install-package)
   - [Step 2: Configure app.json (Expo Config Plugin)](#step-2-configure-appjson-expo-config-plugin)
   - [Step 3: Run Expo Prebuild](#step-3-run-expo-prebuild)
   - [Step 4: Run CLI Wizard for Widget Extension](#step-4-run-cli-wizard-for-widget-extension)
4. [Running & Testing on Simulators & Devices](#4-running--testing-on-simulators--devices)
   - [Run on iOS Simulator](#run-on-ios-simulator)
   - [Run on Android Emulator](#run-on-android-emulator)
   - [Adding Home Widgets and Live Activities on Simulator](#adding-home-widgets-and-live-activities-on-simulator)
5. [EAS Build Configuration (Expo Application Services)](#5-eas-build-configuration-expo-application-services)
   - [Register App Groups & Extension on Apple Developer](#register-app-groups--extension-on-apple-developer)
   - [Configure eas.json](#configure-easjson)
   - [Provisioning Profiles for Extension](#provisioning-profiles-for-extension)
6. [TypeScript Example for Expo (Widgets & Live Activity)](#6-typescript-example-for-expo-widgets--live-activity)
7. [Troubleshooting Common Expo Issues](#7-troubleshooting-common-expo-issues)

---

## 1. Understanding Expo & Native Widgets Architecture

### ⚠️ Why Expo Go is Not Supported
- **Expo Go** is a pre-compiled native binary containing a fixed set of Expo runtime modules.
- iOS **WidgetKit** (Home Screen Widgets) and **ActivityKit** (Live Activities & Dynamic Island) require an independent, dedicated native process called an **App Extension Target (`.appex`)**.
- Android similarly requires custom `AppWidgetProvider` declarations and services in `AndroidManifest.xml`.
- Therefore, **Expo Go cannot run native widgets**. You must use **Expo Prebuild / Expo Dev Client (`npx expo run:ios` / `npx expo run:android`)** or **EAS Build**.

### 🌟 The Solution: Expo Config Plugin & Continuous Native Generation (CNG)
`react-native-live-widgets` includes a turnkey **Expo Config Plugin (`app.plugin.js`)** and **CLI Wizard**:
- Automatically injects `NSSupportsLiveActivities` and `NSSupportsLiveActivitiesFrequentUpdates` into `Info.plist`.
- Automatically configures `com.apple.security.application-groups` in your iOS Entitlements file.
- Adds real-time notification permissions (`POST_NOTIFICATIONS`) to Android.
- Automatically scaffolds and injects the Xcode `LiveWidgetsExtension` target with Swift templates and renderers **without manually opening Xcode**.

---

## 2. Official Expo Demo Repository (LiveWidgetsExampleExpo)

To explore a 100% pre-configured, production-ready Expo showcase project, visit the official demo repository:

👉 **GitHub Repository:** **[https://github.com/React-Native-Vu/LiveWidgetsExampleExpo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)**

### ✨ What’s Inside the Demo:
- 🚀 **Expo SDK 58 + React Native 0.88 + 100% TypeScript**.
- 🛠️ **Pre-configured Expo Config Plugin**: App Groups `group.com.reactnativevu.livewidgetsexampleexpo`.
- 🎨 **5 Real-World UI Presets**:
  1. **📊 Executive KPI Dashboard**: Circular progress, weekly sales chart, and live syncing.
  2. **☕ Coffee Delivery Tracker**: Dynamic Island countdown and lock screen order card.
  3. **✅ Interactive Task Checklist**: Direct check-off interaction on your Home Screen widget without opening the app.
  4. **🎵 Music & Audio Player**: Continuous animated audio waveform (Equalizer) on Dynamic Island.
  5. **✈️ Flight Status**: Route trajectory bar, gate details, and departure countdown.
- 🔄 **Bidirectional Action Dispatcher**: Tapping `[+]` or `[-]` on Home Screen widgets executes TypeScript callbacks in your app in real-time.

### ⚡ Clone & Run in Under 2 Minutes:
```bash
# 1. Clone the repository
git clone https://github.com/React-Native-Vu/LiveWidgetsExampleExpo.git
cd LiveWidgetsExampleExpo

# 2. Install dependencies
npm install

# 3. Generate native folders
npx expo prebuild

# 4. Run automated widget target injection
npm run setup:widgets

# 5. Launch on iOS Simulator or Android Emulator
npx expo run:ios
# or
npx expo run:android
```

---

## 3. Step-by-Step Installation & Setup

### Fastest Method: 100% Automated 1-Command Setup

```bash
# 1. Install package
npx expo install react-native-live-widgets

# 2. Automated one-command setup (auto-injects Config Plugin, creates widgets.config.ts, syncs icons & Swift)
npx react-native-live-widgets init

# 3. Launch on Simulator / Emulator
npx expo run:ios
# or: npx expo run:android
```

---

### Manual Workflow (If you prefer configuring by hand)

#### Step 1: Install Package
In your Expo project root:
```bash
npx expo install react-native-live-widgets
```

---

#### Step 2: Configure `app.json` (Expo Config Plugin)
Open `app.json` and add the `react-native-live-widgets` plugin under `expo.plugins`:

```json
{
  "expo": {
    "name": "MyExpoApp",
    "slug": "my-expo-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myexpoapp",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.myexpoapp"
    },
    "plugins": [
      [
        "react-native-live-widgets",
        {
          "appGroup": "group.com.yourcompany.myexpoapp",
          "enableLiveActivities": true,
          "frequentUpdates": true
        }
      ]
    ]
  }
}
```

#### Plugin Options Reference:
| Property | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `appGroup` | `string` | **Yes** | `group.<bundleId>` | App Group identifier for instant data sharing between Main App and WidgetKit |
| `enableLiveActivities` | `boolean` | No | `true` | Enables Live Activities on Lock Screen and Dynamic Island |
| `frequentUpdates` | `boolean` | No | `true` | Enables high-frequency push updates (iOS 16.2+) |

---

### Step 3: Run Expo Prebuild
Generate clean native folders (`ios/` and `android/`):
```bash
npx expo prebuild
```

---

### Step 4: Run CLI Wizard for Widget Extension
Run the library's automated setup wizard to link the extension target:
```bash
npx react-native-live-widgets init --group group.com.yourcompany.myexpoapp
```

**What the CLI Wizard does automatically:**
1. Configures the App Group into `<AppName>.entitlements`.
2. Generates the `ios/LiveWidgetsExtension/` directory containing:
   - `LiveWidgetsBundle.swift` (with 5 built-in interactive widget presets).
   - `Info.plist` (for Extension).
   - `LiveWidgetsExtension.entitlements` (for Extension).
   - Copies Swift models, layout engines, and UI renderers into `Shared/`.
3. Injects the `LiveWidgetsExtension` target into Xcode's `project.pbxproj`:
   - Dedicated `PBXSourcesBuildPhase` (preventing `@main` duplicate errors with `AppDelegate.swift`).
   - Links `WidgetKit.framework` and `SwiftUI.framework`.
   - Sets deployment target to iOS 16.4+.
   - Adds the target dependency under `Embed App Extensions`.
4. Adds the pod dependency to `Podfile` and executes `pod install`.
5. Injects required Android permissions into `AndroidManifest.xml`.

> [!TIP]
> Add a shortcut to your `package.json` for quick maintenance:
> ```json
> "scripts": {
>   "setup:widgets": "npx react-native-live-widgets init --group group.com.yourcompany.myexpoapp"
> }
> ```

---

## 3. Running & Testing on Simulators & Devices

### Run on iOS Simulator
```bash
npx expo run:ios
```
> [!IMPORTANT]
> - Dynamic Island testing requires a simulated device with a Dynamic Island (e.g., **iPhone 14 Pro, iPhone 15, iPhone 16, or iPhone 17**).
> - Live Activities require iOS 16.1+.

### Run on Android Emulator
```bash
npx expo run:android
```

---

### Adding Home Widgets and Live Activities on Simulator

#### 1. Add Home Screen Widget on iOS Simulator:
1. Press `Cmd + Shift + H` to return to the iOS Home Screen.
2. Long-press an empty space until the app icons begin to jiggle.
3. Tap the **[+]** button in the top-left corner.
4. Search for your app name (e.g., `LiveWidgetsExampleExpo`).
5. Choose any of the 5 available widget templates and tap **Add Widget**.

#### 2. Start Live Activity & Dynamic Island:
- Open your app and tap **"Start Live Activity"**.
- Lock the screen (`Cmd + L`) or swipe down from the top to view the Lock Screen card and Dynamic Island expanded banner!

---

## 4. EAS Build Configuration (Expo Application Services)

### Register App Groups & Extension on Apple Developer
1. Go to [Apple Developer Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. **App Groups**:
   - Create an App Group identifier (e.g., `group.com.yourcompany.myexpoapp`).
3. **App Identifiers**:
   - Edit your Main App ID (`com.yourcompany.myexpoapp`) -> Enable **App Groups** (link the group) -> Enable **Live Activities**.
   - Create a second App ID for the Extension:
     - **Identifier:** `com.yourcompany.myexpoapp.LiveWidgetsExtension`
     - Enable **App Groups** and link to the same group.

---

### Configure `eas.json`
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

### Provisioning Profiles for Extension
When executing EAS Build:
```bash
eas build --platform ios --profile production
```
EAS CLI detects the auxiliary `LiveWidgetsExtension` target in Xcode and prompts you to generate and manage its provisioning profile:
- Select **Yes** to let EAS automate credentials for both Main App and Extension.

---

## 5. TypeScript Example for Expo (Widgets & Live Activity)

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  LiveActivity,
  Widget,
  UI,
  SharedStorage,
} from 'react-native-live-widgets';

const APP_GROUP = 'group.com.yourcompany.myexpoapp';

export default function App() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    SharedStorage.setAppGroup(APP_GROUP);

    // Two-way interactive action handler from Widget buttons
    const unsubscribe = LiveActivity.registerActionHandler((action, payload) => {
      console.log('Action received from Widget:', action, payload);
      if (action === 'INCREMENT') {
        setCounter((prev) => {
          const next = prev + 1;
          updateWidget(next);
          return next;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const updateWidget = (val: number) => {
    Widget.reload('main', {
      layout: UI.VStack({
        alignment: 'center',
        padding: 16,
        background: '#0F172A',
        children: [
          UI.Text('EXPO WIDGET COUNTER', { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' }),
          UI.Text(`${val}`, { color: '#38BDF8', fontSize: 40, fontWeight: 'heavy' }),
          UI.Button('+1 INCREMENT', {
            action: 'INCREMENT',
            backgroundColor: '#0284C7',
            textColor: '#FFFFFF',
          }),
        ],
      }),
    });
  };

  const startLiveActivity = async () => {
    await LiveActivity.start({
      activityName: 'ExpoTask',
      appGroup: APP_GROUP,
      layout: UI.VStack({
        padding: 16,
        background: '#020617',
        children: [
          UI.Text('🚀 Live Activity from Expo SDK!', { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }),
          UI.Progress(0.8, { style: 'bar', tintColor: '#38BDF8', height: 6 }),
        ],
      }),
      dynamicIsland: {
        compactLeading: UI.Text('🚀', { fontSize: 14 }),
        compactTrailing: UI.Text('80%', { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' }),
        expanded: {
          leading: UI.Text('EXPO LIVE', { color: '#94A3B8', fontSize: 11 }),
          trailing: UI.Text('80%', { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' }),
          center: UI.Progress(0.8, { style: 'bar', tintColor: '#38BDF8', height: 6 }),
        },
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Live Widgets Demo</Text>
      <Text style={styles.counter}>Count: {counter}</Text>

      <TouchableOpacity style={styles.btn} onPress={() => updateWidget(counter + 1)}>
        <Text style={styles.btnText}>Update Home Widget</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btnLive]} onPress={startLiveActivity}>
        <Text style={styles.btnText}>Start Live Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  counter: { fontSize: 18, color: '#38BDF8', marginBottom: 24 },
  btn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginVertical: 8, width: '100%', alignItems: 'center' },
  btnLive: { backgroundColor: '#059669' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
```

---

## 6. Troubleshooting Common Expo Issues

### 1. `[react-native-live-widgets] Native module not found`
- **Cause:** Running via **Expo Go**.
- **Fix:** Native widgets require custom native binaries. Run `npx expo prebuild` and start using `npx expo run:ios` or `npx expo run:android`.

### 2. `client is not entitled` error in logs
- **Cause:** Missing App Group entitlement.
- **Fix:** Ensure both `<AppName>.entitlements` and `LiveWidgetsExtension.entitlements` contain `com.apple.security.application-groups` with identical App Group names.

### 3. `'main' attribute can only apply to one type in a module`
- **Cause:** `LiveWidgetsBundle.swift` got attached to the main app target instead of the extension target.
- **Fix:** Run the latest `npx react-native-live-widgets init` wizard which properly isolates target build phases.

### 4. Metro Bundler: `Unable to resolve module react-native/asset-registry`
- **Cause:** Metro hierarchical lookup resolving conflicting packages in monorepos or local `file:...` dependencies.
- **Fix:** Configure `metro.config.js`:
  ```javascript
  const { getDefaultConfig } = require('expo/metro-config');
  const path = require('path');

  const config = getDefaultConfig(__dirname);
  config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
  ];
  config.resolver.disableHierarchicalLookup = true;

  module.exports = config;
  ```

---

## 7. Resources & Links
- ⚡ **Full Expo Demo App:** [LiveWidgetsExampleExpo on GitHub](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)
- ⚛️ **Bare React Native Demo:** [LiveWidgetsExample on GitHub](https://github.com/React-Native-Vu/LiveWidgetsExample)
- 📖 **Full English Guide:** [GUIDE-EN.md](./GUIDE-EN.md)
- 🇻🇳 **Hướng dẫn Tiếng Việt:** [GUIDE-VI.md](./GUIDE-VI.md)
