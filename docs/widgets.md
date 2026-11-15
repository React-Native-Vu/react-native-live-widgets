# Home Screen Widgets & Interactive Multi-Page Guide (`Widget.*`)

> 🌐 Full Guides: [English (`GUIDE-EN.md`)](./GUIDE-EN.md) | [Tiếng Việt (`GUIDE-VI.md`)](./GUIDE-VI.md)

This document focuses on building **Home Screen Widgets (`small`, `medium`, `large`)** with **multi-page navigation**, **interactive checklists**, **remote URL/Base64 images**, and **autonomous background API synchronization** on both iOS and Android.

---

## 1. Setting Dynamic Widget Layouts (`Widget.setLayout`)

```typescript
import { Widget, UI } from 'react-native-live-widgets';

await Widget.setLayout('main', {
  initialPage: 'overview',
  small: smallNode,
  medium: mediumNode,
  large: largeNode,
  pages: {
    overview: { small: smallNode, medium: mediumNode, large: largeNode },
    tasks: { small: tasksSmallNode, medium: tasksMediumNode, large: tasksLargeNode },
    stats: { small: statsSmallNode, medium: statsMediumNode, large: statsLargeNode },
  },
});
```

---

## 2. Interactive Widget Actions (`UI.Button`)

| `actionId` Format | Behavior on iOS (`AppIntents`) & Android (`PendingIntent`) |
|---|---|
| `'page:<page_id>'` | Switches the widget to `<page_id>` in-place without launching the app |
| `'page:next'` / `'page:prev'` | Cycles to the next or previous page defined in `pages` |
| `'toggle:<item_key>'` | Toggles checklist state (`true` / `false`) and updates any `UI.Text` with `strikethroughWhenToggled: '<item_key>'` |
| `'refresh'` | Immediately executes the background HTTP call configured via `Widget.setRemoteConfig` |

---

## 3. Autonomous Background API Sync (`Widget.setRemoteConfig`)

```typescript
await Widget.setRemoteConfig({
  url: 'https://api.example.com/v1/widget-data',
  method: 'GET',
  headers: { Authorization: 'Bearer <token>' },
  intervalMinutes: 15,
});
```

Any `UI.Text` containing `{{fieldName}}` or `{{_lastSyncTime}}` will be automatically populated from the JSON response even when the app is killed.

