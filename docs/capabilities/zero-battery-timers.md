# ⏱️ Zero-Battery Hardware Timers Guide

Learn how `react-native-live-widgets` runs smooth, second-by-second countdowns on the Lock Screen and Home Screen without waking up the CPU or JavaScript runtime.

---

## 🔋 The Battery Problem with Timers

Traditional React Native approaches attempt to update widgets via `setInterval()` or push notifications every second.
- **Result:** CPU remains active 100% of the time, causing severe device overheating and battery drain (up to 12% per hour). Apple and Google actively throttle or kill apps doing frequent wakeups.

---

## ⚡ The Hardware-Backed Solution

`react-native-live-widgets` provides the `<Timer>` component. Rather than ticking in JavaScript, it sends a **target epoch timestamp** to native OS hardware chronometers:
- **iOS:** Uses SwiftUI's native `Text(timerInterval:pauseTime:countsDown:)`.
- **Android:** Uses native `android.widget.Chronometer` with `setBase()` and `isCountDown = true`.

The mobile operating system's display pipeline renders the ticking seconds directly onto the screen with **0% JavaScript CPU usage**.

---

## 💻 Usage

```tsx
import { Timer, HStack, Text } from 'react-native-live-widgets';

// Target 15 minutes from now
const target = Date.now() + 15 * 60 * 1000;

export const DeliveryTimer = (
  <HStack alignItems="center">
    <Text color="#94A3B8">Arriving in: </Text>
    <Timer
      targetTimestamp={target}
      isCountdown={true}
      color="#F59E0B"
      typography="headline"
    />
  </HStack>
);
```

### Supported Timer Props
| Prop | Type | Description |
| :--- | :--- | :--- |
| `targetTimestamp` | `number` | Unix epoch timestamp in milliseconds |
| `isCountdown` | `boolean` | `true` for countdown; `false` for stopwatch |
| `color` | `string` | Hex color code (e.g., `#38BDF8`) |
| `typography` | `string` | Font style (`title1`, `headline`, `caption1`) |
