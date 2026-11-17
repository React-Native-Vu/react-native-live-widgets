# react-native-live-widgets 🚀

<div align="center">

[![npm version](https://img.shields.io/npm/v/react-native-live-widgets.svg?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/react-native-live-widgets)
[![Expo Ready](https://img.shields.io/badge/Expo-Config%20Plugin-000020.svg?style=for-the-badge&logo=expo)](https://expo.dev)
[![Docs Site](https://img.shields.io/badge/Docs-Website-6366F1.svg?style=for-the-badge&logo=bookstack)](https://react-native-vu.github.io/react-native-live-widgets/)
[![llms.txt](https://img.shields.io/badge/llms.txt-Standard%20Ready-10B981.svg?style=for-the-badge)](https://react-native-vu.github.io/react-native-live-widgets/llms.txt)
[![Platforms](https://img.shields.io/badge/Platforms-iOS%2016.1+%20|%20Android%2016-orange.svg?style=for-the-badge)](https://github.com/React-Native-Vu/react-native-live-widgets)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**The Ultimate All-in-One Engine for Live Activities, Dynamic Island, and Interactive Home Screen Widgets in React Native & Expo.**

*Write 100% Declarative TypeScript. Render dynamically to Native SwiftUI (WidgetKit) & Android 2D Canvas without touching Xcode or Android Studio.*

[🌐 Docs Website](https://react-native-vu.github.io/react-native-live-widgets/) • [🤖 llms.txt](https://react-native-vu.github.io/react-native-live-widgets/llms.txt) • [🧠 AI Agent Skill](skills/react-native-live-widgets/SKILL.md) • [📖 English Guide](docs/GUIDE-EN.md) • [🇻🇳 Hướng dẫn Tiếng Việt](docs/GUIDE-VI.md) • [⚡ Expo Guide](docs/EXPO-GUIDE-VI.md) • [📱 Bare RN Demo](https://github.com/React-Native-Vu/LiveWidgetsExample) • [⚡ Expo Demo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)

---

</div>

## 📱 Live Demo Example Apps

Full, ready-to-run demo applications are available on GitHub for both architectures:

| Platform | Repository | Description |
| :--- | :--- | :--- |
| **⚛️ Bare React Native CLI** | 👉 **[React-Native-Vu/LiveWidgetsExample](https://github.com/React-Native-Vu/LiveWidgetsExample)** | Full Xcode Widget Extension & Android Studio setup |
| **🚀 Expo (SDK 58 / CNG)** | 👉 **[React-Native-Vu/LiveWidgetsExampleExpo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)** | Continuous Native Generation via Expo Config Plugin |

### ✨ Highlights of Both Demos:
- 🚀 **100% Pre-configured**: Xcode App Groups, `WidgetExtension`, and Android `AppWidgetProvider` ready out of the box.
- 🎨 **5 Real-world Presets**:
  1. **Executive KPI Dashboard**: Live sales sync, circular progress ring, and weekly chart.
  2. **Coffee Delivery Tracker**: Dynamic Island countdown and delivery driver status.
  3. **Interactive Task Checklist**: Check off items right from your Home Screen without opening the app.
  4. **Music & Audio Player**: Dynamic Island equalizer animation and lock screen media style.
  5. **Flight Status**: Real-time gate, departure time, and airport progress bar.
- 🔄 **Bidirectional Real-Time Sync**: Instant state updates between Main App and WidgetKit.

#### 1. Clone & Run Bare React Native Demo:
```bash
git clone https://github.com/React-Native-Vu/LiveWidgetsExample.git
cd LiveWidgetsExample && npm install
npx react-native run-ios # or npx react-native run-android
```

#### 2. Clone & Run Expo Demo:
```bash
git clone https://github.com/React-Native-Vu/LiveWidgetsExampleExpo.git
cd LiveWidgetsExampleExpo && npm install
npx expo prebuild
npx expo run:ios # or npx expo run:android
```

---

## 📸 Showcase & Demos

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <b>🏝️ Dynamic Island Expanded & KPI Dashboard</b><br/><br/>
        <img src="assets/dynamic_island_expanded.png" alt="Dynamic Island Expanded" width="380" />
      </td>
      <td width="50%" align="center">
        <b>📱 Interactive Home Screen Widget (iOS)</b><br/><br/>
        <img src="assets/home_widget_interactive.png" alt="Home Screen Widget Interactive" width="380" />
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <b>🔒 Lock Screen Live Activity & Gauges</b><br/><br/>
        <img src="assets/lock_screen_live_activity.png" alt="Lock Screen Live Activity" width="380" />
      </td>
      <td width="50%" align="center">
        <b>🤖 100% Feature Parity (Android & iOS)</b><br/><br/>
        <img src="assets/cross_platform_parity.png" alt="Cross Platform Parity" width="380" />
      </td>
    </tr>
  </table>
</div>

---

## 💡 Why `react-native-live-widgets`?

Until now, adding **Live Activities** or **Home Screen Widgets** to a React Native app required writing hundreds of lines of complex Swift, SwiftUI, and Kotlin code, managing App Groups, Darwin notifications, and separate native target builds.

`react-native-live-widgets` solves this with a **Declarative TypeScript UI DSL**:
- 🚫 **No SwiftUI / Kotlin coding required** for custom screens.
- 🎨 **Dual UI Syntax**: Choose between **React JSX/TSX (`<VStack>`, `<Text>`, `<Button>`)** or **Functional DSL (`UI.VStack(...)`)**.
- 📱 **In-App Widget Preview (`<WidgetPreview>`)**: Preview and test widget interactions directly on your app screen.
- 🚀 **Full Expo & EAS Build Support** via automated Expo Config Plugin (`app.plugin.js`).
- ⚡ **Interactive Buttons**: Tap buttons on the Home Screen Widget to run native Swift extensions or wake up TypeScript handlers.
- 🔄 **Realtime Data Sync (`SharedStorage`)**: Single source of truth across Main App, Lock Screen, and Home Screen.
- 🌐 **Silent Background Remote API Sync**: Automatically fetch REST APIs and update Widgets even when the App is **Force-Killed**.
- 🤖 **Android Parity**: Supports Android 16+ Promoted Live Notifications and Home Screen AppWidgets.

---

## ✨ Key Features

### 1. 🏝️ Dynamic Island & Lock Screen Live Activities (iOS 16.1+)
- **All Dynamic Island Modes**: `compactLeading`, `compactTrailing`, `minimal`, and `expanded`.
- **Realtime Timers & Progress**: Countdown timers, segmented progress bars, and battery/progress rings with zero battery drain.
- **Smart Dismissal Policies**: `immediate`, `afterDate`, or `default`.

### 2. 📱 Interactive Home Screen Widgets (iOS WidgetKit & Android AppWidget)
- Supports **Small**, **Medium**, and **Large** widget families.
- **Multi-page & Tabs**: Switch tabs or carousel pages directly on the widget (`actionId: "page:next"`).
- **Checklist & Toggles**: Toggle checkboxes and switch states without opening the app (`actionId: "toggle:<key>"`).
- **Dark & Light Mode**: Declarative color tokens `{ light: '#FFF', dark: '#0F172A' }`.

### 3. ⚡ React Hooks & Fast Refresh Resilient
- **`useWidgetAction(actionId, callback)`**: Automatically registers and cleans up widget button tap listeners on unmount. 100% resilient to React Native Fast Refresh / Hot Reloading!
  ```tsx
  useWidgetAction('action_checkin', async (payload) => {
    console.log('Action triggered from Home Screen Widget:', payload);
  });
  ```
- **`useLiveActivity()`**: Track activity state, push tokens, and control start / update / end directly in React components.
- **`useWidgetState(key, initialValue)`**: Synchronize local component state with Widget Shared Storage and trigger instant OS re-renders.

### 4. ⚡ Bi-directional Action Dispatcher (TypeScript + Native)
- Imperative action registration for background services:
  ```ts
  LiveActivity.registerAction('action_checkin', async (payload) => {
    console.log('Action triggered:', payload);
  });
  // Or listen globally to all widget actions:
  Widget.onWidgetAction((actionId, payload) => {
    console.log(`Action ${actionId} received`, payload);
  });
  ```
- **App-Killed Background Support**:
  - **Android**: Supports `LiveActivity.registerBackgroundActionHandler()` via Headless JS tasks and instant native state persistence in `DynamicWidgetStateStore`.
  - **iOS**: Apple sandboxes widget extensions when the main app is force-killed. Button taps update native App Group state directly; JavaScript callbacks resume automatically when the app is reopened.

### 5. 🌐 Background Remote API Sync (Zero Code Backend)
- Configure an API endpoint with `Widget.setRemoteConfig`:
  ```ts
  await Widget.setRemoteConfig('main', {
    url: 'https://api.yourcompany.com/v1/shifts/current',
    method: 'GET',
    refreshIntervalMinutes: 15
  }, APP_GROUP);
  ```
- The native Extension fetches fresh JSON and dynamically replaces `{{variables}}` in your widget layout in the background.

### 6. 🔔 APNs & FCM Token Management
- One-call retrieval for all push tokens:
  ```ts
  const tokens = await LiveActivity.getAllPushTokens();
  // tokens.devicePushToken
  // tokens.pushToStartToken (iOS 17.2+)
  // tokens.activityUpdateToken
  ```

### 7. 🎨 Advanced Styling Modifiers & Platform Capability Matrix

Build deep, rich widgets with design system foundations across both platforms:

- **🌈 Gradients**: Linear and radial gradients on Containers, Cards, and Buttons:
  ```tsx
  <VStack gradient={{ colors: ['#1E3A8A', '#3B82F6'], angle: 90 }} padding={14}>
  ```
- **🔲 Borders & Dashed Lines**: Full control over width, color, and stroke styles (`'solid' | 'dashed' | 'dotted'`).
- **🌑 Shadows & Depth**: Elevate cards with `shadowColor`, `shadowRadius`, `shadowOpacity`, and `shadowOffset`.
- **🔤 Typography & Dynamic Type**: Semantic scale (`largeTitle`, `title`, `headline`, `subheadline`, `body`, `caption`, `footnote`) with auto-scaling for OS Accessibility font sizes.
- **🌗 Light, Dark & Tinted Mode**: Support for iOS 18 Tinted Home Screen icons and Android Material You dynamic coloring via `{ light: '#FFF', dark: '#0F172A', tinted: '#38BDF8' }`.
- **🌍 RTL Internationalization**: Automatic reverse row alignment (`direction: 'rtl'` or `isRTL: true`) for Arabic, Hebrew, and other RTL locales.
- **♿ Accessibility & Semantics**: First-class TalkBack & VoiceOver support via `accessible`, `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, and `accessibilityValue`. Android Canvas generates an aggregated semantic summary on the canvas and individual `contentDescription` on interactive hit-zones.

#### 📊 Platform Capability & Fallback Matrix

Rather than making unverified claims of "100% parity", the engine provides an explicit, transparent capability matrix paired with automatic **Graceful Fallbacks**:

| Feature / Modifier | iOS WidgetKit | iOS Live Activity | Android Ongoing Notification | Android Home Widget | Graceful Fallback Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Declarative Layouts (`VStack`/`HStack`/`Grid`)** | ✅ Native | ✅ Native | ✅ Canvas | ✅ 2D Canvas | 100% pixel-aligned across all platforms |
| **Accessibility (TalkBack / VoiceOver)** | ✅ Native VoiceOver | ✅ Native VoiceOver | ✅ Notification Text | ✅ A11y Summary + Hit-Zones | Aggregated `contentDescription` ensures full screen-reader readability |
| **Linear / Radial Gradients** | ✅ SwiftUI | ✅ SwiftUI | ✅ Shader | ✅ Shader | Automatically falls back to dominant solid `backgroundColor` |
| **Card & Text Shadows** | ✅ SwiftUI | ✅ SwiftUI | ⚠️ Text Only | ✅ `setShadowLayer` | Falls back to elevation or thin border stroke |
| **Dashed / Dotted Borders** | ✅ StrokeStyle | ✅ StrokeStyle | ⚠️ Solid | ✅ `DashPathEffect` | Automatically falls back to solid border |
| **Dynamic Type (Accessibility)** | ✅ Native | ✅ Native | ✅ `fontScale` | ✅ `fontScale` | Preserves accessibility scale factor across devices |
| **RTL Layout Mirroring** | ✅ Native | ✅ Native | ✅ RTL | ✅ RTL | Reverses flex order and flips text alignment |
| **iOS 18 Tinted Mode** | ✅ Accentable | N/A | N/A | ✅ Material You | Resolves `tinted` key on iOS 18; falls back to dark/light color |
| **Interactive Background Intents** | ✅ iOS 17+ | ✅ iOS 17+ | ✅ Native Intent | ✅ Native Intent | Updates local Shared Storage and refreshes timeline |

#### 🔍 Checking Runtime Capabilities Programmatically
```ts
const caps = await Widget.getCapabilities();
if (caps.supportsGradients) {
  console.log('Device supports native gradients!');
}
```

---

## ⚡ Quick Start

### 1. Installation

```bash
# React Native CLI
npm install react-native-live-widgets

# Expo (Managed or Bare)
npx expo install react-native-live-widgets
```

---

### 2. Configuration

#### A. If using Expo (Config Plugin)

Add `react-native-live-widgets` to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "name": "My Expo App",
    "plugins": [
      [
        "react-native-live-widgets",
        {
          "appGroup": "group.com.yourcompany.app",
          "enableLiveActivities": true,
          "frequentUpdates": true
        }
      ]
    ]
  }
}
```

Then generate native projects or run with Expo Dev Client:

```bash
# 1. Generate native folders
npx expo prebuild

# 2. Automatically scaffold & link Xcode Widget Extension target
npx react-native-live-widgets init --group group.com.yourcompany.app

# 3. Run on iOS Simulator & Android Emulator:
npx expo run:ios
npx expo run:android
```

> 📖 **Detailed Step-by-Step Expo Guide**: [English](docs/EXPO-GUIDE-EN.md) • [Tiếng Việt](docs/EXPO-GUIDE-VI.md)

#### B. If using Bare React Native CLI

Run the automated scaffolding script in your React Native project root:

```bash
npx react-native-live-widgets init --group group.com.yourcompany.app
```

This will automatically:
- Inject `NSSupportsLiveActivities` and `NSSupportsLiveActivitiesFrequentUpdates` into `Info.plist`.
- Scaffold the `LiveWidgetsExtension` bundle in your `ios/` folder.
- Configure `AndroidManifest.xml` with required notification permissions.

And install CocoaPods dependencies:

```bash
cd ios && pod install
```

---

## 💻 Code Example

### 1. Start a Live Activity with Dynamic Island

```tsx
import { UI, LiveActivity } from 'react-native-live-widgets';

await LiveActivity.start({
  activityId: 'kpi_q4_2026',
  dynamicIsland: {
    compactLeading: UI.Text('KPI Q4', { color: '#38BDF8', fontWeight: 'bold' }),
    compactTrailing: UI.Text('86%', { color: '#10B981', fontWeight: 'bold' }),
    minimal: UI.Text('86%', { color: '#10B981' }),
    expanded: UI.VStack(
      { padding: 14, spacing: 8, backgroundColor: '#0F172A' },
      UI.HStack(
        { justifyContent: 'spaceBetween' },
        UI.Text('BẢNG ĐIỀU HÀNH KPI', { fontSize: 11, color: '#94A3B8' }),
        UI.Badge({ text: '86% Hoàn thành', backgroundColor: '#064E3B', textColor: '#6EE7B7' })
      ),
      UI.Text('Mục tiêu Q4/2026', { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }),
      UI.Progress({
        style: 'bar',
        value: 0.86,
        tintColor: '#10B981',
        trackColor: '#334155'
      }),
      UI.Text('Doanh số 12.8 tỷ / 15 tỷ VNĐ • Tăng trưởng +22%', { fontSize: 12, color: '#94A3B8' })
    )
  },
  lockScreen: UI.VStack(
    { padding: 16, backgroundColor: '#0F172A', borderRadius: 16 },
    UI.HStack(
      { justifyContent: 'spaceBetween' },
      UI.Text('KPI Quý 4: Đạt 86% mục tiêu', { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }),
      UI.Badge({ text: '+18%', backgroundColor: '#064E3B', textColor: '#6EE7B7' })
    ),
    UI.Progress({
      style: 'segmented',
      segments: 7,
      currentSegment: 6,
      tintColor: '#38BDF8',
      trackColor: '#1E293B'
    })
  )
});
```

### 2. Configure Home Screen Widget with Live Sync

```tsx
import { UI, Widget, SharedStorage } from 'react-native-live-widgets';

const APP_GROUP = 'group.com.yourcompany.app';

// Set shared data
await SharedStorage.set('kpi_percent', '86', APP_GROUP);
await SharedStorage.set('revenue_month', '4.85 Tỷ đ', APP_GROUP);

// Build Declarative Layout
await Widget.setLayout('main', {
  large: UI.VStack(
    { padding: 16, backgroundColor: '#0B132B', borderRadius: 20 },
    UI.HStack(
      { justifyContent: 'spaceBetween' },
      UI.Text('TỔNG QUAN ĐIỀU HÀNH (KPI & BIỂU ĐỒ)', { fontSize: 11, color: '#38BDF8', fontWeight: 'bold' }),
      UI.Badge({ text: 'LIVE SYNC', backgroundColor: '#064E3B', textColor: '#6EE7B7' })
    ),
    UI.HStack(
      { spacing: 12, marginTop: 10 },
      UI.VStack(
        { width: 90, alignItems: 'center' },
        UI.Progress({ style: 'circular', value: 0.86, tintColor: '#38BDF8', trackColor: '#1E293B' }),
        UI.Text('86%', { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }),
        UI.Text('KPI Quý', { fontSize: 10, color: '#94A3B8' })
      )
    ),
    UI.Spacer(),
    UI.Button('Duyệt báo cáo doanh thu tuần', {
      actionId: 'action_approve_report',
      backgroundColor: '#1E293B',
      textColor: '#FFFFFF'
    })
  )
}, APP_GROUP);

await Widget.reloadAll();
```

### 3. Build Widgets with React JSX / TSX Syntax

Prefer JSX over nested functions? Build layouts using clean, declarative JSX with full `style` prop & array flattening support:

```tsx
import { Widget, VStack, HStack, Text, Badge, Progress, Button } from 'react-native-live-widgets';

await Widget.setLayout('main', {
  medium: (
    <VStack padding={16} backgroundColor="#0F172A" borderRadius={16}>
      <HStack justifyContent="spaceBetween">
        <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Vào ca sáng</Text>
        <Badge text="07:54 (Hợp lệ)" backgroundColor="#064E3B" textColor="#6EE7B7" />
      </HStack>
      <Progress value={0.75} style="segmented" segments={4} tintColor="#38BDF8" height={8} />
      <Button title="Làm mới dữ liệu" actionId="refresh" fullWidth />
    </VStack>
  )
});
```

### 4. In-App Live Widget Preview (`<WidgetPreview>` / `<VoltraWidgetPreview>`)

Test and preview widgets directly inside your app screens with pixel-accurate OS container frames and real-time button clicks:

```tsx
import { WidgetPreview, VStack, HStack, Text, Button } from 'react-native-live-widgets';

export function WidgetDemoScreen() {
  return (
    <WidgetPreview
      size="medium" // 'small' | 'medium' | 'large' | 'lockScreen'
      showBadge={true}
      interactiveSizeSwitch={true} // Quick tabs to test small / medium / large
      onAction={(actionId) => console.log('Tapped action:', actionId)}
    >
      <VStack padding={16} backgroundColor="#0F172A" borderRadius={20}>
        <HStack justifyContent="spaceBetween">
          <Text fontSize={14} fontWeight="bold" color="#FFFFFF">KPI Tuần</Text>
          <Text fontSize={12} color="#38BDF8">86%</Text>
        </HStack>
        <Button title="Check-in ngay" actionId="checkin" fullWidth />
      </VStack>
    </WidgetPreview>
  );
}
```

---

## 📊 Platform Feature Parity Matrix

| Feature | iOS 16.1+ | Android (API 24 - 36) |
| :--- | :---: | :---: |
| **Declarative UI Engine (`UI.*`)** | SwiftUI dynamic tree | High-DPI Canvas 2D Bitmap |
| **Dynamic Island (All 4 layouts)** | ✅ Supported | 🔄 Mapped to Promoted Ongoing (Android 16+) |
| **Lock Screen Live Activity** | ✅ Supported | ✅ Ongoing Rich Notification |
| **Home Screen Widgets** | Small, Medium, Large | Resizable Grid AppWidgets |
| **Interactive Buttons** | iOS 17+ AppIntents | RemoteViews PendingIntent |
| **SharedStorage Data Sync** | App Group UserDefaults | Context SharedPreferences |
| **Remote API Silent Sync** | Background Timeline URLSession | WorkManager / Background Fetch |
| **Push Remote Updates** | Apple APNs Activity Tokens | Firebase Cloud Messaging (FCM) |
| **Expo & EAS Build Ready** | ✅ Automated Config Plugin | ✅ Automated Config Plugin |

---

## ☕ Sponsor & Donate (Ủng hộ tác giả)

`react-native-live-widgets` là dự án mã nguồn mở **hoàn toàn miễn phí (100% Free & MIT License)**, được phát triển và duy trì với tâm huyết mang lại giải pháp Live Activities & Widgets tốt nhất cho cộng đồng React Native Việt Nam và quốc tế.

Nếu thư viện này giúp ích cho dự án hoặc công ty của bạn, bạn có thể **mời tác giả một tách cà phê** để tiếp thêm động lực phát triển thêm nhiều tính năng mới nhé! ☕❤️

<div align="center">

<img src="assets/donate_qr.png" alt="Donate qua VietQR VPBank" width="300" style="border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />

### 🏦 Thông tin chuyển khoản ủng hộ:
- **Ngân hàng**: VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)
- **Số tài khoản / Số điện thoại**: `0906472426`
- **Chủ tài khoản**: `TRAN LE VU`
- **Nội dung**: `LiveWidgets Support` hoặc lời nhắn của bạn

*Chân thành cảm ơn sự đồng hành và ủng hộ quý báu của bạn!* 🙏✨

</div>

---

## 📚 Documentation & Guides

- 📱 **[LiveWidgetsExample Demo Project](https://github.com/React-Native-Vu/LiveWidgetsExample)**: Complete working sample app demonstrating all 5 presets with bidirectional sync on iOS & Android.
- 🇬🇧 **[Full English Developer Guide](docs/GUIDE-EN.md)**: Architecture, DSL specs, push notification server configuration, and best practices.
- 🇻🇳 **[Hướng dẫn Chi tiết bằng Tiếng Việt](docs/GUIDE-VI.md)**: Hướng dẫn tích hợp từng bước, thiết lập App Group, giải quyết lỗi thường gặp.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue on [GitHub Repository](https://github.com/React-Native-Vu/react-native-live-widgets).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

Developed with ❤️ by **vu-tran** for high-performance React Native & Expo applications.
