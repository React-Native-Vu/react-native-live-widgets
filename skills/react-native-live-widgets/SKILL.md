---
name: react-native-live-widgets
description: "Expert skill for building iOS Live Activities, Dynamic Island, and interactive Home Screen Widgets in React Native and Expo projects without writing native Swift or Kotlin code."
---

# React Native Live Widgets Skill 🚀

Use this skill whenever the user asks to create, update, or troubleshoot:
- **iOS Live Activities** (Lock Screen cards) & **Dynamic Island** (iPhone 14 Pro, 15, 16, 17+).
- **Home Screen Widgets** for iOS (`small`, `medium`, `large`) and Android (`AppWidgetProvider`).
- **Android Live Updates** (`Notification.ProgressStyle` on Android 8 -> Android 16).
- **Interactive Widgets** with in-place buttons (iOS 17+ `AppIntents` / Android `BroadcastReceiver`).
- **Expo Config Plugin** setup (`app.plugin.js`) and Continuous Native Generation (`npx expo prebuild`).

---

## 1. Project Detection & Setup Workflow

### Case A: Expo Project (`app.json` exists)
1. Install package:
   ```bash
   npx expo install react-native-live-widgets
   ```
2. Configure `app.json`:
   ```json
   {
     "expo": {
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
3. Run Continuous Native Generation:
   ```bash
   npx expo prebuild
   ```
4. Run the automated Scaffolder CLI:
   ```bash
   npx react-native-live-widgets init --group group.com.yourcompany.app
   ```
5. Test using Expo Dev Client:
   ```bash
   npx expo run:ios
   ```

### Case B: Bare React Native CLI
1. Install package:
   ```bash
   npm install react-native-live-widgets
   ```
2. Run automated CLI wizard:
   ```bash
   npx react-native-live-widgets init --group group.com.yourcompany.app
   ```
3. Launch:
   ```bash
   npx react-native run-ios
   ```

---

## 2. Declarative UI Component Reference (Dual Syntax: JSX & Functional)

You can construct widget trees using **EITHER JSX components** (`<VStack>`, `<HStack>`, `<Text>`, `<Button>`, `<Badge>`, `<Progress>`) **OR Functional calls** (`UI.VStack(...)`, `UI.HStack(...)`). Both compile to identical native trees! **NEVER manually write Swift or Kotlin views.**

### Layout Containers
- **Vertical Stack**: `<VStack padding={12} backgroundColor="#0F172A" borderRadius={12}>` or `UI.VStack(...)`
- **Horizontal Stack**: `<HStack spacing={10} alignment="center">` or `UI.HStack(...)`
- **Overlay Stack**: `<ZStack zAlignment="bottomTrailing">` or `UI.ZStack(...)`
- **Grid Layout**: `<Grid columns={2} columnSpacing={8} rowSpacing={8}>` or `UI.Grid(...)`
- **Divider Line**: `<Divider color="#334155" thickness={1} />` or `UI.Divider(...)`

### Content & Visuals
- **Text**: `<Text color="#FFFFFF" fontSize={16} fontWeight="bold" typography="headline" fontDesign="rounded" dynamicType={true}>Heading</Text>` or `UI.Text(...)`
- **Zero-Battery Hardware Clock**: `<Timer targetTimestamp={targetMs} mode="countdown" color="#38BDF8" fontSize={14} />` or `UI.Timer(...)`
- **Progress Indicator**: `<Progress style="segmented" segments={4} value={0.75} tintColor="#38BDF8" height={6} />` or `UI.Progress(...)`
- **Animated Waveform (Audio/Music)**: `<Equalizer isPlaying={true} barCount={4} tintColor="#38BDF8" height={14} />` or `UI.Equalizer(...)`
- **Images (URL, Base64, SF Symbol)**: `<Image url="https://..." width={40} height={40} borderRadius={20} />` or `UI.Image(...)`
- **KPI Gauge (240°)**: `<Gauge value={0.85} size={64} tintColor="#38BDF8" label="KPI" />` or `UI.Gauge(...)`

### Styling Modifiers (Gradients, Shadows, Borders, Dynamic Colors & RTL)
- **Linear Gradient**: `gradient={{ colors: ['#6366F1', '#EC4899'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } }}` (automatically falls back to `colors[0]` on legacy/unsupported targets).
- **Shadows**: `shadowColor="#000000" shadowRadius={8} shadowOpacity={0.25} shadowOffset={{ x: 0, y: 4 }}` (maps to iOS SwiftUI shadow and Android `setShadowLayer`/elevation).
- **Borders & Dashed Lines**: `borderWidth={1} borderColor="#38BDF8" borderStyle="dashed"` (`solid` | `dashed` | `dotted`).
- **Typography Presets**: `typography="title2" fontDesign="rounded"` (`largeTitle`, `title1`-`3`, `headline`, `subheadline`, `body`, `callout`, `footnote`, `caption1`-`2`).
- **Dynamic Type**: `dynamicType={true}` automatically scales font with OS Accessibility text size settings.
- **Light / Dark / Tinted Mode**: `backgroundColor={{ light: '#FFFFFF', dark: '#0F172A', tinted: '#1E293B' }}` (supports iOS 18 Tinted Home Screen & Android Material You).
- **RTL / Bi-directional Support**: `direction="rtl"` or `isRTL={true}` (automatically reverses row order and aligns text).
- **Accessibility & Semantics (Phase 1)**: `accessible={true}`, `accessibilityLabel="Label"`, `accessibilityHint="Hint"`, `accessibilityRole="button" | "header"`, `accessibilityValue="86%"`. (TalkBack on Android reads aggregated canvas summary + individual button hit-zones; VoiceOver on iOS maps to native traits).

### Interactivity & Preview
- **Button**: `<Button title="Approve" actionId="APPROVE_TASK" backgroundColor="#2563EB" gradient={{ colors: ['#2563EB', '#1D4ED8'] }} />` or `UI.Button(...)`
- **Interactive Toggles & Switches**: `<Switch label="DND Mode" actionId="toggle:dnd" checked={false} />` or `<Checkbox label="Task Completed" actionId="toggle:task_1" checked={true} />`
- **Badge**: `<Badge text="+18%" backgroundColor="#064E3B" textColor="#6EE7B7" />` or `UI.Badge(...)`
- **In-App Widget Preview**: `<WidgetPreview size="medium" showBadge interactiveSizeSwitch onAction={(id) => ...} />` (alias: `<VoltraWidgetPreview>`)

---

## 3. Runtime Capability Inspection & Graceful Fallbacks

Before rendering platform-specific visual features, inspect available capabilities programmatically:

```typescript
import { Widget } from 'react-native-live-widgets';

const caps = await Widget.getCapabilities();
console.log('Capabilities:', caps);
// Output:
// {
//   platform: 'ios' | 'android',
//   osVersion: '18.1',
//   supportsLiveActivities: true,
//   supportsDynamicIsland: true,
//   supportsInteractiveWidgets: true,
//   supportsGradients: true,
//   supportsShadows: true,
//   supportsTintedMode: true,
//   supportsAccessibility: true
// }
```

### UI Intermediate Representation & Renderer Planner (Phase 2):
```typescript
import { Widget, UI } from 'react-native-live-widgets';

// Inspect architectural classification (Native vs Canvas) and synthesized speech:
console.log(Widget.inspectIR(layout));

// Compile to pure IR AST:
const ir = Widget.compileIR(layout);
```

### Platform Capability & Graceful Fallback Matrix:
| Feature | iOS (WidgetKit / SwiftUI) | Android (RemoteViews / Canvas) | In-App Preview | Fallback Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Linear Gradients** | Full native `LinearGradient` | Native Canvas Shader | Full CSS / SVG / Solid | Solid background (`colors[0]`) |
| **Shadows** | Native `.shadow()` | `setShadowLayer` / Elevation | Native RN `shadow*` | Solid border / High-contrast border |
| **Dashed / Dotted Borders** | Native `StrokeStyle(dash:)` | `DashPathEffect` | Solid border (`borderStyle`) | Solid border line |
| **Dynamic Type** | Full native Dynamic Type | Responds to `fontScale` | System font size | Clamped standard pixel sizing |
| **Accessibility (TalkBack / VoiceOver)** | Native VoiceOver traits | A11y Summary + Hit-Zones | RN accessibility props | Aggregated `contentDescription` on canvas |
| **Tinted Mode** | iOS 18 Tinted Home Screen | Material You dynamic theme | Preview toggle | Uses `dark` or `light` theme color |
| **RTL Layout** | Native `layoutDirection` | Flow reversed (`row-reverse`) | `row-reverse` / `rtl` | Left-to-right default |

---

## 3. Standard Code Implementation Patterns

### Pattern A: Start Live Activity with Dynamic Island
```typescript
import { LiveActivity, UI } from 'react-native-live-widgets';

const activityId = await LiveActivity.start({
  activityName: 'DeliveryOrder',
  appGroup: 'group.com.yourcompany.app',
  layout: UI.VStack({
    padding: 16,
    backgroundColor: '#0F172A',
    children: [
      UI.Text('Order in Transit', { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }),
      UI.Progress({ style: 'bar', value: 0.7, tintColor: '#38BDF8', height: 6 }),
    ],
  }),
  dynamicIsland: {
    compactLeading: UI.Text('☕', { fontSize: 14 }),
    compactTrailing: UI.Text('12m', { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' }),
    minimal: UI.Text('☕', { fontSize: 12 }),
    expanded: {
      leading: UI.Text('COFFEE EXPRESS', { color: '#94A3B8', fontSize: 11 }),
      trailing: UI.Text('12 mins', { color: '#38BDF8', fontSize: 16, fontWeight: 'bold' }),
      bottom: UI.Progress({ style: 'bar', value: 0.7, tintColor: '#38BDF8', height: 6 }),
    },
  },
});
```

### Pattern B: Interactive Home Screen Widget with Two-Way Actions
```typescript
import { useEffect, useState } from 'react';
import { LiveActivity, Widget, UI, SharedStorage } from 'react-native-live-widgets';

const APP_GROUP = 'group.com.yourcompany.app';

export function useLiveWidgetCounter() {
  const [count, setCount] = useState(0);

  // Fast Refresh resilient hook for widget button interactions:
  useWidgetAction('INCREMENT', () => {
    setCount((prev) => {
      const next = prev + 1;
      renderWidget(next);
      return next;
    });
  });

  const renderWidget = (val: number) => {
    Widget.reload('main', {
      layout: UI.VStack({
        padding: 16,
        backgroundColor: '#0F172A',
        alignment: 'center',
        children: [
          UI.Text('LIVE COUNTER', { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' }),
          UI.Text(`${val}`, { color: '#38BDF8', fontSize: 36, fontWeight: 'heavy' }),
          UI.Button({
            title: '+1 INCREMENT',
            actionId: 'INCREMENT',
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
          }),
        ],
      }),
    });
  };
}
```

---

## 4. Critical Architecture Rules to Follow

1. **App Termination (Force-Kill)**:
   - When the iOS app is force-killed, JS runtime is terminated. Widget button taps are handled natively by Swift (`AppIntent`).
   - For mission-critical tasks (e.g. employee attendance check-ins, financial authorizations), store actions in `SharedStorage` (App Group queue) and process them upon app relaunch.
2. **Background Polling vs Server Push**:
   - `Widget.setRemoteConfig` schedules background API polling, but iOS enforces strict daily Widget Budgets (~40-70 reloads/day).
   - For real-time second-by-second updates, always prefer Server Push Notifications (APNs / FCM) with `LiveActivity.getAllPushTokens()`.
3. **Android Platform Parity**:
   - Android does not have hardware Dynamic Island; the library maps `dynamicIsland` to Android Ongoing Promoted Notifications (`Notification.ProgressStyle`).
