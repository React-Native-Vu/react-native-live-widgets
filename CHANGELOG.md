# Changelog

All notable changes to `react-native-live-widgets` will be documented in this file.

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

