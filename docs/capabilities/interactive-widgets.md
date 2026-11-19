# ⚡ Interactive Home Screen Widgets Guide

Build interactive Home Screen widgets on iOS and Android with 2-way click event handling without waking the full React Native application.

---

## 🌟 How It Works

1. **iOS (iOS 17.0+ AppIntents):** Interactive buttons in SwiftUI trigger an AppIntent that writes action payloads directly into App Group Shared Defaults and notifies the host app.
2. **Android (RemoteViews PendingIntent):** Android buttons invoke a broadcast intent caught by `LiveWidgetReceiver`, which executes background dispatch.
3. **React Native Hook:** Inside your React Native JavaScript runtime, use `useWidgetAction` to capture clicks and execute application logic.

---

## 💻 Code Example

### 1. Declaring the Interactive Widget (`widgets.config.ts`)
```tsx
import { Widget, VStack, HStack, Text, Button } from 'react-native-live-widgets';

export const CounterWidget = (
  <VStack padding={16} backgroundColor="#0F172A" cornerRadius={16}>
    <Text typography="headline" color="#F8FAFC">Quick Counter</Text>
    
    <HStack justifyContent="space-between" alignItems="center">
      <Button
        title="➖ Minus"
        actionId="DECREMENT"
        payload={{ step: 1 }}
        backgroundColor="#334155"
      />
      
      <Button
        title="➕ Plus"
        actionId="INCREMENT"
        payload={{ step: 1 }}
        backgroundColor="#2563EB"
      />
    </HStack>
  </VStack>
);
```

### 2. Handling Actions in React Native (`App.tsx`)
```tsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useWidgetAction, Widget } from 'react-native-live-widgets';

export default function App() {
  const [count, setCount] = useState(0);

  // Hook captures clicks fired from Home Screen widgets
  useWidgetAction((actionId, payload) => {
    if (actionId === 'INCREMENT') {
      const newCount = count + (payload?.step || 1);
      setCount(newCount);
      // Immediately update widget display
      Widget.update('counter', { currentCount: newCount });
    } else if (actionId === 'DECREMENT') {
      const newCount = count - (payload?.step || 1);
      setCount(newCount);
      Widget.update('counter', { currentCount: newCount });
    }
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Counter: {count}</Text>
    </View>
  );
}
```
