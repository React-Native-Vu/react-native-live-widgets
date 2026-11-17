# HƯỚNG DẪN TÍCH HỢP VÀ SỬ DỤNG EXPO VỚI REACT-NATIVE-LIVE-WIDGETS 🚀

> 🌐 **Language:** **Tiếng Việt** | [English Guide (EXPO-GUIDE-EN.md)](./EXPO-GUIDE-EN.md) • [📖 Bare RN Guide (GUIDE-VI.md)](./GUIDE-VI.md) • [⚡ Kho mã nguồn mẫu Expo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo) • [🌐 Web Docs (Live Simulator)](https://react-native-vu.github.io/react-native-live-widgets/)

Tài liệu này hướng dẫn chi tiết cách tích hợp **`react-native-live-widgets`** vào ứng dụng **Expo (SDK 50, 51, 52, 58+)**, từ cấu hình Expo Config Plugin, thiết lập iOS WidgetKit/ActivityKit tự động, chạy trên Local Simulator bằng Expo Dev Client cho đến việc đóng gói phát hành qua **EAS Build**.

---

## MỤC LỤC
1. [Hiểu về Kiến trúc Expo & Native Widgets](#1-hiểu-về-kiến-trúc-expo--native-widgets)
2. [Kho Mã Nguồn Demo Chính Thức (LiveWidgetsExampleExpo)](#2-kho-mã-nguồn-demo-chính-thức-livewidgetsexampleexpo)
3. [Cài đặt & Thiết lập Từng bước](#3-cài-đặt--thiết-lập-từng-bước)
   - [Bước 1: Cài đặt package](#bước-1-cài-đặt-package)
   - [Bước 2: Cấu hình app.json (Expo Config Plugin)](#bước-2-cấu-hình-appjson-expo-config-plugin)
   - [Bước 3: Chạy Expo Prebuild](#bước-3-chạy-expo-prebuild)
   - [Bước 4: Chạy CLI Wizard cấu hình Widget Extension](#bước-4-chạy-cli-wizard-cấu-hình-widget-extension)
4. [Chạy và Kiểm thử trên Thiết bị & Giả lập](#4-chạy-và-kiểm-thử-trên-thiết-bị--giả-lập)
   - [Chạy trên iOS Simulator](#chạy-trên-ios-simulator)
   - [Chạy trên Android Emulator](#chạy-trên-android-emulator)
   - [Cách ghim Widget và bật Live Activity trên Simulator](#cách-ghim-widget-và-bật-live-activity-trên-simulator)
5. [Cấu hình EAS Build (Expo Application Services)](#5-cấu-hình-eas-build-expo-application-services)
   - [Đăng ký App Group & Extension trên Apple Developer](#đăng-ký-app-group--extension-trên-apple-developer)
   - [Cấu hình eas.json](#cấu-hình-easjson)
   - [Cung cấp Provisioning Profile cho Extension](#cung-cấp-provisioning-profile-cho-extension)
6. [Ví dụ Viết Widget & Live Activity bằng TypeScript trong Expo](#6-ví-dụ-viết-widget--live-activity-bằng-typescript-trong-expo)
7. [Xử lý Sự cố Thường gặp trên Expo (Troubleshooting)](#7-xử-lý-sự-cố-thường-gặp-trên-expo-troubleshooting)

---

## 1. Hiểu về Kiến trúc Expo & Native Widgets

### ⚠️ Tại sao không dùng được Expo Go?
- **Expo Go** là một ứng dụng native đóng gói sẵn các module cơ bản của Expo.
- **WidgetKit** (Home Screen Widgets) và **ActivityKit** (Live Activities & Dynamic Island) của iOS đòi hỏi phải có một tiến trình native độc lập gọi là **App Extension Target (`.appex`)**.
- Tương tự, Android yêu cầu cấu hình `AppWidgetProvider` và Service tùy chỉnh trong `AndroidManifest.xml`.
- Do đó, **Expo Go không hỗ trợ Widget native**. Bạn cần sử dụng **Expo Prebuild** hoặc **Expo Dev Client (`npx expo run:ios` / `npx expo run:android`)** hoặc **EAS Build**.

### 🌟 Giải pháp: Expo Config Plugin & Continuous Native Generation (CNG)
`react-native-live-widgets` cung cấp sẵn **Expo Config Plugin (`app.plugin.js`)** và **CLI Wizard**:
- Tự động chèn quyền `NSSupportsLiveActivities` và `NSSupportsLiveActivitiesFrequentUpdates` vào `Info.plist`.
- Tự động cấu hình `com.apple.security.application-groups` vào file Entitlements của iOS.
- Tự động bổ sung các quyền thông báo thời gian thực (`POST_NOTIFICATIONS`) trên Android.
- Tự động sinh và cấu hình target Xcode `LiveWidgetsExtension` chứa các template Swift và renderers mà **không cần mở Xcode thủ công**.

---

## 2. Kho Mã Nguồn Demo Chính Thức (LiveWidgetsExampleExpo)

Nếu bạn muốn trải nghiệm ngay một dự án mẫu Expo chuẩn mực đã được cấu hình sẵn 100%, hãy sử dụng kho mã nguồn:

👉 **GitHub Repository:** **[https://github.com/React-Native-Vu/LiveWidgetsExampleExpo](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)**

### ✨ Các Tính Năng Đã Tích Hợp Sẵn trong Repo Demo:
- 🚀 **Expo SDK 58 + React Native 0.88 + TypeScript 100%**.
- 🛠️ **Cấu hình sẵn Config Plugin & App Groups**: `group.com.reactnativevu.livewidgetsexampleexpo`.
- 🎨 **5 Mẫu Giao Diện Presets thực tế**:
  1. **📊 Executive KPI Dashboard**: Vòng tròn tiến độ doanh thu, biểu đồ tuần và đồng bộ dữ liệu thời gian thực.
  2. **☕ Coffee Delivery Tracker**: Đồng hồ đếm ngược giao hàng trên Dynamic Island và thẻ trạng thái Lock Screen.
  3. **✅ Interactive Task Checklist**: Tương tác tick chọn hoàn thành công việc trực tiếp ngay trên mặt Widget mà không cần mở app.
  4. **🎵 Music & Audio Player**: Sóng nhạc chuyển động liên tục (Equalizer Waveform) trên Dynamic Island.
  5. **✈️ Flight Status**: Tiến trình chuyến bay, cổng khởi hành và đếm ngược giờ cất cánh.
- 🔄 **Action Dispatcher 2 chiều**: Nhấn nút `[+]` hoặc `[-]` trên Home Widget để kích hoạt trực tiếp hàm TypeScript trong Expo App và render lại giao diện tức thì.

### ⚡ Cách Clone và Chạy Thử Ngay Lập Tức:
```bash
# 1. Clone repository
git clone https://github.com/React-Native-Vu/LiveWidgetsExampleExpo.git
cd LiveWidgetsExampleExpo

# 2. Cài đặt dependencies
npm install

# 3. Tạo thư mục native bằng Expo Prebuild
npx expo prebuild

# 4. Chạy script thiết lập Widget Extension tự động
npm run setup:widgets

# 5. Khởi chạy trên iOS Simulator hoặc Android Emulator
npx expo run:ios
# hoặc
npx expo run:android
```

---

## 3. Cài đặt & Thiết lập Từng bước

### Bước 1: Cài đặt package
Tại thư mục gốc của dự án Expo:
```bash
npx expo install react-native-live-widgets
```

---

### Bước 2: Cấu hình `app.json` (Expo Config Plugin)
Mở file `app.json` và bổ sung plugin `react-native-live-widgets`:

```json
{
  "expo": {
    "name": "MyExpoApp",
    "slug": "my-expo-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myexpoapp",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.myexpoapp"
    },
    "plugins": [
      [
        "react-native-live-widgets",
        {
          "appGroup": "group.com.yourcompany.myexpoapp",
          "enableLiveActivities": true,
          "frequentUpdates": true
        }
      ]
    ]
  }
}
```

#### Bảng tham số cấu hình Plugin:
| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `appGroup` | `string` | **Có** | `group.<bundleId>` | Tên App Group dùng để chia sẻ dữ liệu giữa App chính và WidgetKit |
| `enableLiveActivities` | `boolean` | Không | `true` | Cho phép khởi chạy Live Activity trên màn hình khoá và Dynamic Island |
| `frequentUpdates` | `boolean` | Không | `true` | Bật tần suất cập nhật cao cho Live Activity (iOS 16.2+) |

---

### Bước 3: Chạy Expo Prebuild
Sinh mã nguồn native cho iOS và Android:
```bash
npx expo prebuild
```
> [!NOTE]
> Lệnh này sẽ tạo thư mục `ios/` và `android/` với đầy đủ các cấu hình từ `app.json`.

---

### Bước 4: Chạy CLI Wizard cấu hình Widget Extension
Chạy công cụ tự động của thư viện để cấu hình target Extension trong Xcode:
```bash
npx react-native-live-widgets init --group group.com.yourcompany.myexpoapp
```

**CLI Wizard sẽ tự động thực hiện:**
1. Cấu hình App Group vào `<AppName>.entitlements`.
2. Tạo thư mục `ios/LiveWidgetsExtension/` chứa:
   - `LiveWidgetsBundle.swift` (tích hợp sẵn 5 mẫu giao diện tiện ích).
   - `Info.plist` (cho Extension).
   - `LiveWidgetsExtension.entitlements` (cho Extension).
   - Copy các Swift models và UI Renderers vào thư mục `Shared/`.
3. Nhúng target `LiveWidgetsExtension` vào file `project.pbxproj` của Xcode một cách chuẩn xác:
   - Thiết lập `PBXSourcesBuildPhase` riêng biệt (tránh hoàn toàn xung đột `@main` với `AppDelegate.swift`).
   - Liên kết các framework cần thiết (`WidgetKit.framework`, `SwiftUI.framework`).
   - Đặt target deployment là iOS 16.4+.
   - Nhúng extension vào ứng dụng chính (`Embed App Extensions`).
4. Thêm pod vào `Podfile` và tự động thực thi `pod install`.
5. Đảm bảo quyền thông báo trên Android (`POST_NOTIFICATIONS`).

> [!TIP]
> Bạn có thể thêm script tiện lợi vào `package.json` của dự án để tái sử dụng bất cứ lúc nào:
> ```json
> "scripts": {
>   "setup:widgets": "npx react-native-live-widgets init --group group.com.yourcompany.myexpoapp"
> }
> ```

---

## 3. Chạy và Kiểm thử trên Thiết bị & Giả lập

### Chạy trên iOS Simulator
```bash
npx expo run:ios
```
> [!IMPORTANT]
> - Đối với Dynamic Island: Hãy chọn Simulator có Dynamic Island như **iPhone 14 Pro, iPhone 15, iPhone 16 hoặc iPhone 17**.
> - Đối với Live Activities: Yêu cầu iOS 16.1 trở lên.

### Chạy trên Android Emulator
```bash
npx expo run:android
```

---

### Cách ghim Widget và bật Live Activity trên Simulator

#### 1. Thêm Home Screen Widget trên iOS Simulator:
1. Sau khi app khởi động thành công, nhấn phím `Cmd + Shift + H` để quay ra màn hình chính Simulator.
2. Nhấn và giữ một vùng trống trên màn hình cho đến khi các icon lắc lư.
3. Bấm vào nút dấu **[+]** ở góc trên bên trái màn hình.
4. Tìm kiếm tên ứng dụng của bạn (ví dụ: `LiveWidgetsExampleExpo`).
5. Chọn kiểu tiện ích mong muốn (`Tiện ích Live Widgets`, `Bộ đếm tương tác (TS)`, `Bảo mật & KPI Pro`, `Chấm công & Ca làm việc`, hoặc `Không gian đa trang`) rồi bấm **Thêm tiện ích (Add Widget)**.

#### 2. Kích hoạt Live Activity & Dynamic Island:
- Mở ứng dụng, bấm nút **"Bật Live Activity"**.
- Kéo từ trên màn hình xuống hoặc khoá máy (`Cmd + L`) để chiêm ngưỡng giao diện Live Activity trên Lock Screen và Dynamic Island!

---

## 4. Cấu hình EAS Build (Expo Application Services)

Khi đưa ứng dụng lên TestFlight, App Store hoặc phân phối nội bộ qua EAS Build, bạn cần lưu ý cấu hình signing cho cả App chính và App Extension.

### Đăng ký App Group & Extension trên Apple Developer
1. Đăng nhập vào [Apple Developer Portal (Certificates, Identifiers & Profiles)](https://developer.apple.com/account/resources/identifiers/list).
2. **App Groups**:
   - Chọn mục **App Groups** -> Bấm **[+]** để tạo mới (ví dụ: `group.com.yourcompany.myexpoapp`).
3. **App Identifiers**:
   - Vào **Identifiers** -> Chọn App ID chính của bạn (ví dụ: `com.yourcompany.myexpoapp`) -> Tích chọn **App Groups** -> Chọn App Group vừa tạo -> Bật **Live Activities**.
   - Bấm **[+]** để tạo thêm một Identifier mới cho Extension:
     - **Description:** `LiveWidgetsExtension`
     - **Bundle ID:** `Explicit` -> Đặt là `com.yourcompany.myexpoapp.LiveWidgetsExtension`.
     - Tích chọn **App Groups** và liên kết với App Group ở trên.

---

### Cấu hình `eas.json`
Một file `eas.json` chuẩn dành cho dự án có Widget Extension:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

### Cung cấp Provisioning Profile cho Extension
Khi chạy lệnh build trên EAS:
```bash
eas build --platform ios --profile production
```
EAS CLI sẽ tự động phát hiện target phụ `LiveWidgetsExtension` trong Xcode project và hỏi bạn có muốn EAS tự động sinh chứng chỉ / Provisioning Profile cho target đó hay không:
- Hãy chọn **Yes** để EAS tự động tạo và quản lý hồ sơ ký số cho cả Main App và Widget Extension.

---

## 5. Ví dụ Viết Widget & Live Activity bằng TypeScript trong Expo

Toàn bộ code giao diện và logic đều được viết bằng TypeScript trong dự án Expo (`App.tsx`):

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  LiveActivity,
  Widget,
  UI,
  SharedStorage,
} from 'react-native-live-widgets';

const APP_GROUP = 'group.com.yourcompany.myexpoapp';

export default function App() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    // Khởi tạo App Group
    SharedStorage.setAppGroup(APP_GROUP);

    // Đăng ký nhận sự kiện bấm nút hai chiều từ Widget
    const unsubscribe = LiveActivity.registerActionHandler((action, payload) => {
      console.log('User tương tác từ Widget:', action, payload);
      if (action === 'INCREMENT') {
        setCounter((prev) => {
          const next = prev + 1;
          updateHomeScreenWidget(next);
          return next;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const updateHomeScreenWidget = (val: number) => {
    Widget.reload('main', {
      layout: UI.VStack({
        alignment: 'center',
        padding: 16,
        background: '#0F172A',
        children: [
          UI.Text('BỘ ĐẾM EXPO', { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' }),
          UI.Text(`${val}`, { color: '#38BDF8', fontSize: 40, fontWeight: 'heavy' }),
          UI.HStack({
            spacing: 12,
            children: [
              UI.Button('+1 TĂNG', {
                action: 'INCREMENT',
                backgroundColor: '#0284C7',
                textColor: '#FFFFFF',
              }),
            ],
          }),
        ],
      }),
    });
  };

  const startLiveActivity = async () => {
    await LiveActivity.start({
      activityName: 'ExpoLiveTask',
      appGroup: APP_GROUP,
      layout: UI.VStack({
        padding: 16,
        background: '#020617',
        children: [
          UI.Text('🚀 Live Activity từ Expo SDK!', { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }),
          UI.Text('Đồng bộ thời gian thực không cần đụng mã Swift.', { color: '#94A3B8', fontSize: 13 }),
          UI.Progress(0.75, { style: 'bar', tintColor: '#38BDF8', height: 6 }),
        ],
      }),
      dynamicIsland: {
        compactLeading: UI.Text('🚀', { fontSize: 14 }),
        compactTrailing: UI.Text('75%', { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' }),
        expanded: {
          leading: UI.Text('EXPO LIVE', { color: '#94A3B8', fontSize: 11 }),
          trailing: UI.Text('75%', { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' }),
          center: UI.Progress(0.75, { style: 'bar', tintColor: '#38BDF8', height: 6 }),
        },
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Live Widgets Demo</Text>
      <Text style={styles.counter}>Giá trị: {counter}</Text>

      <TouchableOpacity style={styles.btn} onPress={() => updateHomeScreenWidget(counter + 1)}>
        <Text style={styles.btnText}>Cập nhật Home Widget</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btnLive]} onPress={startLiveActivity}>
        <Text style={styles.btnText}>Bật Live Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  counter: { fontSize: 18, color: '#38BDF8', marginBottom: 24 },
  btn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginVertical: 8, width: '100%', alignItems: 'center' },
  btnLive: { backgroundColor: '#059669' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
```

---

## 6. Xử lý Sự cố Thường gặp trên Expo (Troubleshooting)

### 1. `[react-native-live-widgets] Native module not found`
- **Nguyên nhân:** Đang chạy ứng dụng bằng **Expo Go**.
- **Giải pháp:** Live Activities và Widgets bắt buộc phải dùng native code. Hãy chạy `npx expo prebuild` và khởi động bằng `npx expo run:ios` hoặc `npx expo run:android`.

### 2. `client is not entitled` hoặc `container_create_or_lookup_app_group_path_by_app_group_identifier`
- **Nguyên nhân:** Thiếu cấu hình App Group trong file Entitlements hoặc sai tên App Group.
- **Giải pháp:** 
  1. Kiểm tra tên App Group trong `app.json` phải trùng khớp với lệnh `npx react-native-live-widgets init --group group.your.app`.
  2. Đảm bảo file `ios/<AppName>/<AppName>.entitlements` và `ios/LiveWidgetsExtension/LiveWidgetsExtension.entitlements` đều có chứa `com.apple.security.application-groups`.

### 3. `'main' attribute can only apply to one type in a module`
- **Nguyên nhân:** File `LiveWidgetsBundle.swift` vô tình bị thêm vào build phase của target chính (`LiveWidgetsExampleExpo`), dẫn đến xung đột `@main` giữa `AppDelegate.swift` và `LiveWidgetsBundle.swift`.
- **Giải pháp:** Bản cập nhật CLI `react-native-live-widgets init` mới nhất đã tự động cô lập build phase `PBXSourcesBuildPhase` của target `LiveWidgetsExtension`. Chỉ cần chạy lại `npx react-native-live-widgets init` để tự động sửa.

### 4. Metro Bundler: `Unable to resolve module react-native/asset-registry`
- **Nguyên nhân:** Trong môi trường liên kết package cục bộ (`file:../react-native-live-widgets`) hoặc monorepo, Metro có thể quét nhầm `node_modules` lồng nhau.
- **Giải pháp:** Tạo file `metro.config.js` tại thư mục gốc của dự án Expo với nội dung sau:
  ```javascript
  const { getDefaultConfig } = require('expo/metro-config');
  const path = require('path');

  const config = getDefaultConfig(__dirname);
  config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
  ];
  config.resolver.disableHierarchicalLookup = true;

  module.exports = config;
  ```

### 5. Cảnh báo `@ExpoModule class 'CoreModule' is internal` khi build Xcode
- **Hiện tượng:** Xuất hiện cảnh báo từ `expo-modules-core` trong log build.
- **Ảnh hưởng:** Đây chỉ là cảnh báo nội bộ của hệ thống module Expo, hoàn toàn không gây crash ứng dụng và bản build vẫn ra kết quả `** BUILD SUCCEEDED **`.

---

## 7. Tài nguyên & Liên kết
- ⚡ **Dự án mẫu Expo hoàn chỉnh:** [LiveWidgetsExampleExpo trên GitHub](https://github.com/React-Native-Vu/LiveWidgetsExampleExpo)
- ⚛️ **Dự án mẫu Bare React Native:** [LiveWidgetsExample trên GitHub](https://github.com/React-Native-Vu/LiveWidgetsExample)
- 📖 **Tài liệu hướng dẫn Tiếng Việt đầy đủ:** [GUIDE-VI.md](./GUIDE-VI.md)
- 🌐 **Tài liệu tiếng Anh:** [GUIDE-EN.md](./GUIDE-EN.md)
