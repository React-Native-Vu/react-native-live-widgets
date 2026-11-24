# Changelog

All notable changes to `react-native-live-widgets` will be documented in this file.

## [1.2.4] - 2026-11-24
### Added
- **Native Feature Expansion & Curated Ecosystem Primitives (Group E)**:
  - Added standalone **`MediaSession`** API (`setMetadata`, `setPlaybackState`, `clear`, `onRemoteCommand`) wired directly to iOS `MPNowPlayingInfoCenter`/`MPRemoteCommandCenter` and Android `android.media.session.MediaSession`.
  - Added **`NavigationLive`** turn-by-turn Dynamic Island & Lock Screen Live Activity controller (`start`, `updateManeuver`, `end`, `buildLayout`).
  - Added **`SmartHomeControl`** builders (`createToggle`, `createSceneButton`) for iOS 18 Control Center & Android Quick Settings.
  - Added high-ROI primitives & utilities: `createListNode` (RAM-safe `maxItems` cap), `createTimelineNode`, `createDonutChartNode`, `createSparklineNode`, `whenNode`, `responsiveLayout`, `LocaleFormatter`, and `Widget.prefetchImages()`/`clearImageCache()`.
- **Developer Experience, Visual Inspector, Snapshot Testing, Profiler & Diagnostics (Group D)**:
  - Added `Widget.exportInspectorHTML()` generating a zero-dependency 3-pane DevTools HTML viewer (UI Tree, Dark/Light/Tinted SVG previews, Semantic Focus Tree, Diagnostics).
  - Added `Widget.createSnapshot()`, `Widget.compareSnapshots()`, and `Widget.renderToSVG()` for multi-size & Light/Dark/Tinted/RTL regression testing.
  - Added `Widget.profileIR()`, `Widget.getProfilerReport()`, `Widget.formatProfilerReport()` + Android native Bitmap RAM / render duration / RemoteViews action telemetry and 24-hour WidgetKit reload budget warnings.
  - Added `Widget.diagnose()` and `Widget.formatDiagnostics()` catching invalid UI schema, prop typos, platform limits, Canvas fallbacks, and dead-letter queue alerts.
- **Persistent Action Queue & Atomic State Lifecycle Engine (Group B)**:
  - Added `Widget.enqueueAction`, `Widget.getPendingActions`, `Widget.syncPendingActions`, `Widget.recoverPendingActions`, `Widget.clearPendingActions`, and `usePendingActions()` hook with Idempotency Keys, Deduplication, Exponential/Linear/Fixed Retry Policy, and Dead-Letter handling.
  - Added `Widget.registerStateSchema`, `Widget.getVersionedState`, and `Widget.updateStateAtomic` supporting State Versioning, automatic schema Migration, Conflict Resolution (`last_write_wins`, `server_wins`, `client_wins`, custom merge), and Multi-Instance Isolation.
- **Background Data Engine Upgrades (Group C)**:
  - Added `PATCH`/`DELETE` REST support, **Stale-While-Revalidate (SWR)** (`cacheStrategy`, `staleTtlSeconds`), `offlineFallback`, `Widget.invalidateCache()`, `Widget.setSecureToken()` (`{{$secure.*}}` native header interpolation), `Widget.getSyncStatus()` observability telemetry, and `Widget.computeDataDiff()` incremental diffing.
- **True Native Accessibility Tree (Group A — TalkBack & VoiceOver)**:
  - Extended `AccessibilityProps` & `SemanticNode` in UI IR with `accessibilityFocusOrder`, `accessibilityGroup` (`'combine' | 'contain' | 'none'`), `accessibilityState` (`checked`, `disabled`, `expanded`, `selected`, `busy`), `accessibilityAdjustable`, `accessibilityLiveRegion` (`'polite' | 'assertive'`), and RTL traversal (`layoutDirection: 'rtl'`).
  - **Android Native Semantic Overlay (`rn_semantic_layer`)**: Replaced monolithic Canvas `contentDescription` with independent pixel-aligned transparent `AccessibilityNodeInfo` overlays (`rn_live_widget_semantic_node.xml`) using 100% `@RemotableViewMethod`-safe bindings.
  - **iOS SwiftUI Accessibility Modifier**: Added `.accessibilitySortPriority()`, `.accessibilityElement(children:)`, `.isSelected`/`.isSummaryElement`/`.updatesFrequently` traits, and RTL `.layoutDirection`.
  - **Accessibility Test Inspector**: Added `Widget.inspectAccessibilityTree(layout, { rtl })`.
- **Android Debug FCM Push Simulator (`DebugFcmPushReceiver`)**:
  - Added `FLAG_DEBUGGABLE`-guarded broadcast receiver (`ACTION_SIMULATE_FCM_PUSH`) allowing instant local `adb` simulation of FCM push-to-start, push-to-update, push-to-end Live Activities, and background widget sync without requiring Firebase project setup.
- **Tier-1 Community QA, CI/CD & Documentation**:
  - Expanded automated unit test suite to **41/41 passing assertions** across Node 18, 20, and 22 in `.github/workflows/ci.yml`.
  - Added 7-flow Maestro E2E test suite (`.maestro/`) and Android KVM E2E workflow (`.github/workflows/e2e.yml`).
  - Published `docs/RELEASE-1.2.4.md`, `docs/COMPATIBILITY.md`, `docs/MIGRATION.md`, `docs/BENCHMARKS.md`, and 7 capability guides in `docs/capabilities/`.

### Fixed
- **Android Launcher `"Can't load widget"` Safety**: Removed non-`@RemotableViewMethod` reflection calls (`setAccessibilityHeading`, `setStateDescription`, `setAccessibilityLiveRegion`) from `RemoteViews` in `DynamicHomeScreenWidgetProvider.kt`, encoding heading and state semantics cleanly via `@RemotableViewMethod` `setContentDescription`.

## [1.2.3] - 2026-11-18
### Fixed & Improved
- **Automatic Xcode String Catalog Linking (`Localizable.xcstrings`)**:
  - `codegen.js` now automatically inspects `project.pbxproj` and links `Localizable.xcstrings` into the `PBXResourcesBuildPhase` and `PBXFileReference` of the `LiveWidgetsExtension` target, preventing raw i18n keys (e.g., `widgets.main.title`, `widgets.shift.title`) from leaking into the iOS Widget Gallery.
  - Automatically updates `CFBundleLocalizations` (`vi`, `en`, `ja`) inside `LiveWidgetsExtension/Info.plist` and synchronizes project `knownRegions`.
- **Full Bilingual i18n Web Documentation**:
  - Completed English translations across `docs/index.html` (sidebar categories, links, exact hit layer, and quick start sections) with 101/101 dynamic `data-i18n` keys.
- **Library Peer Dependency Deduplication**:
  - Sanitized library build environment to eliminate nested React instances, preventing `Cannot read property 'useRef' of null` dispatch errors in host apps.

## [1.2.2] - 2026-11-18
### Added
- **All-in-One Automated Setup Integration**: `npx react-native-live-widgets init` now automatically runs the entire icon extraction and codegen pipeline out of the box (syncing 9,500+ Apple SF Symbols and 3,800+ Google Material Icons into TypeScript auto-complete, generating `LiveWidgetsBundle.swift`, and synchronizing string catalogs).
- **Auto-Generated `app.json` & Smart Project Detection**:
  - Automatically creates `app.json` with `name` and `displayName` if missing, or completes missing fields.
  - Accurately distinguishes between Bare React Native projects (plain `app.json`) and Expo projects (detecting `"expo"` configuration object or `package.json` dependency), avoiding incorrect Expo plugin injection on pure React Native CLI projects.
- **Automated Entrypoint Injection (`index.js` / `index.ts` / `index.tsx`)**:
  - Automatically inspects the project's root entry file and safely registers `LiveActivity.registerBackgroundActionHandler()` before `AppRegistry.registerComponent` or `registerRootComponent`.
  - Automatically injects `import { name as appName } from './app.json';` when referenced by `AppRegistry` if the import statement is missing.
- **Resilient Auto-Generation for Missing Native Files**:
  - Automatically regenerates `LiveWidgetsExtension/Info.plist` if missing (resolving Xcode build error 65).
  - Automatically generates `widgets.config.ts` with complete English JSDoc documentation if not found in project root.
- **Type Aliases & API Ergonomics**: Exported `defineWidgetConfig` (singular) alongside `defineWidgetsConfig` (plural) in `src/index.ts`.
- **Expo Android Prebuild Trigger**: Enhanced Expo Config Plugin (`app.plugin.js`) with an Android `withDangerousMod` hook to automatically sync Android `res/values-*/strings.xml` during `npx expo prebuild`.

### Changed & Improved
- **100% English CLI Experience**: Standardized all terminal logs, banners, prompts, and completion messages in `cli/setup.js` and `cli/codegen.js` to clean, professional English.
- **Streamlined Documentation & Official Icon Galleries**:
  - Rewrote the **Quick Start (3-step setup)** and added a CLI cheat sheet across `README.md`, `docs/GUIDE-VI.md`, `docs/GUIDE-EN.md`, `docs/EXPO-GUIDE-VI.md`, and `docs/EXPO-GUIDE-EN.md`.
  - Updated `docs/index.html` with official links to Apple SF Symbols and Google Material Icons galleries, alongside a dynamic language switcher (EN / VI).
  - Updated `docs/llms.txt` and `docs/llms-full.txt` with latest setup commands.

## [1.2.1] - 2026-11-17
### Added
- **Cross-Platform System Icons (SF Symbols & Material Icons)**: Dedicated `systemNameIos` and `systemNameAndroid` props with full TypeScript autocomplete for 9,500+ Apple SF Symbols (`KnownSFSymbol`) and 3,800+ Google Material Icons (`KnownMaterialIcon`), automatically rendered across iOS WidgetKit and Android Canvas.
- **TypeScript-Driven Swift Codegen CLI (`npx react-native-live-widgets codegen`)**: Configured via `widgets.config.ts` to automatically generate `LiveWidgetsBundle.swift`, sync Apple String Catalogs (`Localizable.xcstrings`), generate Android `res/values-*/strings.xml`, and automatically ensure/generate missing `LiveWidgetsExtension/Info.plist`.
- **English CLI Output**: Standardized all Codegen CLI and icon generation terminal logs to clean, professional English.

### Fixed
- **iOS Swift 6 Compatibility**: Resolved `@ViewBuilder` type inference and closure encapsulation for `renderText()`, `DynamicNodeAccessibilityModifier`, and `ContainerStyleModifier` to prevent `type '()' cannot conform to 'View'` compiler error.
- **Android Exact Hit Layer**: Replaced fixed grid layout with dynamic `FrameLayout` hit zones (`rn_hit_layer`), accurately mapping bitmap coordinates with launcher aspect ratio letterboxing to eliminate touch offsets and misclicks.
- **Android Live Chronometer**: Integrated native `android.widget.Chronometer` with `setChronometerCountDown(true)` for smooth, real-time 1s countdown ticking without redrawing bitmaps.
- **Dynamic Variable Interpolation**: Added dynamic template variable resolution (`{{id}}`, `{{title}}`, counter values) and `defaultChecked` persistence in `DynamicWidgetStateStore`.

## [1.2.0] - 2026-11-16
### Added
- **JSX / TSX Declarative DSL**: Support building Widgets and Live Activities directly using intuitive React JSX syntax (`<VStack>`, `<HStack>`, `<ZStack>`, `<Grid>`, `<Text>`, `<Button>`, `<Badge>`, `<Progress>`, `<Timer>`, `<Image>`, `<Spacer>`, `<Divider>`) instead of nested function calls `UI.VStack(...)`.
- **In-App Widget Preview (`<WidgetPreview>` / `<VoltraWidgetPreview>`)**: Live component to render, preview, and test widget layouts and interactive button clicks directly inside your React Native screens with accurate device sizes (`small`, `medium`, `large`, `lockScreen`).
- **Seamless JSX Auto-Conversion**: `Widget.setLayout(...)` and `LiveActivity.start(...)` now accept JSX elements directly and convert them automatically into native `LayoutNode` JSON trees.

## [1.1.2] - 2026-11-16
### Added
- **React Hooks (Fast Refresh Resilient)**: Added `useWidgetAction`, `useLiveActivity`, and `useWidgetState` hooks with automatic lifecycle cleanup and Hot Reload resilience.
- **API Overload & Aliases**: Added `Widget.onWidgetAction`, `LiveActivity.registerActionHandler`, `Widget.update`, `cornerRadius` alias for `borderRadius`, and normalized `intervalMinutes` <-> `refreshIntervalMinutes` across TypeScript, Android (Kotlin), and iOS (Swift).

### Documentation
- **Complete Documentation Synchronization**: Standardized function signatures, props, and code snippets across `README.md`, `GUIDE-VI.md`, `GUIDE-EN.md`, `docs/index.html`, `llms.txt`, and Agent Skill.

## [1.1.1] - 2026-11-16
### Fixed
- **Android Widget Interaction Crash**: Added `android.permission.WAKE_LOCK` and safely wrapped `HeadlessJsTaskService` wake lock acquisition to prevent `SecurityException` on widget tap events.
- **Android Hit Zone Accuracy**: Upgraded `rn_live_widget_host.xml` to a dynamic 6-row x 3-column interaction grid (`rn_hit_r0_c0` - `rn_hit_r5_c2`), mapping button physical coordinates (`yFraction`, `xFraction`) accurately to fix misaligned tap zones.
- **Background Headless Responsiveness**: Added native state store handling and `LiveActivity.registerBackgroundActionHandler()` support for zero-latency widget interactions even when the app is swiped away or force-killed.

## [1.1.0] - 2026-11-16
### Added
- **Expo Config Plugin (`app.plugin.js`)**: Full Expo & EAS Build support (`npx expo prebuild` / `npx expo run:ios` / `npx expo run:android`). Automatically configures `NSSupportsLiveActivities` and `NSSupportsLiveActivitiesFrequentUpdates` in iOS `Info.plist`, App Groups entitlements, and Android notifications & foreground service permissions.

### Fixed
- **TypeScript Module Resolution**: Fixed `error TS7016` when resolving React Native package exports by updating to `moduleResolution: bundler` and `module: ES2020`.
- **Global `__DEV__` Declaration**: Fixed `error TS2304: Cannot find name '__DEV__'` with safe typing and fallback checks.

## [1.0.0] - 2026-11-15
### Added
- **Declarative UI Engine (`UI.*`)**: Build Home Screen Widgets (`small`, `medium`, `large`) and Live Activities (`lockScreen`, `dynamicIsland`) 100% in React Native using `UI.VStack`, `UI.HStack`, `UI.Text`, `UI.Timer`, `UI.Progress` (`bar`, `segmented`, `circular`), `UI.Image`, and `UI.Button`.
- **Interactive Multi-Page & Checklist Widgets (iOS & Android)**: In-place page switching (`actionId: 'page:<id>'`, `'page:next'`, `'page:prev'`) and task checklist toggling (`actionId: 'toggle:<key>'`) via iOS 17+ `AppIntents` and Android `PendingIntent` hit zones.
- **Background API Auto-Sync (`Widget.setRemoteConfig`)**: Autonomous background HTTP JSON fetch and `{{field}}` template interpolation even when the main app is force-killed.
- **Multi-Source Image Loader & Cache (`UI.Image`)**: Remote `https://` URLs (auto-prefetched, downscaled to `360px` max dimension, and cached), `base64`, `filePath`, `assetName`, and `systemName` (SF Symbols / Android Vector mapping).
- **Unified Push Token Management**: `devicePushToken`, `pushToStartToken` (iOS 17.2+), and `activityUpdateToken` across iOS APNs and Android FCM.
- **CLI Setup Wizard**: `npx react-native-live-widgets init` for automatic iOS & Android project configuration.

