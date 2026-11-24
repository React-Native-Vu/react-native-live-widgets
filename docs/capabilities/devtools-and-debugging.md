# 🔬 Developer Experience, Visual Inspector, Snapshots & Profiler Guide

Professional DevTools suite built into **`react-native-live-widgets`** for debugging widget layouts, verifying visual regressions, profiling native memory/reload budgets, and catching schema issues early.

---

## 1. 🖥️ Visual Widget Inspector (`Widget.exportInspectorHTML`)

Transform `Widget.inspectIR()` from raw terminal text into a 3-pane self-contained HTML DevTools viewer showing **UI Tree**, **Native vs Canvas Strategy**, **Dark / Light / Tinted Previews**, **Semantic Focus Tree**, and **Diagnostics**:

```tsx
import { Widget } from 'react-native-live-widgets';
import fs from 'fs';

const html = Widget.exportInspectorHTML(myLayout, { size: 'medium', theme: 'dark' });
fs.writeFileSync('widget-inspector.html', html);
// Open widget-inspector.html in any browser!
```

---

## 2. 📸 Widget Snapshot Testing (`Widget.createSnapshot` & `Widget.compareSnapshots`)

Run deterministic structural & SVG visual regression tests across sizes (`small`, `medium`, `large`, `lockScreen`, `dynamicIsland`) and themes (`light`, `dark`, `tinted`) in CI under 50ms:

```tsx
const baseline = Widget.createSnapshot(v1Layout, {
  sizes: ['small', 'medium'],
  themes: ['light', 'dark', 'tinted'],
});

const current = Widget.createSnapshot(v2Layout, {
  sizes: ['small', 'medium'],
  themes: ['light', 'dark', 'tinted'],
});

const diff = Widget.compareSnapshots(baseline, current);
if (!diff.passed) {
  console.error('Visual regression detected:', diff.changedVariants);
}
```

---

## 3. ⚡ Native Renderer Profiler (`Widget.getProfilerReport`)

Track UI IR compile time, Android Bitmap dimensions & RAM usage (`w × h × 4 bytes`), RemoteViews action counts, and **iOS WidgetKit 24-hour reload budget** (warns automatically if exceeding 40 reloads/day):

```tsx
const irMetrics = Widget.profileIR(myLayout);
const report = await Widget.getProfilerReport('main');
console.log(Widget.formatProfilerReport(report));
```

---

## 4. 🩺 Better Diagnostics (`Widget.diagnose`)

Catch invalid UI schema, prop typos (`backgroudColor` ➔ `backgroundColor`), Android RemoteViews platform limits, Canvas fallback reasons, missing Accessibility labels, and dead-letter queue errors:

```tsx
const report = Widget.diagnose(myLayout);
console.log(Widget.formatDiagnostics(report));
```
