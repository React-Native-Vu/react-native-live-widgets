# ♿ Native Accessibility, TalkBack & VoiceOver Guide

Complete architecture and verification guide for **True Native Accessibility Nodes** in **`react-native-live-widgets`**.

---

## 🏗️ Dual-Layer Accessibility Architecture

Instead of collapsing an entire widget into a single monolithic `contentDescription` string, `react-native-live-widgets` compiles every layout into two synchronized trees:

```text
UI IR
  ├── Visual Tree (SwiftUI / Android Canvas Bitmap)
  └── Semantic Tree (Independent Accessibility Graph)
        ├── Native Accessibility Nodes (rn_semantic_layer / SwiftUI modifiers)
        ├── Focus Order (accessibilityFocusOrder / accessibilitySortPriority)
        ├── Grouping (accessibilityGroup: 'combine' | 'contain')
        ├── State Description (Checked, Disabled, Expanded, Selected, Busy)
        ├── Adjustable Actions (Increment / Decrement via Screen Reader)
        ├── Dynamic Live Regions (polite / assertive)
        └── RTL Traversal Order (layoutDirection: 'rtl')
```

### 🤖 Android: Native Semantic Overlay (`rn_semantic_layer`)
- The background Canvas `ImageView` sets `importantForAccessibility="no"` whenever semantic nodes are active so TalkBack does not read duplicate text.
- Each semantic node (`Text`, `Header`, `Badge`, `Progress`, `Gauge`, `Timer`, or combined `Group`) gets an independent transparent `TextView` overlay (`rn_live_widget_semantic_node.xml`) positioned with pixel-exact letterbox-compensated bounds.
- Supports `setStateDescription` (Android 11+), `setAccessibilityHeading` (Android 9+), `setAccessibilityLiveRegion`, and RTL focus ordering.

### 🍏 iOS: Native SwiftUI Accessibility Modifiers
- Maps directly to `.accessibilityElement(children: .combine | .contain)`, `.accessibilitySortPriority()`, `.accessibilityAddTraits(.isHeader | .isButton | .isSelected | .updatesFrequently)`, and `.environment(\.layoutDirection, .rightToLeft)`.

---

## 💻 Declarative Usage

```tsx
import { UI, Widget } from 'react-native-live-widgets';

const accessibleWidget = UI.VStack(
  { padding: 14, layoutDirection: 'ltr' },
  UI.Text('Đơn hàng #FD-8821', {
    typography: 'headline',
    accessibilityFocusOrder: 1,
    accessibilityLiveRegion: 'polite',
  }),
  UI.HStack(
    {
      accessibilityGroup: 'combine',
      accessibilityFocusOrder: 2,
    },
    UI.Image('bicycle', { accessible: false }),
    UI.Text('Tài xế Alex'),
    UI.Text('Cách 1.2 km')
  ),
  UI.Toggle({
    label: 'Thông báo khi tới nơi',
    isChecked: true,
    actionId: 'toggle:notify',
    accessibilityFocusOrder: 3,
    accessibilityState: { checked: true },
  }),
  UI.Button({
    title: 'Tăng số lượng',
    actionId: 'counter:inc',
    accessibilityFocusOrder: 4,
    accessibilityAdjustable: {
      incrementActionId: 'counter:inc',
      decrementActionId: 'counter:dec',
      min: 0,
      max: 99,
    },
  })
);

// 🔍 Inspect the generated Accessibility Node Tree in your terminal
console.log(Widget.inspectAccessibilityTree(accessibleWidget));
```

---

## 🧪 Verifying Real TalkBack Nodes on Android (ADB)

To prove that independent `AccessibilityNodeInfo` nodes exist on Android (not just a single Canvas summary):

```bash
# 1. Enable TalkBack or inspect the live window accessibility hierarchy
adb shell dumpsys accessibility | grep -A 8 "rn_semantic_node"

# 2. Verify independent boundsInScreen & contentDescription for each widget element
adb shell uiautomator dump /sdcard/window_dump.xml && adb pull /sdcard/window_dump.xml
grep "rn_semantic_node" window_dump.xml
```
