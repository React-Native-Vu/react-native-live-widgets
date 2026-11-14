# react-native-live-activity 🚀

Thư viện mã nguồn mở cho **React Native thuần (Bare React Native)** hỗ trợ hiển thị và quản lý **Live Activities (iOS 16.1+ WidgetKit / Dynamic Island)** và **Live Updates (Android 16+ ProgressStyle / Ongoing Notification)** với cơ chế **Declarative Dynamic UI Engine bằng JavaScript**.

📖 **[Xem tài liệu chi tiết từ A-Z bằng tiếng Việt (GUIDE-VI.md)](docs/GUIDE-VI.md)**

---

## ✨ Điểm nổi bật

1. **Declarative UI hoàn toàn bằng JS/TS**: Không cần viết một dòng code Swift hay Kotlin nào. Bạn có thể dựng UI bằng `UI.VStack`, `UI.HStack`, `UI.Text`, `UI.Timer`, `UI.Progress`, `UI.Image`.
2. **Tự động cập nhật khi thoát app**:
   - iOS: Đồng hồ (`UI.Timer`) và Thanh tiến trình (`UI.Progress`) tự nhảy từng giây mượt mà qua phần cứng WidgetKit, **không tốn pin, không cần app chạy ngầm**.
   - Android: Tự động chạy Chronometer đếm ngược và dùng `AlarmManager` tự đánh thức hệ thống để đổi giao diện theo từng pha (Phases).
3. **Push-to-Start Token (iOS 17.2+)**: Lấy và lắng nghe token APNs để Backend có thể chủ động kích hoạt Live Activity từ xa mà người dùng không cần mở app.
4. **Android 16 Live Update**: Tích hợp sẵn `Notification.ProgressStyle` (Promoted Ongoing) đón đầu hệ điều hành mới nhất của Google.
5. **State Machine / Phases**: Khai báo trước các mốc thời gian (vd: sắp đến giờ, đã trễ) để Native tự động đổi màu sắc, icon, thông điệp mà không cần server gửi push.

---

## 📦 Cài đặt

```bash
# 1. Cài đặt package
npm install react-native-live-activity
# hoặc yarn add react-native-live-activity

# 2. Khởi tạo cấu hình iOS
npx react-native-live-activity init

# 3. Cài đặt Pods
cd ios && pod install
```

---

## 🛠️ Cấu hình Xcode cho iOS

Sau khi chạy `npx react-native-live-activity init`, bạn chỉ cần:
1. Mở file `.xcworkspace` trong Xcode.
2. Chọn **File -> New -> Target -> Widget Extension**. Đặt tên là `LiveActivityWidget` (bỏ chọn *Include Configuration App Intent*).
3. Thêm cấu hình Pod vào `ios/Podfile`:
```ruby
target 'LiveActivityWidget' do
  inherit! :search_paths
  pod 'react-native-live-activity', :path => '../node_modules/react-native-live-activity'
end
```
4. Chạy lại `pod install`.

---

## 🚀 Hướng dẫn sử dụng

### 1. Khởi động một Live Activity với Dynamic UI

```typescript
import { LiveActivity, UI } from 'react-native-live-activity';

const now = Math.floor(Date.now() / 1000);
const targetTimestamp = now + 900; // 15 phút nữa

await LiveActivity.start({
  activityId: 'order_123',
  alertTitle: 'Đang giao hàng',
  alertBody: 'Tài xế đang trên đường đến',

  // 1. Giao diện Màn hình khóa (Lock Screen) & Android Notification
  lockScreen: UI.VStack(
    { padding: 14, backgroundColor: '#1A1D24', borderRadius: 16, spacing: 10 },
    UI.HStack(
      { justifyContent: 'spaceBetween' },
      UI.Text('Tài xế Nguyễn Văn A', { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }),
      // Đồng hồ đếm ngược tự chạy (không tốn pin)
      UI.Timer(targetTimestamp, { mode: 'countdown', color: '#FFA500', fontWeight: 'bold' })
    ),
    // Thanh tiến trình tự động lấp đầy theo thời gian
    UI.Progress({
      startTimestamp: now,
      targetTimestamp: targetTimestamp,
      tintColor: '#2F80ED',
    })
  ),

  // 2. Dynamic Island (iPhone 14 Pro / 15 / 16)
  dynamicIsland: {
    compactLeading: UI.Image({ systemName: 'car.fill', tintColor: '#2F80ED' }),
    compactTrailing: UI.Timer(targetTimestamp, { mode: 'countdown', color: '#FFA500' }),
    expanded: {
      leading: UI.Text('Đang giao', { fontWeight: 'bold', color: '#FFFFFF' }),
      trailing: UI.Timer(targetTimestamp, { mode: 'countdown', color: '#FFA500' }),
      bottom: UI.Text('Khoảng cách: 1.2 km', { color: '#A0AEC0', fontSize: 12 }),
    },
  },

  // 3. Tự động đổi trạng thái theo mốc thời gian (State Machine)
  phases: [
    {
      id: 'arriving_soon',
      triggerTimestamp: targetTimestamp - 180, // Còn 3 phút
      alertTitle: 'Tài xế sắp tới!',
      alertBody: 'Vui lòng chuẩn bị nhận hàng.',
    },
  ],
});
```

### 2. Cập nhật và Kết thúc

```typescript
// Cập nhật nội dung mới
await LiveActivity.update({
  activityId: 'order_123',
  alertTitle: 'Đã giao hàng thành công',
});

// Kết thúc 1 activity
await LiveActivity.end('order_123');

// Hoặc kết thúc toàn bộ
await LiveActivity.endAll();
```

### 3. Lấy Push-to-Start Token (iOS 17.2+)

```typescript
useEffect(() => {
  // Lấy token hiện tại
  LiveActivity.getPushToStartToken().then((token) => {
    if (token) sendTokenToBackend(token);
  });

  // Lắng nghe khi iOS tự động xoay token mới
  const unsubscribe = LiveActivity.onPushToStartTokenChange((newToken) => {
    sendTokenToBackend(newToken);
  });

  return () => unsubscribe();
}, []);
```

---

## 📂 Cấu trúc thư viện

```
react-native-live-activity/
├── src/
│   ├── index.ts          # Core Public API
│   ├── types.ts          # Schema layout, Dynamic Island & Phases
│   └── builder.ts        # UI Primitives: VStack, HStack, Timer, Progress...
├── ios/
│   ├── LiveActivityModule.swift         # React Native Bridge
│   ├── LiveActivityModule.m             # RCT_EXTERN_MODULE
│   ├── DynamicActivityAttributes.swift  # ActivityKit State Model
│   ├── DynamicNodeView.swift            # SwiftUI Generic Recursive Renderer
│   └── DynamicLiveActivityWidget.swift  # WidgetKit LockScreen & Dynamic Island
├── android/
│   └── src/main/java/com/reactnativeliveactivity/
│       ├── LiveActivityModule.kt        # React Native Android Bridge
│       ├── LiveActivityNotifier.kt      # Android 16 ProgressStyle & Notification
│       └── LiveActivityReceiver.kt      # AlarmManager Auto-refresh khi app tắt
├── cli/
│   └── setup.js          # Script tự động cấu hình Info.plist & project
└── example/
    └── App.tsx           # Ứng dụng mẫu demo đầy đủ tính năng
```

---

## 📄 License
MIT © vu-tran

