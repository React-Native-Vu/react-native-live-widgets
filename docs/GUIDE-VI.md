# HƯỚNG DẪN SỬ DỤNG VÀ THIẾT LẬP THƯ VIỆN REACT-NATIVE-LIVE-WIDGETS 🚀

> 🌐 **Language:** **Tiếng Việt** | [English (GUIDE-EN.md)](./GUIDE-EN.md) • [⚡ Hướng dẫn riêng cho Expo (EXPO-GUIDE-VI.md)](./EXPO-GUIDE-VI.md)

Tài liệu hướng dẫn toàn diện từ cài đặt, thiết lập native (iOS/Android), xây dựng giao diện động bằng JavaScript/TypeScript cho cả **Live Activities (Dynamic Island / Lock Screen / Android Live Update)** và **Home Screen Widgets (Tiện ích màn hình chính tương tác đa trang)**.

> [!TIP]
> **Bạn đang dùng Expo (SDK 50, 51, 52, 58+)?** Hãy đọc ngay [Hướng dẫn Tích hợp Expo Chuyên sâu (EXPO-GUIDE-VI.md)](./EXPO-GUIDE-VI.md) để sử dụng Expo Config Plugin và EAS Build một cách tối ưu nhất!

---

## MỤC LỤC
1. [Giới thiệu và Kiến trúc](#1-giới-thiệu-và-kiến-trúc)
2. [Kho Mã Nguồn Demo Chính Thức (Expo & Bare RN)](#2-kho-mã-nguồn-demo-chính-thức-expo--bare-rn)
3. [Cài đặt và Thiết lập Dự án](#3-cài-đặt-và-thiết-lập-dự-án)
   - [Dành cho dự án Expo](#dành-cho-dự-án-expo)
   - [Cài đặt package (Bare React Native)](#cài-đặt-package)
   - [Thiết lập iOS (Xcode & Widget Extension)](#thiết-lập-ios-xcode--widget-extension)
   - [Thiết lập Android (Gradle, Manifest, MainApplication & Permissions)](#thiết-lập-android-gradle-manifest-mainapplication--permissions)
   - [Cấu trúc Thư mục Native của Thư viện (`ios/` & `android/`)](#cấu-trúc-thư-mục-native-của-thư-viện-ios--android)
4. [Tài liệu API (Core API Reference)](#4-tài-liệu-api-core-api-reference)
   - [LiveActivity API (Màn hình khóa, Dynamic Island & 3 loại Push Token)](#1-liveactivity-api)
   - [Widget API (Tiện ích màn hình chính, Multi-page & Background Sync)](#2-widget-api)
   - [SharedStorage API (Đồng bộ App Groups & SharedPreferences)](#3-sharedstorage-api)
5. [Xây dựng Giao diện Động (Declarative UI Engine)](#5-xây-dựng-giao-diện-động-declarative-ui-engine)
   - [UI.VStack & UI.HStack](#uivstack--uihstack)
   - [UI.Text](#uitext)
   - [UI.Timer (Realtime không tốn pin)](#uitimer-realtime-không-tốn-pin)
   - [UI.Progress (Thanh tiến trình bar, segmented, circular)](#uiprogress-thanh-tiến-trình-đa-dạng)
   - [UI.Equalizer (Sóng nhạc chuyển động liên tục)](#uiequalizer-sóng-nhạc-chuyển-động-liên-tục)
   - [UI.Image (URL mạng, Base64, File, Asset & SF Symbols)](#uiimage-url-mạng-base64-file-asset--sf-symbols)
   - [UI.Button (Tương tác chuyển trang, Tick công việc, Refresh API & Deep Link)](#uibutton-nút-bấm-tương-tác-trực-tiếp-trên-widget)
6. [Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16, 17)](#6-cấu-hình-dynamic-island-iphone-14-pro-15-16-17)
7. [Tạo Home Screen & Lock Screen Widget Đa Dạng bằng JavaScript](#7-tạo-home-screen-widget-đa-trang--tương-tác-bằng-javascript)
   - [Lock Screen Widgets trên iOS (accessoryRectangular, circular, inline)](#lock-screen-widgets-trên-ios)
   - [Ghim Tiện ích vào Màn hình chính trong App (Android In-App Pin)](#ghim-tiện-ích-vào-màn-hình-chính-trong-app-android-in-app-pin)
8. [Đồng bộ API Ngầm cho Widget kể cả khi Kill App (`Widget.setRemoteConfig`)](#8-đồng-bộ-api-ngầm-cho-widget-kể-cả-khi-kill-app-widgetsetremoteconfig)
9. [Quản lý 3 loại Push Token (APNs & FCM) cho Live Activity](#9-quản-lý-3-loại-push-token-apns--fcm-cho-live-activity)
10. [State Machine & Tự động cập nhật theo pha (Phases)](#10-state-machine--tự-động-cập-nhật-theo-pha-phases)
11. [Cấu trúc Payload Server Push (APNs & FCM)](#11-cấu-trúc-payload-server-push-apns--fcm)
12. [Xử lý sự cố thường gặp (Troubleshooting)](#12-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Giới thiệu và Kiến trúc

Thư viện **`react-native-live-widgets`** là giải pháp All-in-One cho phép viết **100% giao diện Widget và Live Activity ngay trong code React Native (`App.tsx`)**, tự động ánh xạ sang Native cho cả iOS và Android:

- **Live Activity (iOS 16.1+ ActivityKit & Dynamic Island):** Cho sự kiện thời gian thực (chấm công, chuyến xe, giao đồ ăn, bấm giờ Pomodoro).
- **Live Update (Android API 24 -> Android 16 API 36 `Notification.ProgressStyle`):** Thông báo thời gian thực trên thanh trạng thái Android có hỗ trợ ảnh đại diện (`LargeIcon`), thanh chia chặng (`segmented`) và các nút bấm tương tác (`Action Buttons`).
- **Home Screen Widgets (iOS WidgetKit & Android AppWidget Canvas Renderer):** Tiện ích ngoài màn hình chính (`small`, `medium`, `large`) hỗ trợ bấm chuyển trang/tab (`pages`), tick hoàn thành công việc (`toggle`), hiển thị ảnh từ URL mạng/Base64 và tự động gọi API ngầm khi ứng dụng bị tắt.
- **Shared Storage:** Cầu nối lưu trữ tức thời giữa React Native App và Widgets thông qua iOS App Groups và Android `SharedPreferences`.

---

## 2. Kho Mã Nguồn Demo Chính Thức (Expo & Bare RN)

Để xem cách thức triển khai thực tế và chạy thử nghiệm ngay lập tức, bạn có thể tham khảo 2 kho mã nguồn mẫu chính thức:

| Nền tảng | Kho mã nguồn (GitHub) | Đặc điểm nổi bật |
| :--- | :--- | :--- |
| **🚀 Expo (SDK 58 / CNG)** | 👉 **[https://github.com/React-Native-Vu/LiveWidgetsExampleExpo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)** | Tích hợp Continuous Native Generation bằng Expo Config Plugin (`app.plugin.js`), không cần đụng mã Swift/Kotlin. |
| **⚛️ Bare React Native CLI** | 👉 **[https://github.com/React-Native-Vu/LiveWidgetsExample](https://github.com/React-Native-Vu/LiveWidgetsExample)** | Dành cho dự án thuần React Native CLI với cấu hình Xcode Extension và Android Studio hoàn chỉnh. |

### ⚡ Chạy Nhanh Demo Expo (LiveWidgetsExampleExpo):
```bash
git clone https://github.com/React-Native-Vu/LiveWidgetsExampleExpo.git
cd LiveWidgetsExampleExpo
npm install
npx expo prebuild
npx react-native-live-widgets init
npx expo run:ios # hoặc npx expo run:android
```

---

## 3. Cài đặt và Thiết lập Dự án

### Dành cho dự án Expo
Nếu bạn sử dụng **Expo**, thư viện hỗ trợ sẵn **Expo Config Plugin (`app.plugin.js`)** và **CLI Wizard**.
👉 **Xem hướng dẫn chi tiết từng bước tại: [Tài liệu Expo Tích hợp (EXPO-GUIDE-VI.md)](./EXPO-GUIDE-VI.md)**

```bash
# 1. Cài đặt
npx expo install react-native-live-widgets

# 2. Thêm plugin vào app.json và sinh mã native
npx expo prebuild

# 3. Tự động liên kết target Widget Extension
npx react-native-live-widgets init --group group.com.yourcompany.app
```

---

### Cài đặt package (Dành cho Bare React Native CLI)
Trong thư mục gốc của dự án React Native:
```bash
npm install react-native-live-widgets
# hoặc
yarn add react-native-live-widgets

# Tự động cấu hình Info.plist, Entitlements, AndroidManifest và tạo file mẫu Widget
npx react-native-live-widgets init --group group.com.yourcompany.app
```

---

### Thiết lập iOS (Xcode & Widget Extension)

#### Bước 1: Kích hoạt Live Activities & App Groups
Lệnh `npx react-native-live-widgets init` đã tự động thêm vào `Info.plist` và `.entitlements`:
```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```
Và trong `<TênApp>.entitlements` + `LiveWidgetsExtension.entitlements`:
```xml
<key>aps-environment</key>
<string>development</string>
<key>com.apple.security.application-groups</key>
<array>
  <string>group.<bundle_id_của_bạn></string>
</array>
```

#### Bước 2: Tạo Widget Extension Target trong Xcode (nếu chưa có)
1. Mở file `.xcworkspace` bằng Xcode.
2. Chọn menu: **File -> New -> Target... -> Widget Extension**.
3. Đặt tên **Product Name:** `LiveWidgets` (hoặc `LiveWidgetsExtension`), bỏ chọn *Include Configuration App Intent*.
4. Sử dụng nội dung chuẩn từ thư viện cho `LiveWidgetsBundle.swift`:
```swift
import WidgetKit
import SwiftUI
import react_native_live_widgets

@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }
    DynamicHomeScreenWidget()
  }
}
```

#### Bước 3: Cấu hình `Podfile` và cài đặt Pods
Trong `ios/Podfile`, đảm bảo target Widget Extension có kế thừa pod `react-native-live-widgets`:
```ruby
target 'LiveWidgetsExtension' do
  use_modular_headers!
  pod 'react-native-live-widgets', :path => '../node_modules/react-native-live-widgets'
end
```
Sau đó chạy:
```bash
cd ios && pod install
```

---

### Thiết lập Android (Gradle, Manifest, MainApplication & Permissions)

Trên Android, phần lớn cấu hình phức tạp đã được thư viện **tự động hóa sẵn** thông qua cơ chế **Android Manifest Merger** của Gradle. Dưới đây là chi tiết những gì đã có sẵn và những gì bạn cần kiểm tra trong dự án:

#### 1. Những thành phần thư viện đã tự động đăng ký (Bạn KHÔNG cần khai báo lại)
Trong file `AndroidManifest.xml` của thư viện `react-native-live-widgets` đã tích hợp sẵn và tự động gộp vào app của bạn khi build:
- **Các quyền hệ thống (Permissions):**
  - `android.permission.INTERNET` (tải ảnh từ URL mạng & gọi Background API cho Widget).
  - `android.permission.POST_NOTIFICATIONS` (hiển thị Live Update Notification trên Android 13+).
  - `android.permission.POST_PROMOTED_NOTIFICATIONS` (hiển thị Live Updates chip trên thanh trạng thái Android 16 / API 36).
  - `android.permission.VIBRATE`.
- **Home Screen Widget Provider (`DynamicHomeScreenWidgetProvider`):** Đã gắn sẵn bộ cấu hình `@xml/rn_live_widgets_info` hỗ trợ kéo giãn tự do (`resizeMode="horizontal|vertical"`).
- **Broadcast Receiver (`LiveActivityReceiver`):** Tự động bắt các sự kiện bấm nút trên Notification và Widget.

#### 2. Bước 1: Kiểm tra phiên bản SDK trong `android/build.gradle`
Đảm bảo file `android/build.gradle` của dự án có `minSdkVersion >= 24` và `compileSdkVersion >= 35` (hoặc `36` nếu muốn dùng Live Updates chuẩn Android 16):
```groovy
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35 // Hoặc 36 cho Android 16
        targetSdkVersion = 35
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
}
```

#### 3. Bước 2: Kiểm tra `MainApplication.kt`
Với React Native 0.7x / 0.8x, cơ chế **Autolinking** (`PackageList(this).packages`) sẽ tự động liên kết `LiveActivityPackage`.
> ⚠️ **Lưu ý quan trọng với React Native 0.80+:** Trong `MainApplication.kt`, bắt buộc phải gọi `loadReactNative(this)` bên trong `onCreate()` để khởi tạo SoLoader/JSI trước khi mở ứng dụng:
```kotlin
package com.yourcompany.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages, // LiveActivityPackage() đã tự động được thêm tại đây
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this) // Bắt buộc trên React Native 0.80+
  }
}
```

#### 4. Bước 3: Xin quyền Thông báo (Runtime Permission) trên Android 13+ (API 33+)
Trên Android 13 trở lên, hệ điều hành yêu cầu xin quyền `POST_NOTIFICATIONS` lúc chạy trước khi hiển thị Live Update Notification. Bạn có thể gọi hàm có sẵn của thư viện hoặc dùng `PermissionsAndroid` trong `App.tsx`:
```typescript
import { Platform, PermissionsAndroid } from 'react-native';
import { LiveActivity } from 'react-native-live-widgets';

async function ensureAndroidNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  }
  // Hoặc gọi trực tiếp hàm đa nền tảng của thư viện:
  await LiveActivity.registerForPushNotifications();
}
```

#### 5. Bước 4: Cách thêm và kéo giãn Home Screen Widget trên Android (`small` / `medium` / `large`)
1. Sau khi gọi `Widget.setLayout('main', { small, medium, large })` (hoặc alias `Widget.update(...)`) trong app, ra màn hình chính (Home Screen) của Android.
2. **Nhấn giữ vào khoảng trống** trên màn hình chính -> Chọn **Widgets (Tiện ích)** -> Tìm ứng dụng của bạn -> Kéo **Live Widgets** ra màn hình.
3. **Thay đổi kích thước tự động (Responsive Sizing):** Nhấn giữ vào Widget trên màn hình chính rồi thả tay ra để xuất hiện khung viền 4 chấm tròn:
   - Kéo thu nhỏ về **2×2 ô** (`chiều rộng < 210dp`): Tự động hiển thị giao diện **`small`** (tỷ lệ vuông 1:1).
   - Kéo ngang **4×2 ô** (mặc định): Tự động hiển thị giao diện **`medium`**.
   - Kéo giãn dọc xuống **4×4 ô** (`chiều cao >= 200dp`): Tự động hiển thị giao diện **`large`** đầy đủ chi tiết.

---

### Cấu trúc Thư mục Native của Thư viện (`ios/` & `android/`)

Mã nguồn native của thư viện được chia theo từng nhóm chức năng rõ ràng để bạn dễ dàng tra cứu hoặc mở rộng khi cần:

```text
react-native-live-widgets/
├── ios/
│   ├── Bridge/       # LiveActivityModule.swift/.m (Cầu nối React Native <-> iOS)
│   ├── Models/       # DynamicLayoutModels.swift, DynamicActivityAttributes.swift
│   ├── Storage/      # DynamicWidgetStateStore.swift, DynamicWidgetImageCache.swift
│   ├── Intents/      # DynamicWidgetActionIntent.swift (Xử lý nút bấm iOS 17+)
│   ├── Renderer/     # DynamicNodeView.swift, ColorHexExtension.swift (Vẽ SwiftUI từ JSON)
│   └── Widgets/      # DynamicHomeScreenWidget.swift, DynamicLiveActivityWidget.swift
└── android/src/main/java/com/reactnativeliveactivity/
    ├── bridge/       # LiveActivityModule.kt, LiveActivityPackage.kt
    ├── storage/      # DynamicWidgetStateStore.kt, DynamicWidgetImageCache.kt
    ├── renderer/     # DynamicWidgetCanvasRenderer.kt (Vẽ Canvas 2D + tính vùng bấm HitBox)
    ├── widgets/      # DynamicHomeScreenWidgetProvider.kt (Quản lý AppWidget Small/Medium/Large)
    └── liveactivity/ # LiveActivityNotifier.kt, LiveActivityReceiver.kt (Android 8 -> 16 Live Update)
```

---

## 3. Tài liệu API (Core API Reference)

```typescript
import { LiveActivity, Widget, SharedStorage, UI } from 'react-native-live-widgets';
```

### 1. `LiveActivity` API
- `LiveActivity.start(options)`: Khởi chạy Live Activity (iOS) / Live Update Notification (Android). Trả về `{ activityId, activityPushToken }`.
- `LiveActivity.update(options)`: Cập nhật giao diện và nội dung mới cho `activityId`.
- `LiveActivity.end(activityId)`: Kết thúc 1 phiên đang chạy.
- `LiveActivity.endAll()`: Kết thúc toàn bộ các phiên đang chạy.
- `LiveActivity.registerForPushNotifications()`: Yêu cầu hệ điều hành cấp quyền thông báo và đăng ký APNs Device Token.
- `LiveActivity.getAllPushTokens(activityId?)`: Lấy trọn bộ 3 loại Push Token (`devicePushToken`, `pushToStartToken`, `activityUpdateToken`).
- `LiveActivity.getDevicePushToken()`: Lấy APNs Device Token (iOS) hoặc FCM Token đã lưu (Android).
- `LiveActivity.getPushToStartToken()`: Lấy APNs Push-to-Start Token (iOS 17.2+).
- `LiveActivity.getActivityPushToken(activityId?)`: Lấy APNs Activity Update Token của phiên đang chạy.
- `LiveActivity.setDevicePushToken(token)`: Lưu FCM Token trên Android vào bộ quản lý chung.
- `LiveActivity.onDevicePushTokenChange(cb)` / `onPushToStartTokenChange(cb)` / `onActivityUpdateTokenChange(cb)`: Lắng nghe sự kiện xoay token theo thời gian thực.

### 2. `Widget` API (Tiện ích Màn hình chính & Màn hình khóa)
- `Widget.setLayout(widgetKey, layoutConfig, appGroup?)`: Cập nhật giao diện động (`small`, `medium`, `large` cho Home Screen; `accessoryRectangular`, `accessoryCircular`, `accessoryInline` cho Lock Screen; `pages`, `initialPage` cho Widget đa trang). Tự động nén và tải trước toàn bộ ảnh từ URL mạng.
- `Widget.requestPin()`: *(Android 8.0+)* Mở hộp thoại hệ thống cho phép người dùng bấm ghim trực tiếp Tiện ích ra Màn hình chính ngay từ trong ứng dụng mà không cần ra launcher nhấn giữ kéo thả thủ công!
- `Widget.isPinSupported()`: Kiểm tra xem Launcher của thiết bị hiện tại có hỗ trợ ghim Tiện ích trực tiếp hay không.
- `Widget.setRemoteConfig(config, widgetKey?, appGroup?)`: Cấu hình URL API để Widget tự động gọi ngầm cập nhật dữ liệu mới kể cả khi người dùng đã vuốt tắt (Kill) App.
- `Widget.reloadAll()`: Yêu cầu iOS/Android vẽ lại toàn bộ Widget ngay lập tức.
- `Widget.reload(kind)`: Vẽ lại 1 Widget cụ thể.
- `Widget.getInteractiveState(widgetKey?, appGroup?)`: Đọc trạng thái tương tác hiện tại trên Widget (`activePage`, `toggledItems`, `lastSyncTime`, `remoteVariables`).
- `Widget.onWidgetAction(cb)`: Lắng nghe khi người dùng bấm nút trên Widget hoặc Notification.

### 3. `SharedStorage` API
- `SharedStorage.set(key, value, appGroup?)`: Lưu chuỗi hoặc JSON vào bộ nhớ chung App Group / SharedPreferences.
- `SharedStorage.get<T>(key, appGroup?)`: Đọc dữ liệu từ bộ nhớ chung.
- `SharedStorage.remove(key, appGroup?)`: Xóa 1 khóa.
- `SharedStorage.clear(appGroup?)`: Xóa sạch dữ liệu chung (dùng khi Logout).

### 4. `AudioPlayer` API (Phát nhạc & Kiểm thử sóng Equalizer)
- `AudioPlayer.play(url)`: Phát bài nhạc trực tiếp từ URL (`.mp3`, `.m4a`, `.aac`, `.wav`) qua loa máy (iOS `AVPlayer` / Android `MediaPlayer`).
- `AudioPlayer.pause()`: Tạm dừng bài nhạc.
- `AudioPlayer.resume()`: Tiếp tục phát bài nhạc.
- `AudioPlayer.stop()`: Dừng bài nhạc và giải phóng bộ nhớ.
- `AudioPlayer.getStatus()`: Lấy trạng thái phát (`{ isPlaying, currentTime, duration }`).

---

## 4. Xây dựng Giao diện Động (Declarative UI Engine)

Thư viện hỗ trợ song song **2 phong cách viết giao diện** tùy theo sở thích và thói quen của bạn:
1. **Phong cách 1: Dạng JSX / TSX (`<VStack>`, `<Text>`, `<Button>`)** — Giống hệt như viết Component trong React Native, trực quan và dễ bảo trì khi layout lồng ghép nhiều tầng. Hỗ trợ đầy đủ thuộc tính `style` và mảng style có điều kiện.
2. **Phong cách 2: Dạng Hàm lồng nhau (`UI.VStack(...)`)** — Phong cách Functional gọn gàng, không cần import nhiều thẻ JSX.

Cả 2 cách đều được biên dịch tự động sang cùng một kiến trúc Native (SwiftUI trên iOS và 2D Canvas trên Android).

---

### Phong cách 1: Xây dựng bằng JSX / TSX Component

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Widget, VStack, HStack, Text, Badge, Progress, Button } from 'react-native-live-widgets';

export const MyWidgetLayout = (
  <VStack style={styles.card}>
    <HStack style={styles.header}>
      <Text style={styles.title}>Vào ca sáng</Text>
      <Badge text="07:54 (Hợp lệ)" backgroundColor="#064E3B" textColor="#6EE7B7" />
    </HStack>
    <Progress value={0.75} style="segmented" segments={4} tintColor="#38BDF8" height={8} />
    <Button title="Làm mới dữ liệu" actionId="refresh" fullWidth />
  </VStack>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  header: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
```

---

### Xem Trước Widget Trong App (`<WidgetPreview>` / `<VoltraWidgetPreview>`)

Bạn có thể nhúng widget vào trực tiếp bất kỳ màn hình nào của ứng dụng để xem trước giao diện và bấm thử các nút tương tác mà không cần phải thoát ra Home Screen:

```tsx
import { WidgetPreview, VStack, HStack, Text, Button } from 'react-native-live-widgets';

export function PreviewScreen() {
  return (
    <WidgetPreview
      size="medium"                // 'small' | 'medium' | 'large' | 'lockScreen'
      showBadge={true}             // Hiển thị 'Medium • 338×158'
      interactiveSizeSwitch={true} // Bật thanh tab để chuyển nhanh small/medium/large
      onAction={(actionId) => {
        console.log('Action được bấm trên widget:', actionId);
      }}
    >
      <VStack padding={16} backgroundColor="#0F172A" borderRadius={20}>
        <HStack justifyContent="spaceBetween">
          <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Tiến độ công việc</Text>
          <Text fontSize={12} color="#38BDF8">75%</Text>
        </HStack>
        <Button title="Cập nhật" actionId="refresh" fullWidth />
      </VStack>
    </WidgetPreview>
  );
}
```

---

### Phong cách 2: Dạng Hàm (`UI.StyleSheet` & Functional DSL)
Tương tự như `StyleSheet.create` trong React Native, bạn có thể gom nhóm các style định dạng lại để tái sử dụng nhiều nơi, giữ code sạch sẽ và hỗ trợ truyền mảng style có điều kiện:

```typescript
import { UI } from 'react-native-live-widgets';

const styles = UI.StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    spacing: 8,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  errorText: {
    color: '#EF4444',
  },
});

// Sử dụng đơn lẻ hoặc mảng có điều kiện (conditional styling):
UI.VStack(
  styles.card,
  UI.Text('TIÊU ĐỀ BÁO CÁO', styles.headerText),
  UI.Text('Trạng thái ca làm', [styles.titleText, isError && styles.errorText])
);
```

### `UI.VStack` & `UI.HStack`
Khối bố cục dọc (`VStack`) và ngang (`HStack`):
```typescript
UI.VStack(
  {
    padding: 14,
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    spacing: 8,
    alignItems: 'leading', // 'leading' | 'center' | 'trailing'
  },
  // Các phần tử con...
)
```

### `UI.Text`
Hiển thị văn bản hỗ trợ tự động thay thế biến động `{{field}}` từ Background API và tự gạch ngang chữ khi gắn `strikethroughWhenToggled`:
```typescript
UI.Text('Check-in lúc {{checkinTime}}', {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 'bold',
  maxLines: 1,
  strikethroughWhenToggled: 'task_1', // Tự động gạch ngang và làm mờ khi 'task_1' được tick!
})
```

### `UI.Timer` (Realtime không tốn pin)
Đồng hồ đếm ngược (`countdown`) hoặc đếm lên (`countup`) tự chạy mượt mà trên cả Lock Screen, Dynamic Island và Home Screen Widget:
```typescript
UI.Timer(targetTimestampInSeconds, {
  mode: 'countdown',
  color: '#FFA500',
  fontSize: 16,
  fontWeight: 'bold',
  showsHours: false, // Tắt hiển thị giờ để gọn gàng trên Dynamic Island Compact
})
```

### `UI.Progress` (Thanh tiến trình đa dạng)
Hỗ trợ 3 kiểu dáng: `'bar'` (thanh liền), `'segmented'` (thanh chia nhiều chặng kiểu giao hàng/ca làm việc), và `'circular'` (vòng tròn tiến độ):
```typescript
// 1. Thanh chia 4 chặng (Segmented)
UI.Progress({
  style: 'segmented',
  segments: 4,
  currentSegment: 3, // Hoặc truyền value: 0.75
  tintColor: '#10B981',
  trackColor: '#374151',
  segmentSpacing: 6,
  height: 8,
})

// 2. Vòng tròn tiến độ (Circular)
UI.Progress({
  style: 'circular',
  value: 0.68,
  tintColor: '#10B981',
  trackColor: '#064E3B',
  height: 64,
  showPercentage: true,
})
```

### `UI.Equalizer` (Sóng nhạc chuyển động liên tục)
Component sóng nhạc / âm thanh động chuyên dụng. Trên Dynamic Island và Live Activity màn hình khóa (iOS), component tự động chạy nhịp sóng dao động liên tục thời gian thực (Native TimelineView Animation) mượt mà mà không tốn pin; trên Android và Home Screen hiển thị các thanh sóng nhạc trực quan:
```typescript
// 1. Dùng trong Dynamic Island (compactTrailing hoặc minimal)
UI.Equalizer({
  isPlaying: true,        // true: sóng nhảy liên tục | false: đứng yên
  barCount: 4,            // Số thanh sóng nhạc (2 đến 8)
  tintColor: '#10B981',   // Màu sắc thanh sóng (Spotify / Apple Music green)
  height: 14,             // Chiều cao thanh
  barWidth: 3,            // Độ rộng mỗi thanh
  spacing: 2,             // Khoảng cách giữa các thanh
})

// 2. Dùng trong Widget nghe nhạc ngoài Home Screen / Lock Screen
UI.Equalizer({
  isPlaying: true,
  barCount: 5,
  tintColor: '#FFFFFF',
  height: 18,
})
```

### `UI.Image` (URL mạng, Base64, File, Asset & SF Symbols)
Hỗ trợ truyền ảnh từ **5 nguồn khác nhau** trên cả iOS và Android. Khi truyền `url` (`https://...`), thư viện sẽ tự động tải ngầm, nén ảnh tối ưu RAM (`maxDimension = 360px` để không bao giờ vượt giới hạn 30MB của iOS WidgetKit) và lưu vào bộ nhớ đệm:
```typescript
// 1. Ảnh từ URL mạng (Avatar tròn có viền)
UI.Image({
  url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  width: 44,
  height: 44,
  cornerRadius: 999,       // 999 = Bo tròn hoàn toàn (Circle)
  contentMode: 'fill',     // 'fill' | 'fit'
  borderColor: '#60A5FA',  // Màu viền
  borderWidth: 2,          // Độ dày viền
})

// 2. Ảnh từ chuỗi Base64 (QR Code, Barcode, Badge...)
UI.Image({
  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
  width: 36,
  height: 36,
  cornerRadius: 8,
})

// 3. Icon hệ thống (SF Symbols trên iOS / Vector Mapping trên Android)
UI.Image({
  systemName: 'bicycle',
  tintColor: '#FB923C',
  width: 18,
  height: 18,
})
```

### `UI.Button` (Nút bấm tương tác trực tiếp trên Widget)
Cho phép người dùng thao tác ngay trên mặt Widget (iOS 17+ `AppIntents` & Android `PendingIntent` Hit Zones) mà **không cần mở ứng dụng**:
```typescript
// 1. Nút chuyển sang trang/tab khác trên Widget
UI.Button({
  title: 'Việc cần làm →',
  actionId: 'page:tasks', // Hoặc 'page:next' / 'page:prev'
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  fontSize: 11,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 8,
})

// 2. Nút Tick hoàn thành công việc ngay trên Widget
UI.Button({
  title: 'Duyệt PR module chấm công',
  actionId: 'toggle:task_1', // Tự động đổi [ ] <-> [✓]
  backgroundColor: '#F8FAFC',
  activeBackgroundColor: '#DCFCE7',
  color: '#1E293B',
  activeColor: '#15803D',
})

// 3. Nút gọi API làm mới dữ liệu ngầm ngay lập tức
UI.Button({
  title: '↻ Làm mới',
  actionId: 'refresh',
  backgroundColor: '#1E293B',
  color: '#60A5FA',
})
```

> [!IMPORTANT]
> **Khuyến nghị kiến trúc khi xử lý Action lúc App bị Force-Kill (Termination):**
> - **Trên iOS:** Khi người dùng vuốt tắt ứng dụng hoàn toàn (Force-Kill), JavaScript Engine (Hermes/JSC) sẽ bị tiêu diệt. Lúc này, việc bấm nút trên Widget sẽ do Native Swift (`AppIntent`) xử lý độc lập và ghi nhận trạng thái vào App Group. JS callback (`registerActionHandler`) sẽ **không thể chạy** cho đến khi ứng dụng được người dùng mở lại.
> - **Trên Android:** Thư viện hỗ trợ `HeadlessJsTaskService` để thức tỉnh JS thread trong nền. Tuy nhiên, trên một số dòng máy có cơ chế quản lý pin nghiêm ngặt (MIUI, ColorOS, OneUI), tiến trình nền vẫn có thể bị hạn chế.
> - **Quy tắc thiết kế cho Production:** Với các nghiệp vụ sống còn (như **Chấm công**, thanh toán, gửi đơn từ quan trọng), không nên thiết kế nghiệp vụ phụ thuộc 100% vào việc JS callback phải chạy khi app bị kill. Hãy ưu tiên thiết kế theo mô hình **Offline-First & Local State Queue**: Native Widget ghi nhận hành động vào `SharedStorage` (App Group / SharedPreferences), và khi người dùng khởi động lại ứng dụng, `App.tsx` sẽ đọc queue này và đồng bộ an toàn lên Server!

### `UI.ZStack`, `UI.Grid` & `UI.Divider` (Bố cục nâng cao)
```typescript
// 1. ZStack: Xếp chồng các lớp (Overlay)
UI.ZStack(
  { zAlignment: 'bottomTrailing' },
  UI.Image('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', { width: 44, height: 44, borderRadius: 22 }),
  UI.Badge('●', { backgroundColor: '#10B981', textColor: '#FFFFFF', fontSize: 8 })
)

// 2. Grid: Chia lưới nhiều cột đều nhau (Bảng thống kê 2x2 KPI)
UI.Grid(
  { columns: 2, columnSpacing: 8, rowSpacing: 8 },
  UI.VStack({ padding: 8, backgroundColor: '#1E293B', borderRadius: 8 }, UI.Text('Doanh thu', { fontSize: 10, color: '#94A3B8' }), UI.Text('4.85 Tỷ', { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' })),
  UI.VStack({ padding: 8, backgroundColor: '#1E293B', borderRadius: 8 }, UI.Text('Đơn hàng', { fontSize: 10, color: '#94A3B8' }), UI.Text('1,420', { fontSize: 14, fontWeight: 'bold', color: '#34D399' }))
)

// 3. Divider: Đường kẻ phân cách ngang/dọc
UI.Divider({ color: '#334155', thickness: 1, marginVertical: 4 })
```

### `UI.Gauge` & `UI.Chart` (Đồng hồ đo KPI & Biểu đồ Cột / Đường Sparkline)
```typescript
// 1. Đồng hồ đo tốc độ / KPI cung tròn 240° (Gauge)
UI.Gauge(0.86, {
  size: 66,
  tintColor: '#38BDF8',
  trackColor: '#1E293B',
  textColor: '#F8FAFC',
  labelColor: '#94A3B8',
  valueText: '86%',
  label: 'KPI Quý',
})

// 2. Biểu đồ Cột ('bar') hoặc Đường xu hướng ('line')
UI.Chart([42, 58, 51, 74, 68, 92, 108], {
  style: 'bar', // 'bar' | 'line'
  labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  tintColor: '#38BDF8',
  secondaryColor: '#1E3A8A',
  labelColor: '#94A3B8',
  height: 48,
})
```

### `UI.Toggle`, `UI.Badge` & `UI.Link`
```typescript
// 1. Toggle: Ô tích Checkbox hoặc Công tắc gạt Switch ngay trên mặt Widget
UI.Toggle('Duyệt báo cáo doanh thu tuần', {
  actionId: 'toggle:kpi_approve',
  style: 'checkbox', // 'checkbox' | 'switch'
  tintColor: '#38BDF8',
  textColor: '#F8FAFC',
})

// 2. Badge: Nhãn trạng thái dạng viên thuốc (Pill / Capsule)
UI.Badge('+18% Vượt chỉ tiêu', {
  backgroundColor: '#064E3B',
  textColor: '#34D399',
  fontSize: 10,
})

// 3. Link: Biến cả một khối giao diện thành vùng bấm mở Deep Link hoặc chạy Action
UI.Link(
  { deepLink: 'livewidgets://analytics/q4', padding: 10, backgroundColor: '#1E293B', borderRadius: 10 },
  UI.Text('Xem chi tiết báo cáo →', { fontSize: 12, fontWeight: 'bold', color: '#38BDF8' })
)
```

### `UI.Custom` & `DynamicNodeRegistry` (Tự mở rộng Component Native tùy ý bằng Swift / Kotlin)
Nếu bạn muốn tự viết một Component riêng bằng **SwiftUI** hoặc **Kotlin Canvas** mà không cần sửa code lõi của thư viện:

1. **Đăng ký bên iOS (Swift — trong `LiveWidgetsBundle.swift`):**
```swift
import SwiftUI
import react_native_live_widgets

// Đăng ký Custom View theo tên "WeatherCard"
DynamicNodeRegistry.shared.registerView("WeatherCard") { node in
  let city = node.props?["city"]?.stringValue ?? "Hà Nội"
  let temp = node.props?["temp"]?.stringValue ?? "28°C"
  HStack {
    Image(systemName: "sun.max.fill").foregroundColor(.yellow)
    Text("\(city): \(temp)").font(.headline)
  }
}
```

2. **Đăng ký bên Android (Kotlin — trong `MainApplication.onCreate()`):**
```kotlin
import com.reactnativeliveactivity.DynamicNodeRegistry

DynamicNodeRegistry.register(
  componentName = "WeatherCard",
  heightDp = { 44f },
  drawer = { context, canvas, rect, props, density ->
    // Tự vẽ tự do lên Android Canvas
  }
)
```

3. **Gọi trực tiếp từ React Native (`App.tsx`):**
```typescript
UI.Custom('WeatherCard', { city: 'TP.HCM', temp: '31°C' })
```

---

## 5. Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16, 17)

> [!NOTE]
> **Khác biệt nền tảng: iOS Dynamic Island vs Android Live Updates:**
> - **Trên iOS:** Khối cấu hình `dynamicIsland` tương tác trực tiếp với phần cứng Dynamic Island (viên thuốc trên iPhone 14 Pro trở lên) thông qua ActivityKit và SwiftUI (`compactLeading`, `compactTrailing`, `minimal`, `expanded`).
> - **Trên Android:** Do hệ điều hành Android gốc không có phần cứng Dynamic Island của Apple, cấu hình này được thư viện tự động ánh xạ sang **Ongoing Promoted Notification (`Notification.ProgressStyle`)** hiển thị thường trực trên thanh trạng thái với đầy đủ Avatar tròn, thanh tiến trình chia chặng và nút bấm tương tác.

```typescript
dynamicIsland: {
  compactLeading: UI.HStack(
    { spacing: 4 },
    UI.Image({
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
      width: 18,
      height: 18,
      cornerRadius: 999,
    }),
    UI.Text('08:02', { color: '#60A5FA', fontSize: 12, fontWeight: 'bold' })
  ),
  compactTrailing: UI.Timer(shiftEndTimestamp, {
    mode: 'countdown',
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: 'bold',
    showsHours: false,
  }),
  minimal: UI.Image({ systemName: 'clock.fill', tintColor: '#60A5FA', width: 14, height: 14 }),
  expanded: {
    leading: UI.Text('ĐANG TRONG CA', { color: '#60A5FA', fontSize: 12, fontWeight: 'bold' }),
    trailing: UI.Timer(shiftEndTimestamp, { mode: 'countdown', color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }),
    bottom: UI.VStack(
      { spacing: 6 },
      UI.Progress({ style: 'segmented', segments: 4, value: 0.75, tintColor: '#3B82F6', height: 6 }),
      UI.Text('Check-in: Văn phòng Quận 1', { color: '#94A3B8', fontSize: 11 })
    ),
  },
}
```

---

## 6. Tạo Home Screen Widget Đa Trang & Tương Tác bằng JavaScript

Bạn có thể truyền thuộc tính `pages` vào `Widget.setLayout` để tạo nhiều màn hình (Tabs/Pages) ngay bên trong 1 Widget duy nhất:

```typescript
await Widget.setLayout('main', {
  initialPage: 'overview',
  // Mặc định (trang Tổng quan)
  medium: overviewPageNode,
  // Khai báo các trang để chuyển qua lại bằng actionId: 'page:<tên_trang>'
  pages: {
    overview: {
      small: overviewSmallNode,
      medium: overviewMediumNode,
      large: overviewLargeNode,
    },
    tasks: {
      small: tasksSmallNode,
      medium: tasksMediumNode,
      large: tasksLargeNode,
    },
    stats: {
      small: statsSmallNode,
      medium: statsMediumNode,
      large: statsLargeNode,
    },
  },
});
```

### Lock Screen Widgets trên iOS
Từ iOS 16+, WidgetKit hỗ trợ 3 kích thước đặc biệt trên màn hình khóa (Lock Screen):
- `accessoryRectangular`: Khung chữ nhật nằm ngang phía dưới đồng hồ.
- `accessoryCircular`: Biểu tượng / chỉ số tròn nhỏ.
- `accessoryInline`: Dòng chữ vắn tắt nằm ngay phía trên đồng hồ.

> [!NOTE]
> Thư viện tự động loại bỏ nền opaque (`backgroundColor`) và căn chỉnh padding chuẩn xác để widget màn hình khóa hiển thị tự nhiên với hệ số trong suốt (vibrancy) của iOS.

```typescript
await Widget.setLayout('main', {
  // Widget Home Screen
  small: smallNode,
  medium: mediumNode,
  large: largeNode,

  // Widget Lock Screen (iOS 16+)
  accessoryRectangular: UI.HStack(
    { spacing: 6 },
    UI.VStack(
      { spacing: 2 },
      UI.Text('Starboy', { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }),
      UI.Text('The Weeknd', { fontSize: 11, color: '#CCCCCC' })
    ),
    UI.Spacer(),
    UI.Equalizer({ isPlaying: true, barCount: 4, tintColor: '#FFFFFF', height: 16 })
  ),
  accessoryCircular: UI.VStack(
    { spacing: 2 },
    UI.Equalizer({ isPlaying: true, barCount: 4, tintColor: '#FFFFFF', height: 18 }),
    UI.Text('MUSIC', { fontSize: 8, fontWeight: 'bold', color: '#FFFFFF' })
  ),
  accessoryInline: UI.Text('♪ Starboy • The Weeknd', { fontSize: 12, fontWeight: 'medium' }),
});
```

### Ghim Tiện ích vào Màn hình chính trong App (Android In-App Pin)
Trên Android 8.0+ (API 26+), bạn có thể hiển thị nút trong ứng dụng để người dùng bấm ghim ngay tiện ích ra màn hình chính mà không cần hướng dẫn người dùng nhấn giữ màn hình thủ công:

```typescript
import { Widget } from 'react-native-live-widgets';

// Kiểm tra xem Launcher hiện tại có hỗ trợ ghim hay không
const isSupported = await Widget.isPinSupported();

if (isSupported) {
  // Yêu cầu hệ điều hành hiện hộp thoại ghim Widget
  const success = await Widget.requestPin();
  if (success) {
    console.log('Hệ thống đã nhận yêu cầu ghim tiện ích');
  }
}
```

---

## 7. Đồng bộ API Ngầm cho Widget kể cả khi Kill App (`Widget.setRemoteConfig`)

Khi ứng dụng bị người dùng vuốt tắt hoàn toàn (Kill App), JavaScript thread của React Native sẽ dừng. Để Widget vẫn luôn tự động gọi API lấy dữ liệu mới từ Server:

```typescript
// Cú pháp tiêu chuẩn đầy đủ:
await Widget.setRemoteConfig('main', {
  url: 'https://api.yourcompany.com/v1/widget-summary',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  refreshIntervalMinutes: 15, // Chu kỳ gọi ngầm ở tầng OS (alias: intervalMinutes)
}, APP_GROUP);

// Hoặc cú pháp ngắn gọn (mặc định widgetKey = 'main'):
await Widget.setRemoteConfig({
  url: 'https://api.yourcompany.com/v1/widget-summary',
  refreshIntervalMinutes: 15,
}, APP_GROUP);
```

- **Cách hoạt động:**
  - Trên **iOS**: `DynamicWidgetProvider` tự động gọi API ngầm mỗi `intervalMinutes` (hoặc ngay lập tức khi bấm nút `actionId: 'refresh'`), lấy JSON trả về và điền vào các biến `{{ten_bien}}` trong cây UI DSL.
  - Trên **Android**: `AlarmManager` tự động đánh thức `LiveActivityReceiver` (`ACTION_WIDGET_SYNC`), tải JSON mới và vẽ lại `DynamicHomeScreenWidgetProvider`.
  - Biến đặc biệt `{{_lastSyncTime}}` luôn tự động cập nhật thành giờ đồng bộ mới nhất (`HH:mm:ss`).

> [!NOTE]
> **Về chu kỳ gọi API và giới hạn tài nguyên hệ điều hành (Widget Budget):**
> - Tham số `intervalMinutes: 15` là thời gian mong muốn đề xuất cho hệ điều hành. Cả iOS và Android đều áp dụng cơ chế quản lý năng lượng nghiêm ngặt:
>   - **iOS WidgetKit Budget:** Apple cấp hạn mức reload Widget (khoảng 40 - 70 lần/ngày). Nếu thiết bị bật chế độ *Tiết kiệm pin (Low Power Mode)* hoặc đã cạn budget trong ngày, iOS có thể giãn cách thời gian gọi API.
>   - **Android Doze Mode:** Hệ thống sẽ gom các tác vụ nền định kỳ để chạy cùng lúc nhằm tiết kiệm pin.
> - **Khuyến nghị:** Nếu ứng dụng của bạn yêu cầu cập nhật chính xác từng giây/phút (như vị trí tài xế, tiến trình đơn hàng), **Server Push Notification (APNs / FCM)** là giải pháp tối ưu nhất, tính năng polling `setRemoteConfig` là giải pháp bổ trợ định kỳ.

---

## 8. Quản lý 3 loại Push Token (APNs & FCM) cho Live Activity

Để hệ thống Backend có thể điều khiển Live Activity từ xa:
1. **`devicePushToken`**: APNs Device Token (iOS) / FCM Token (Android) cho thông báo đẩy thường.
2. **`pushToStartToken` (iOS 17.2+)**: Token cho phép Server tự bật mới một Live Activity từ xa khi App đang tắt.
3. **`activityUpdateToken`**: Token riêng của từng phiên Live Activity đang chạy để Server đẩy bản cập nhật hoặc kết thúc phiên đó.

```typescript
// 1. Xin quyền và đăng ký nhận token
await LiveActivity.registerForPushNotifications();

// 2. Lấy toàn bộ 3 loại token hiện có
const tokens = await LiveActivity.getAllPushTokens();
console.log(tokens.devicePushToken, tokens.pushToStartToken, tokens.activityUpdateToken);

// 3. Lắng nghe token mới được cấp hoặc xoay tự động
const sub1 = LiveActivity.onDevicePushTokenChange(({ token }) => {
  api.syncDeviceToken(token);
});
const sub2 = LiveActivity.onPushToStartTokenChange((token) => {
  api.syncPushToStartToken(token);
});
const sub3 = LiveActivity.onActivityUpdateTokenChange(({ activityId, token }) => {
  api.syncActivityUpdateToken(activityId, token);
});
```

---

## 9. State Machine & Tự động cập nhật theo pha (Phases)

```typescript
phases: [
  {
    id: 'warning_phase',
    triggerTimestamp: targetTimestamp - 300, // Trước 5 phút
    alertTitle: 'Sắp trễ ca!',
    alertBody: 'Chỉ còn 5 phút nữa là vào ca làm!',
  },
  {
    id: 'late_phase',
    triggerTimestamp: targetTimestamp, // Đã đến giờ
    alertTitle: 'Đã trễ ca!',
    alertBody: 'Bạn đã quá giờ ca làm việc!',
  },
]
```

---

## 10. Cấu trúc Payload Server Push (APNs & FCM)

### Headers gửi lên APNs (iOS Live Activity):
- `apns-push-type`: `liveactivity`
- `apns-topic`: `<bundle_id>.push-type.liveactivity`
- `apns-priority`: `10`

### Body JSON gửi lên APNs:
```json
{
  "aps": {
    "timestamp": 1711890000,
    "event": "update",
    "content-state": {
      "layoutJson": "{\"lockScreen\":{...},\"dynamicIsland\":{...}}"
    },
    "alert": {
      "title": "Đơn hàng đã giao!",
      "body": "Chúc bạn ngon miệng."
    }
  }
}
```

---

## 11. Xử lý sự cố thường gặp (Troubleshooting)

1. **Widget ngoài màn hình chính hiển thị chữ "Chọn 1 mẫu UI trong app để hiển thị":**
   - Kiểm tra App Group ID giữa Main App và Widget Extension đã khớp nhau chưa (mặc định thư viện tự động dò `group.<bundle_id>`).
   - Đảm bảo đã gọi `await Widget.setLayout('main', ...)` trong code React Native.
2. **Dynamic Island Compact bị tràn chiều ngang khi dùng `UI.Timer`:**
   - Truyền `showsHours: false` vào `UI.Timer` ở `compactTrailing`. Thư viện đã tự động giới hạn khung `compactWidth` để không làm giãn viên thuốc Dynamic Island.
3. **Ảnh từ URL mạng (`https://...`) không hiện trên Widget:**
   - Đảm bảo URL ảnh là `https://` hợp lệ. Thư viện sẽ tự động tải, nén xuống `360px` và reload lại Widget ngay khi tải xong.

---

---

## 12. Hệ thống Styling Modifiers & Bảng Năng lực Nền tảng (Capability & Fallback Matrix)

### 12.1. Styling Modifiers nâng cao
Bộ thuộc tính thiết kế nền tảng giúp Widget và Live Activity đạt chuẩn giao diện iOS & Android chuyên nghiệp:

1. **🌈 Gradient (Dải màu chuyển sắc)**:
   ```tsx
   <VStack
     gradient={{
       colors: ['#1E3A8A', '#3B82F6'],
       startPoint: { x: 0, y: 0 },
       endPoint: { x: 1, y: 1 },
       angle: 45
     }}
     padding={16}
   >
     <Text typography="headline" color="#FFFFFF">Thẻ chuyển sắc</Text>
   </VStack>
   ```
   > [!TIP]
   > **Graceful Fallback**: Nếu hệ điều hành hoặc thiết bị cũ không hỗ trợ vẽ gradient, engine tự động lấy màu đầu tiên trong danh sách `colors` làm màu nền đơn sắc (`backgroundColor`) thay thế, hoàn toàn không gây lỗi giao diện.

2. **🔲 Border & Dashed Lines (Đường viền nét đứt)**:
   ```tsx
   <VStack
     borderWidth={1.5}
     borderColor="#38BDF8"
     borderStyle="dashed"
     borderRadius={12}
     padding={12}
   >
     <Text fontSize={12} color="#94A3B8">Khu vực kéo thả hoặc ghi chú</Text>
   </VStack>
   ```

3. **🌑 Shadow (Đổ bóng có chiều sâu)**:
   ```tsx
   <Button
     title="Xác nhận"
     backgroundColor="#2563EB"
     shadowColor="#2563EB"
     shadowRadius={6}
     shadowOpacity={0.4}
     shadowOffset={{ x: 0, y: 3 }}
   />
   ```

4. **🔤 Typography & Dynamic Type (Cỡ chữ chuẩn & Trợ năng)**:
   - Các bậc cỡ chữ chuẩn: `largeTitle` (34), `title1` (28), `title2` (22), `title3` (20), `headline` (17 bold), `body` (17 regular), `callout` (16), `subheadline` (15), `footnote` (13), `caption1` (12), `caption2` (11).
   - `fontDesign`: `'default' | 'monospaced' | 'rounded' | 'serif'`.
   - `dynamicType`: Mặc định `true` — tự động co giãn theo cỡ chữ Trợ năng mà người dùng cài đặt trong Cài đặt hệ thống (Accessibility Font Size).

5. **🌗 Tinted / Dark Mode (Chế độ đổi màu iOS 18 & Material You)**:
   ```tsx
   <Text color={{ light: '#0F172A', dark: '#F8FAFC', tinted: '#38BDF8' }}>
     Nội dung tự thích ứng màu sắc
   </Text>
   ```

6. **🌍 Hỗ trợ bố cục quốc tế hoá RTL**:
   ```tsx
   <HStack direction="rtl" isRTL={true} spacing={8}>
     <Text>مرحبا بك</Text>
   </HStack>
   ```

---

### 12.2. Bảng Tra cứu Năng lực Nền tảng (Platform Capability & Fallback Matrix)

Thay vì tuyên bố chung chung "100% parity", engine phân định rõ ràng các tính năng thực tế được hỗ trợ trên từng hệ điều hành và cơ chế tự động chuyển đổi an toàn (Graceful Fallback):

| Tính năng / Thuộc tính | iOS WidgetKit | iOS Live Activity | Android Ongoing Notification | Android Home Widget | Cơ chế Graceful Fallback khi không hỗ trợ |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Bố cục Khai báo (`VStack`/`HStack`/`Grid`)** | ✅ SwiftUI | ✅ SwiftUI | ✅ Canvas | ✅ 2D Canvas | Tương thích pixel 100% hai hệ máy |
| **Linear / Radial Gradient** | ✅ SwiftUI | ✅ SwiftUI | ✅ Shader | ✅ Shader | Tự động lấy màu đầu tiên trong `colors` làm màu nền đơn sắc |
| **Bóng đổ Thẻ / Chữ (Shadow)** | ✅ SwiftUI | ✅ SwiftUI | ⚠️ Text Shadow | ✅ `setShadowLayer` | Tự động hạ cấp sang viền mỏng hoặc Android Elevation |
| **Viền nét đứt (Dashed / Dotted)** | ✅ StrokeStyle | ✅ StrokeStyle | ⚠️ Nét liền | ✅ `DashPathEffect` | Tự động hiển thị viền nét liền `solid` |
| **Dynamic Type (Cỡ chữ Trợ năng)** | ✅ Native | ✅ Native | ✅ `fontScale` | ✅ `fontScale` | Tự động nhân tỉ lệ fontScale của hệ điều hành |
| **Đảo chiều RTL (Ả Rập, Hebrew)** | ✅ Native | ✅ Native | ✅ RTL | ✅ RTL | Tự động đảo thứ tự hàng ngang sang `row-reverse` |
| **Accessibility (TalkBack / VoiceOver)** | ✅ Native VoiceOver | ✅ Native VoiceOver | ✅ Notification Text | ✅ A11y Summary + Hit-Zones | Tổng hợp ngữ nghĩa toàn cây gán vào `contentDescription` |
| **Chế độ Tinted (iOS 18+)** | ✅ Accentable | Không áp dụng | Không áp dụng | ✅ Material You | Tự động dùng màu `dark`/`light` trên iOS 17 trở xuống |
| **Nút bấm tương tác chạy ngầm** | ✅ iOS 17+ AppIntent | ✅ iOS 17+ | ✅ PendingIntent | ✅ PendingIntent | Lưu trạng thái SharedStorage và kích hoạt làm mới giao diện |

---

### 12.3. ♿ Lớp Trợ năng & Ngữ nghĩa (Accessibility Fallback Layer)

Để đảm bảo người khiếm thị hoặc người sử dụng công cụ đọc màn hình (**VoiceOver trên iOS**, **TalkBack trên Android**) tiếp cận được đầy đủ thông tin trên Widget, engine cung cấp các thuộc tính Trợ năng chuẩn:

```tsx
<VStack padding={16} backgroundColor="#0F172A">
  {/* Tiêu đề với vai trò Header */}
  <Text
    typography="title2"
    accessibilityRole="header"
    accessibilityLabel="Bảng điều khiển chấm công"
  >
    BẢNG ĐIỀU KHIỂN CHẤM CÔNG
  </Text>

  {/* Chỉ số tiến độ với nhãn và giá trị âm thanh */}
  <Progress
    value={0.86}
    accessibilityLabel="Tiến độ hoàn thành ca làm việc"
    accessibilityValue="86 phần trăm"
  />

  {/* Nút bấm với nhãn và gợi ý hành động */}
  <Button
    title="Check-in vào ca"
    actionId="CHECK_IN"
    accessibilityRole="button"
    accessibilityLabel="Check-in vào ca"
    accessibilityHint="Chạm hai lần để gửi yêu cầu chấm công"
  />

  {/* Phần tử trang trí (không đọc lên TalkBack/VoiceOver) */}
  <Image systemName="sparkles" accessible={false} />
</VStack>
```

#### Cơ chế hoạt động của Accessibility Fallback Layer (Phase 1):
1. **Trên iOS**: Map trực tiếp sang SwiftUI `.accessibilityLabel()`, `.accessibilityHint()`, `.accessibilityValue()`, `.accessibilityAddTraits()`. Nếu `accessible={false}`, áp dụng `.accessibilityHidden(true)`.
2. **Trên Android (Canvas 2D)**:
   - Toàn bộ cây DSL được duyệt đệ quy để trích xuất một bản tóm tắt âm thanh thông minh (`extractAccessibilitySummary`) và gán vào `contentDescription` của Canvas `ImageView`.
   - Các nút bấm tương tác (Hit-Zones) được gán `contentDescription` riêng rẽ kèm `accessibilityHint`, giúp TalkBack phát âm chuẩn xác khi người dùng chạm vào từng nút.
3. **Trong In-App Preview**: Tự động ánh xạ sang `accessible`, `accessibilityLabel`, `accessibilityHint`, `accessibilityRole` của React Native Web/Mobile.

---

### 12.4. Kiểm tra năng lực thiết bị qua code (`Widget.getCapabilities`)
```typescript
const caps = await Widget.getCapabilities();
console.log(`Đang chạy trên: ${caps.platform} (OS: ${caps.osVersion})`);

if (caps.supportsDynamicIsland) {
  console.log('Thiết bị có Dynamic Island (iPhone 14 Pro/15/16)!');
}

if (caps.supportsTintedMode) {
  console.log('Hỗ trợ chế độ Tinted Home Screen của iOS 18!');
}
```

---

## 📄 License
MIT © vu-tran
