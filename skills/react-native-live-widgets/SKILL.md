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
- **Text**: `<Text color="#FFFFFF" fontSize={16} fontWeight="bold">Heading</Text>` or `UI.Text(...)`
- **Zero-Battery Hardware Clock**: `<Timer targetTimestamp={targetMs} mode="countdown" color="#38BDF8" fontSize={14} />` or `UI.Timer(...)`
- **Progress Indicator**: `<Progress style="segmented" segments={4} value={0.75} tintColor="#38BDF8" height={6} />` or `UI.Progress(...)`
- **Animated Waveform (Audio/Music)**: `<Equalizer isPlaying={true} barCount={4} tintColor="#38BDF8" height={14} />` or `UI.Equalizer(...)`
- **Images (URL, Base64, SF Symbol)**: `<Image url="https://..." width={40} height={40} borderRadius={20} />` or `UI.Image(...)`
- **KPI Gauge (240°)**: `<Gauge value={0.85} size={64} tintColor="#38BDF8" label="KPI" />` or `UI.Gauge(...)`

### Interactivity & Preview
- **Button**: `<Button title="Approve" actionId="APPROVE_TASK" backgroundColor="#2563EB" />` or `UI.Button(...)`
- **Badge**: `<Badge text="+18%" backgroundColor="#064E3B" textColor="#6EE7B7" />` or `UI.Badge(...)`
- **In-App Widget Preview**: `<WidgetPreview size="medium" showBadge interactiveSizeSwitch onAction={(id) => ...} />` (alias: `<VoltraWidgetPreview>`)

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
