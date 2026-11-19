# 📱 Live Activities & Dynamic Island Guide

Complete guide to starting, updating, and managing iOS Live Activities and Dynamic Island presentations with **`react-native-live-widgets`**.

---

## 🌟 Overview

iOS Live Activities display glanceable, real-time information on the Lock Screen and in the Dynamic Island (iPhone 14 Pro and later).

With `react-native-live-widgets`, you define the layout in standard TypeScript/JSX, and the native bridge handles ActivityKit lifecycle management without writing Swift.

---

## ⚙️ Prerequisites

1. Add `NSSupportsLiveActivities = YES` to your iOS `Info.plist` (automated by Expo plugin or CLI init).
2. Configure an App Group for shared storage (e.g., `group.com.yourapp.widgets`).

---

## 🚀 Lifecycle Operations

### 1. Start a Live Activity
```tsx
import { LiveActivities } from 'react-native-live-widgets';

const startActivity = async () => {
  const activityId = await LiveActivities.start({
    activityName: 'DeliveryTracker',
    initialState: {
      orderId: '#FD-8821',
      status: 'On the way 🛵',
      estimatedArrival: Date.now() + 15 * 60 * 1000,
      driverName: 'Alex'
    }
  });

  console.log('Started activity:', activityId);
};
```

### 2. Update Live Activity State
```tsx
await LiveActivities.update(activityId, {
  status: 'Arriving now! 📍',
  estimatedArrival: Date.now() + 2 * 60 * 1000
});
```

### 3. End a Live Activity
```tsx
// Dismiss immediately or after a delay
await LiveActivities.end(activityId, {
  dismissalPolicy: 'after', // 'immediate' | 'after' | 'default'
  delaySeconds: 10
});
```

---

## 🏝️ Dynamic Island Layout Formats

When defining your widget layout in `widgets.config.ts`, you can provide distinct UI variations:
- **Expanded:** Shown when long-pressing the Dynamic Island.
- **Compact Leading:** Left pill in the Dynamic Island.
- **Compact Trailing:** Right pill in the Dynamic Island.
- **Minimal:** Displayed when multiple Live Activities are concurrent.

```tsx
export default {
  island: {
    compactLeading: <Text color="#38BDF8">🛵</Text>,
    compactTrailing: <Timer targetTimestamp={Date.now() + 900000} isCountdown />,
    expanded: (
      <VStack padding={12}>
        <Text typography="headline">Driver on the way</Text>
        <Text typography="caption1">1.2 km away</Text>
      </VStack>
    )
  }
};
```
