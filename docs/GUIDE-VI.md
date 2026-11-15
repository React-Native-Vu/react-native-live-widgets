# HƯỚNG DẪN SỬ DỤNG VÀ THIẾT LẬP THƯ VIỆN REACT-NATIVE-LIVE-WIDGETS 🚀

> 🌐 **Language:** **Tiếng Việt** | [English (GUIDE-EN.md)](./GUIDE-EN.md)

Tài liệu hướng dẫn toàn diện từ cài đặt, thiết lập native (iOS/Android), xây dựng giao diện động bằng JavaScript/TypeScript cho cả **Live Activities (Dynamic Island / Lock Screen / Android Live Update)** và **Home Screen Widgets (Tiện ích màn hình chính tương tác đa trang)**.

---

## MỤC LỤC
1. [Giới thiệu và Kiến trúc](#1-giới-thiệu-và-kiến-trúc)
2. [Cài đặt và Thiết lập Dự án](#2-cài-đặt-và-thiết-lập-dự-án)
   - [Cài đặt package](#cài-đặt-package)
   - [Thiết lập iOS (Xcode & Widget Extension)](#thiết-lập-ios-xcode--widget-extension)
   - [Thiết lập Android (Manifest & Permissions)](#thiết-lập-android-manifest--permissions)
3. [Tài liệu API (Core API Reference)](#3-tài-liệu-api-core-api-reference)
   - [LiveActivity API (Màn hình khóa, Dynamic Island & 3 loại Push Token)](#1-liveactivity-api)
   - [Widget API (Tiện ích màn hình chính, Multi-page & Background Sync)](#2-widget-api)
   - [SharedStorage API (Đồng bộ App Groups & SharedPreferences)](#3-sharedstorage-api)
4. [Xây dựng Giao diện Động (Declarative UI Engine)](#4-xây-dựng-giao-diện-động-declarative-ui-engine)
   - [UI.VStack & UI.HStack](#uivstack--uihstack)
   - [UI.Text](#uitext)
   - [UI.Timer (Realtime không tốn pin)](#uitimer-realtime-không-tốn-pin)
   - [UI.Progress (Thanh tiến trình bar, segmented, circular)](#uiprogress-thanh-tiến-trình-đa-dạng)
   - [UI.Image (URL mạng, Base64, File, Asset & SF Symbols)](#uiimage-url-mạng-base64-file-asset--sf-symbols)
   - [UI.Button (Tương tác chuyển trang, Tick công việc, Refresh API & Deep Link)](#uibutton-nút-bấm-tương-tác-trực-tiếp-trên-widget)
5. [Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16, 17)](#5-cấu-hình-dynamic-island-iphone-14-pro-15-16-17)
6. [Tạo Home Screen Widget Đa Trang & Tương Tác bằng JavaScript](#6-tạo-home-screen-widget-đa-trang--tương-tác-bằng-javascript)
7. [Đồng bộ API Ngầm cho Widget kể cả khi Kill App (`Widget.setRemoteConfig`)](#7-đồng-bộ-api-ngầm-cho-widget-kể-cả-khi-kill-app-widgetsetremoteconfig)
8. [Quản lý 3 loại Push Token (APNs & FCM) cho Live Activity](#8-quản-lý-3-loại-push-token-apns--fcm-cho-live-activity)
9. [State Machine & Tự động cập nhật theo pha (Phases)](#9-state-machine--tự-động-cập-nhật-theo-pha-phases)
10. [Cấu trúc Payload Server Push (APNs & FCM)](#10-cấu-trúc-payload-server-push-apns--fcm)
11. [Xử lý sự cố thường gặp (Troubleshooting)](#11-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Giới thiệu và Kiến trúc

Thư viện **`react-native-live-widgets`** là giải pháp All-in-One cho phép viết **100% giao diện Widget và Live Activity ngay trong code React Native (`App.tsx`)**, tự động ánh xạ sang Native cho cả iOS và Android:

- **Live Activity (iOS 16.1+ ActivityKit & Dynamic Island):** Cho sự kiện thời gian thực (chấm công, chuyến xe, giao đồ ăn, bấm giờ Pomodoro).
- **Live Update (Android API 24 -> Android 16 API 36 `Notification.ProgressStyle`):** Thông báo thời gian thực trên thanh trạng thái Android có hỗ trợ ảnh đại diện (`LargeIcon`), thanh chia chặng (`segmented`) và các nút bấm tương tác (`Action Buttons`).
- **Home Screen Widgets (iOS WidgetKit & Android AppWidget Canvas Renderer):** Tiện ích ngoài màn hình chính (`small`, `medium`, `large`) hỗ trợ bấm chuyển trang/tab (`pages`), tick hoàn thành công việc (`toggle`), hiển thị ảnh từ URL mạng/Base64 và tự động gọi API ngầm khi ứng dụng bị tắt.
- **Shared Storage:** Cầu nối lưu trữ tức thời giữa React Native App và Widgets thông qua iOS App Groups và Android `SharedPreferences`.

---

## 2. Cài đặt và Thiết lập Dự án

### Cài đặt package
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

### Thiết lập Android (Manifest & Permissions)

Thư viện đã **tự động đăng ký sẵn** `DynamicHomeScreenWidgetProvider` (Home Screen Widget) và `LiveActivityReceiver` (Background Sync & Action Handler) trong `AndroidManifest.xml` của thư viện và tự động gộp (manifest merge) vào ứng dụng của bạn.

Trên Android 13+ (API 33+), hãy xin quyền `POST_NOTIFICATIONS` trước khi bật Live Update nếu cần hiển thị thông báo nổi.

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

### 2. `Widget` API (Tiện ích Màn hình chính)
- `Widget.setLayout(widgetKey, layoutConfig, appGroup?)`: Cập nhật giao diện động (`small`, `medium`, `large`, `pages`, `initialPage`) và tự động tải/nén trước toàn bộ ảnh từ URL mạng.
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

---

## 4. Xây dựng Giao diện Động (Declarative UI Engine)

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

---

## 5. Cấu hình Dynamic Island (iPhone 14 Pro, 15, 16, 17)

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

---

## 7. Đồng bộ API Ngầm cho Widget kể cả khi Kill App (`Widget.setRemoteConfig`)

Khi ứng dụng bị người dùng vuốt tắt hoàn toàn (Kill App), JavaScript thread của React Native sẽ dừng. Để Widget vẫn luôn có dữ liệu mới từ Server:

```typescript
await Widget.setRemoteConfig({
  url: 'https://api.yourcompany.com/v1/widget-summary',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  intervalMinutes: 15, // Tự động đồng bộ mỗi 15 phút ở tầng OS (WidgetKit Timeline / Android AlarmManager)
});
```

- **Cách hoạt động:**
  - Trên **iOS**: `DynamicWidgetProvider` tự động gọi API ngầm mỗi `intervalMinutes` (hoặc ngay lập tức khi bấm nút `actionId: 'refresh'`), lấy JSON trả về và điền vào các biến `{{ten_bien}}` trong cây UI DSL.
  - Trên **Android**: `AlarmManager` tự động đánh thức `LiveActivityReceiver` (`ACTION_WIDGET_SYNC`), tải JSON mới và vẽ lại `DynamicHomeScreenWidgetProvider`.
  - Biến đặc biệt `{{_lastSyncTime}}` luôn tự động cập nhật thành giờ đồng bộ mới nhất (`HH:mm:ss`).

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

## 📄 License
MIT © vu-tran
