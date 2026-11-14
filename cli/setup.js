#!/usr/bin/env node

/**
 * CLI setup script cho React Native thuần:
 * npx react-native-live-widgets init
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const iosDir = path.join(projectRoot, 'ios');
const androidDir = path.join(projectRoot, 'android');

console.log('🚀 [react-native-live-widgets] Bắt đầu thiết lập dự án React Native...');

if (!fs.existsSync(iosDir)) {
  console.error('❌ Không tìm thấy thư mục ios/. Hãy chạy lệnh này ở thư mục gốc của dự án React Native.');
  process.exit(1);
}

// 1. Cấu hình Info.plist iOS: NSSupportsLiveActivities = YES
try {
  const xcodeProjects = fs.readdirSync(iosDir).filter((file) => file.endsWith('.xcodeproj'));
  if (xcodeProjects.length > 0) {
    const appName = xcodeProjects[0].replace('.xcodeproj', '');
    const infoPlistPath = path.join(iosDir, appName, 'Info.plist');

    if (fs.existsSync(infoPlistPath)) {
      let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
      if (!plistContent.includes('NSSupportsLiveActivities')) {
        plistContent = plistContent.replace(
          '<dict>',
          '<dict>\n\t<key>NSSupportsLiveActivities</key>\n\t<true/>\n\t<key>NSSupportsLiveActivitiesFrequentUpdates</key>\n\t<true/>'
        );
        fs.writeFileSync(infoPlistPath, plistContent, 'utf8');
        console.log(`✅ Đã thêm NSSupportsLiveActivities vào ${appName}/Info.plist`);
      } else {
        console.log(`ℹ️ NSSupportsLiveActivities đã tồn tại trong ${appName}/Info.plist`);
      }
    }
  }
} catch (e) {
  console.warn('⚠️ Không thể tự động chỉnh sửa Info.plist:', e.message);
}

// 2. Tạo template Widget Extension Bundle nếu chưa có
const widgetTargetDir = path.join(iosDir, 'LiveWidgetsExtension');
if (!fs.existsSync(widgetTargetDir)) {
  fs.mkdirSync(widgetTargetDir, { recursive: true });
  
  const widgetBundleContent = `import WidgetKit
import SwiftUI
import react_native_live_widgets

@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    // 1. Live Activity & Dynamic Island (iOS 16.1+)
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }

    // 2. Home Screen Widget (Màn hình chính)
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
`;
  fs.writeFileSync(path.join(widgetTargetDir, 'LiveWidgetsBundle.swift'), widgetBundleContent, 'utf8');
  console.log('✅ Đã tạo file template: ios/LiveWidgetsExtension/LiveWidgetsBundle.swift');
}

console.log('\n🎉 Thiết lập ban đầu hoàn tất!');
console.log('👉 Tiếp theo:');
console.log('1. Mở Xcode, chọn File -> New -> Target -> Widget Extension (đặt tên LiveWidgetsExtension, bỏ tích "Include Configuration App Intent").');
console.log('2. Trong Podfile, thêm vào bên trong target chính:');
console.log(`   target 'LiveWidgetsExtension' do
     inherit! :search_paths
     pod 'react-native-live-widgets/Widget', :path => '../node_modules/react-native-live-widgets'
   end`);
console.log('3. Chạy "cd ios && pod install" là sẵn sàng sử dụng!\n');
