# react-native-live-widgets 🚀

An all-in-one library for **Bare React Native** to build **Live Activities (iOS 16.1+ ActivityKit / Dynamic Island)**, **Live Updates (Android API 24 -> Android 16 ProgressStyle)**, and **Interactive Multi-Page Home Screen Widgets (iOS WidgetKit & Android AppWidget)** using a **100% Declarative JavaScript/TypeScript UI Engine**.

📖 **Full Documentation:**
- 🇬🇧 **[Complete Developer Guide in English (`docs/GUIDE-EN.md`)](docs/GUIDE-EN.md)**
- 🇻🇳 **[Hướng dẫn chi tiết từ A-Z bằng tiếng Việt (`docs/GUIDE-VI.md`)](docs/GUIDE-VI.md)**

---

## ✨ Key Features

1. **100% Declarative UI in JS/TS (`UI.*`)**: Build both Home Screen Widgets and Live Activities directly in React Native using `UI.VStack`, `UI.HStack`, `UI.Text`, `UI.Timer`, `UI.Progress` (`bar`, `segmented`, `circular`), `UI.Image` (`url`, `base64`, `filePath`, `assetName`, `systemName`), and `UI.Button`.
2. **Interactive Multi-Page Widgets (No App Launch Required)**:
   - Switch tabs/pages (`actionId: 'page:<id>'`, `'page:next'`, `'page:prev'`) and toggle checklist items (`actionId: 'toggle:<key>'`) directly on the Widget surface on both iOS (`AppIntents`) and Android (`PendingIntent` hit zones).
3. **Background API Auto-Sync When App Is Killed (`Widget.setRemoteConfig`)**:
   - Automatically fetches fresh JSON from your REST API in the background and injects `{{field}}` variables into the Widget even after the user swipes away (force-kills) the main app.
4. **Full Push Token Management (APNs & FCM)**:
   - Retrieve and subscribe to `devicePushToken`, `pushToStartToken` (iOS 17.2+), and `activityUpdateToken` via `LiveActivity.getAllPushTokens()`.
5. **Remote & Base64 Image Caching**:
   - Automatically downloads, downscales (`maxDimension = 360px`), and caches remote `https://` images and `base64` avatars/QR codes for both iOS WidgetKit and Android AppWidgets/Notifications.

---

## 📦 Quick Start

```bash
# 1. Install package
npm install react-native-live-widgets
# or
yarn add react-native-live-widgets

# 2. Auto-configure iOS & Android
npx react-native-live-widgets init --group group.com.yourcompany.app

# 3. Install CocoaPods
cd ios && pod install
```

See **[docs/GUIDE-EN.md](docs/GUIDE-EN.md)** (English) or **[docs/GUIDE-VI.md](docs/GUIDE-VI.md)** (Tiếng Việt) for full examples and API reference.

---

## 📄 License
MIT © vu-tran
