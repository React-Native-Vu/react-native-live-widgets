# HƯỚNG DẪN SỬ DỤNG VÀ THIẾT LẬP THƯ VIỆN REACT-NATIVE-LIVE-WIDGETS 🚀

Tài liệu hướng dẫn toàn diện từ cài đặt, thiết lập native (iOS/Android), xây dựng giao diện động bằng JavaScript/TypeScript cho cả **Live Activities (Dynamic Island / Lock Screen)** và **Home Screen Widgets (Tiện ích màn hình chính)**.

---

## MỤC LỤC
1. [Giới thiệu và Kiến trúc](#1-giới-thiệu-và-kiến-trúc)
2. [Cài đặt và Thiết lập Dự án](#2-cài-đặt-và-thiết-lập-dự-án)
   - [Cài đặt package](#cài-đặt-package)
   - [Thiết lập iOS (Xcode & Widget Extension)](#thiết-lập-ios-xcode--widget-extension)
   - [Thiết lập Android (Manifest & Permissions)](#thiết-lập-android-manifest--permissions)
3. [Tài liệu API (Core API Reference)](#3-tài-liệu-api-core-api-reference)
   - [LiveActivity API (Màn hình khóa & Đảo động)](#1-liveactivity-api)
   - [Widget API (Tiện ích màn hình chính)](#2-widget-api)
   - [SharedStorage API (Đồng bộ App Groups)](#3-sharedstorage-api)
4. [Xây dựng Giao diện Động (Declarative UI Engine)](#4-xây-dựng-giao-diện-động-declarative-ui-engine)
   - [UI.VStack & UI.HStack](#uivstack--uihstack)
   - [UI.Text](#uitext)
   - [UI.Timer (Realtime không tốn pin)](#uitimer-realtime-không-tốn-pin)
   - [UI.Progress (Thanh tiến trình)](#uiprogress-thanh-tiến-trình)
   - [UI.Image (SF Symbols & Assets)](#uiimage-sf-symbols--assets)
5. [Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16)](#5-cấu-hình-dynamic-island-iphone-14-pro-15-16)
6. [Tạo Home Screen Widget Động bằng JavaScript](#6-tạo-home-screen-widget-động-bằng-javascript)
7. [State Machine & Tự động cập nhật khi Thoát App (Kill App)](#7-state-machine--tự-động-cập-nhật-khi-thoát-app-kill-app)
8. [Luồng Đăng nhập (Login) và Đăng xuất (Logout)](#8-luồng-đăng-nhập-login-và-đăng-xuất-logout)
9. [Cấu trúc Payload Server Push (APNs & FCM)](#9-cấu-trúc-payload-server-push-apns--fcm)
10. [Xử lý sự cố thường gặp (Troubleshooting)](#10-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Giới thiệu và Kiến trúc

Thư viện **`react-native-live-widgets`** là giải pháp All-in-One giải quyết trọn vẹn việc hiển thị thông tin bên ngoài ứng dụng:
- **Live Activity (iOS 16.1+ ActivityKit & Dynamic Island):** Cho sự kiện thời gian thực (chấm công, chuyến xe, giao đồ ăn, bấm giờ).
- **Live Update (Android 16+ ProgressStyle):** Thông báo ongoing được đề xuất trên thanh trạng thái Android.
- **Home Screen Widgets (iOS WidgetKit & Android AppWidget):** Tiện ích tĩnh trên màn hình chính (Dashboard tổng quan, việc cần làm, báo cáo).
- **Shared Storage:** Cầu nối lưu trữ giữa React Native App và Widgets thông qua iOS App Groups và Android SharedPreferences.

---

## 2. Cài đặt và Thiết lập Dự án

### Cài đặt package
Trong thư mục gốc của dự án React Native:
```bash
npm install react-native-live-widgets
# hoặc
yarn add react-native-live-widgets
```

---

### Thiết lập iOS (Xcode & Widget Extension)

#### Bước 1: Kích hoạt Live Activities trong `Info.plist`
Mở `ios/<TênApp>/Info.plist` và thêm key:
```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```

#### Bước 2: Tạo Widget Extension Target trong Xcode
1. Mở file `.xcworkspace` bằng Xcode.
2. Chọn menu: **File -> New -> Target...**
3. Chọn template **Widget Extension** rồi nhấn **Next**.
4. Cấu hình:
   - **Product Name:** `LiveWidgetsExtension`
   - **Bỏ chọn:** `Include Configuration App Intent`.
5. Nhấn **Finish** và chọn **Activate**.

#### Bước 3: Thay thế file Bundle của Widget Extension
Mở file `LiveWidgetsBundle.swift` và thay bằng:
```swift
import WidgetKit
import SwiftUI
import react_native_live_widgets

@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    // 1. Live Activity (Màn hình khóa & Dynamic Island)
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }

    // 2. Widget màn hình chính (Home Screen Widget)
    DynamicHomeScreenWidget()
  }
}

struct DynamicHomeScreenWidget: Widget {
  let kind: String = "DynamicHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "main")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Tiện ích")
    .description("Hiển thị thông tin cập nhật từ ứng dụng.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
```

#### Bước 4: Cấu hình `Podfile` và Pod Install
Mở `ios/Podfile`, thêm target liên kết:
```ruby
target 'LiveWidgetsExtension' do
  inherit! :search_paths
  pod 'react-native-live-widgets', :path => '../node_modules/react-native-live-widgets'
end
```
Sau đó chạy:
```bash
cd ios && pod install
```

---

### Thiết lập Android (Manifest & Permissions)

Mở `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

    <application ...>
        <receiver
            android:name="com.reactnativeliveactivity.LiveActivityReceiver"
            android:exported="false" />
    </application>
</manifest>
```

---

## 3. Tài liệu API (Core API Reference)

Import module:
```typescript
import { LiveActivity, Widget, SharedStorage, UI } from 'react-native-live-widgets';
```

### 1. `LiveActivity` API
- `LiveActivity.start(options)`: Khởi chạy Live Activity / Live Update.
- `LiveActivity.update(options)`: Cập nhật nội dung mới.
- `LiveActivity.end(activityId)`: Kết thúc 1 phiên.
- `LiveActivity.endAll()`: Kết thúc toàn bộ các phiên đang chạy.
- `LiveActivity.getPushToStartToken()`: Lấy APNs Push-to-Start Token (iOS 17.2+).
- `LiveActivity.onPushToStartTokenChange(listener)`: Lắng nghe khi iOS tự động xoay token.
- `LiveActivity.canPostPromoted()`: Kiểm tra quyền Promoted Notifications trên Android 16.

### 2. `Widget` API (Màn hình chính)
- `Widget.reloadAll(): Promise<boolean>`: Yêu cầu hệ điều hành vẽ lại toàn bộ Widget màn hình chính ngay lập tức.
- `Widget.reload(kind: string): Promise<boolean>`: Vẽ lại 1 widget cụ thể theo tên kind (iOS).
- `Widget.setLayout(widgetKey, layoutConfig, appGroup?): Promise<boolean>`: Cập nhật giao diện động cho widget (small, medium, large).

### 3. `SharedStorage` API (App Groups)
- `SharedStorage.set(key, value, appGroup?)`: Lưu dữ liệu vào App Group (iOS) hoặc SharedPreferences (Android).
- `SharedStorage.get<T>(key, appGroup?)`: Đọc dữ liệu từ bộ nhớ chung.
- `SharedStorage.remove(key, appGroup?)`: Xóa 1 key.
- `SharedStorage.clear(appGroup?)`: Xóa sạch bộ nhớ chung.

---

## 4. Xây dựng Giao diện Động (Declarative UI Engine)

Bộ helper `UI` hỗ trợ bạn viết giao diện bằng JS/TS 100%:

### UI.VStack & UI.HStack
```typescript
UI.VStack(
  { padding: 14, backgroundColor: '#1A1D24', borderRadius: 16, spacing: 8 },
  // children...
)
```

### UI.Text
```typescript
UI.Text('Nguyễn Văn A', { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' })
```

### UI.Timer (Realtime không tốn pin)
```typescript
UI.Timer(timestampInSeconds, { mode: 'countdown', color: '#FFA500', fontWeight: 'bold' })
```

### UI.Progress (Thanh tiến trình đa dạng)

`UI.Progress` được hỗ trợ rất nhiều thuộc tính đa dạng, đáp ứng mọi loại giao diện từ ca làm việc, giao đồ ăn đến đếm ngược Flash sale và vòng tròn thể thao:

```typescript
UI.Progress({
  // 1. Dữ liệu tiến trình
  startTimestamp?: number;     // Mốc bắt đầu (giây) cho tiến trình tự chạy
  targetTimestamp?: number;    // Mốc kết thúc (giây)
  value?: number;              // Hoặc giá trị tĩnh (0.0 đến 1.0)

  // 2. Kiểu dáng & Hình dạng
  style?: 'bar' | 'segmented' | 'circular'; // 'bar' (liền) | 'segmented' (nhiều chặng) | 'circular' (vòng tròn)
  countsDown?: boolean;        // true: thanh rút ngắn dần về 0 | false: lấp đầy dần 100%
  height?: number;             // Chiều cao / độ dày (pixel, mặc định 6)
  borderRadius?: number;       // Bo góc thanh

  // 3. Màu sắc & Cảnh báo thông minh
  tintColor?: string;          // Màu thanh hoàn thành (vd '#2F80ED')
  trackColor?: string;         // Màu rãnh nền phía sau (vd '#374151')
  warningSeconds?: number;     // Số giây cuối để tự đổi màu cảnh báo (vd 300 = còn 5 phút)
  warningTintColor?: string;   // Màu khi sắp hết giờ (mặc định '#FFA500' cam)

  // 4. Thanh nhiều chặng (Segmented Progress - Grab / ShopeeFood style)
  segments?: number;           // Tổng số bước (vd 4 bước)
  currentSegment?: number;     // Bước hiện tại (1 -> segments)
  segmentSpacing?: number;     // Khoảng cách giữa các bước

  // 5. Hiển thị phần trăm
  showPercentage?: boolean;    // Hiển thị chữ '75%'
  percentageColor?: string;
})
```

#### Ví dụ các biến thể thực tế của `UI.Progress`:

1. **Thanh ca làm việc tự đổi sang màu cam khi còn dưới 5 phút (Smart Warning):**
```typescript
UI.Progress({
  startTimestamp: checkinReminderTime,
  targetTimestamp: shiftStartTime,
  tintColor: '#2F80ED',         // Bình thường màu xanh dương
  warningSeconds: 300,          // Còn 5 phút cuối
  warningTintColor: '#FFA500',  // Tự động chuyển sang màu cam cảnh báo!
})
```

2. **Thanh nhiều chặng giao hàng 4 bước (Segmented Progress):**
```typescript
UI.Progress({
  style: 'segmented',
  segments: 4,                  // [Đã đặt] - [Quán nhận] - [Đang giao] - [Hoàn tất]
  currentSegment: 3,            // Đang ở bước 3
  tintColor: '#10B981',         // Màu xanh lá
  trackColor: '#374151',
  segmentSpacing: 6,
  height: 6,
})
```

3. **Vòng tròn tiến độ % (Circular Progress):**
```typescript
UI.Progress({
  style: 'circular',
  value: 0.85,                  // 85%
  tintColor: '#F59E0B',
  showPercentage: true,         // Hiện chữ 85% ở giữa
})
```

4. **Thanh đếm ngược rút ngắn dần về 0 (countsDown):**
```typescript
UI.Progress({
  startTimestamp: now,
  targetTimestamp: expireTime,
  countsDown: true,             // Thanh co ngắn dần lại
  tintColor: '#EF4444',
})
```

#### 🤖 Cơ chế hiển thị `UI.Progress` trên Android:
Khác với iOS tự động render bằng GPU của WidgetKit, Android thông báo chạy trong `SystemUI`:
- **Android 16+ (API 36):** Tự động chuyển đổi sang `Notification.ProgressStyle` với Segment phân đoạn và Promoted Ongoing ("thông báo được đề xuất").
- **Android cũ (< 36):** Tự động map sang `setProgress(max, current, false)`. Khi dùng `style: 'segmented'`, Android hiển thị theo tỷ lệ `segments` và `currentSegment`.
- **Khi Kill App:** Android tự động hẹn giờ qua `AlarmManager` mỗi 30 giây (`TICK_MILLIS`) để đánh thức `LiveActivityReceiver` và làm mới thanh tiến trình chạy đều đặn ngay cả khi app tắt hoàn toàn!

### UI.Image
```typescript
UI.Image({ systemName: 'clock.badge.checkmark', tintColor: '#2F80ED', width: 22, height: 22 })
```

---

## 5. Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16)

```typescript
dynamicIsland: {
  compactLeading: UI.Image({ systemName: 'scooter', tintColor: '#00BA51' }),
  compactTrailing: UI.Timer(etaTimestamp, { mode: 'countdown' }),
  minimal: UI.Image({ systemName: 'scooter', tintColor: '#00BA51' }),
  expanded: {
    leading: UI.Text('ShopeeFood', { fontWeight: 'bold', color: '#FFF' }),
    trailing: UI.Timer(etaTimestamp, { mode: 'countdown', color: '#00BA51' }),
    bottom: UI.Text('Tài xế đang đến', { color: '#CBD5E0', fontSize: 12 }),
  },
}
```

---

## 6. Tạo Home Screen Widget Động bằng JavaScript

Không cần viết code SwiftUI cho từng Widget, bạn có thể thiết lập giao diện cho Widget màn hình chính trực tiếp từ JavaScript:

```typescript
import { Widget, UI } from 'react-native-live-widgets';

await Widget.setLayout('main', {
  // Cỡ Nhỏ (systemSmall - 2x2 icons)
  small: UI.VStack(
    { padding: 12, backgroundColor: '#2F80ED', borderRadius: 18, spacing: 4 },
    UI.Text('ĐÃ CHECK-IN', { fontSize: 11, fontWeight: 'bold', color: '#E0E7FF' }),
    UI.Text('08:05', { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }),
    UI.Text('Streak: 12 ngày 🔥', { fontSize: 12, color: '#FFFFFF' })
  ),

  // Cỡ Vừa (systemMedium - 4x2 icons)
  medium: UI.HStack(
    { padding: 14, backgroundColor: '#1E293B', borderRadius: 20, justifyContent: 'spaceBetween' },
    UI.VStack(
      { spacing: 4 },
      UI.Text('Ca sáng: 08:00 - 12:00', { fontWeight: 'bold', color: '#FFF' }),
      UI.Text('Văn phòng làm việc', { fontSize: 12, color: '#94A3B8' })
    ),
    UI.Text('Hợp lệ ✓', { fontWeight: 'bold', color: '#10B981' })
  ),
});
```

Sau khi gọi hàm này, Widget trên màn hình chính sẽ tự động đọc dữ liệu và vẽ lại ngay lập tức!

---

## 7. State Machine & Tự động cập nhật khi Thoát App (Kill App)

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
    triggerTimestamp: targetTimestamp, // Đã quá giờ
    alertTitle: 'Đã trễ ca!',
    alertBody: 'Bạn đã quá giờ ca làm việc!',
  },
]
```

---

## 8. Luồng Đăng nhập (Login) và Đăng xuất (Logout)

### Khi Đăng nhập:
```typescript
async function onLoginSuccess(user: User) {
  const liveActivityToken = await LiveActivity.getPushToStartToken();

  await api.registerDevice({
    userId: user.id,
    fcmToken: await messaging().getToken(),
    liveActivityStartToken: liveActivityToken,
  });

  LiveActivity.onPushToStartTokenChange(async (newToken) => {
    await api.updateDeviceToken({ liveActivityStartToken: newToken });
  });
}
```

### Khi Đăng xuất:
```typescript
async function onLogout() {
  await LiveActivity.endAll(); // Xóa sạch màn hình khóa
  await SharedStorage.clear(); // Xóa sạch dữ liệu widget
}
```

---

## 📄 License
MIT © vu-tran
