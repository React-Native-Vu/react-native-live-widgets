#!/usr/bin/env node

/**
 * All-in-One CLI Setup Wizard for react-native-live-widgets
 * Supports both Bare React Native CLI and Expo (CNG / Prebuild)
 * 
 * Usage:
 *   npx react-native-live-widgets init
 *   npx react-native-live-widgets init --group group.com.yourcompany.app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const iosDir = path.join(projectRoot, 'ios');
const androidDir = path.join(projectRoot, 'android');
const appJsonPath = path.join(projectRoot, 'app.json');
const packageJsonPath = path.join(projectRoot, 'package.json');

// Parse CLI arguments
const args = process.argv.slice(2);

// Hỗ trợ subcommand: codegen / generate
if (args[0] === 'codegen' || args[0] === 'generate') {
  const { runCodegen } = require('./codegen');
  let configArg = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configArg = args[i + 1];
      break;
    }
  }
  try {
    runCodegen(projectRoot, configArg);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ [Codegen Error]: ${error.message}\n`);
    process.exit(1);
  }
}

let customAppGroup = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--group' && args[i + 1]) {
    customAppGroup = args[i + 1];
    break;
  }
}

console.log('\n🚀 [react-native-live-widgets] Bắt đầu thiết lập tự động...');

// 1. Detect project name and bundle ID
let pkgName = 'MyApp';
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.name) pkgName = pkg.name;
  } catch (_e) {}
}

let appGroup = customAppGroup || `group.com.${pkgName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
console.log(`📦 App Group được sử dụng: ${appGroup}`);

// 2. Handle Expo project (app.json)
const isExpo = fs.existsSync(appJsonPath);
if (isExpo) {
  try {
    console.log('📱 Phát hiện dự án Expo. Đang cập nhật app.json...');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (!appJson.expo) appJson.expo = {};
    if (!appJson.expo.plugins) appJson.expo.plugins = [];

    // Check if plugin already registered
    const existingIndex = appJson.expo.plugins.findIndex(
      (p) => (Array.isArray(p) ? p[0] : p) === 'react-native-live-widgets'
    );

    const pluginConfig = [
      'react-native-live-widgets',
      {
        appGroup: appGroup,
        enableLiveActivities: true,
        frequentUpdates: true,
      },
    ];

    if (existingIndex >= 0) {
      appJson.expo.plugins[existingIndex] = pluginConfig;
      console.log('ℹ️ Đã cập nhật plugin react-native-live-widgets trong app.json');
    } else {
      appJson.expo.plugins.push(pluginConfig);
      console.log('✅ Đã thêm plugin react-native-live-widgets vào app.json');
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
  } catch (e) {
    console.warn('⚠️ Không thể cập nhật app.json:', e.message);
  }
}

// 3. Configure iOS Native Project (if ios/ folder exists)
if (fs.existsSync(iosDir)) {
  console.log('\n🍎 Đang cấu hình iOS (Info.plist, Entitlements, WidgetExtension Target)...');

  try {
    const xcodeProjects = fs.readdirSync(iosDir).filter((file) => file.endsWith('.xcodeproj'));
    if (xcodeProjects.length > 0) {
      const xcodeProjName = xcodeProjects[0];
      const appName = xcodeProjName.replace('.xcodeproj', '');
      const pbxprojPath = path.join(iosDir, xcodeProjName, 'project.pbxproj');
      const appDir = path.join(iosDir, appName);

      // A. Info.plist: Inject NSSupportsLiveActivities
      const infoPlistPath = path.join(appDir, 'Info.plist');
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

      // B. Entitlements: Add App Group to Main App
      const entitlementsPath = path.join(appDir, `${appName}.entitlements`);
      const entitlementsXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${appGroup}</string>
\t</array>
</dict>
</plist>
`;
      if (!fs.existsSync(entitlementsPath)) {
        fs.writeFileSync(entitlementsPath, entitlementsXml, 'utf8');
        console.log(`✅ Đã tạo ${appName}.entitlements với App Group: ${appGroup}`);
      } else {
        let content = fs.readFileSync(entitlementsPath, 'utf8');
        if (!content.includes(appGroup)) {
          if (content.includes('com.apple.security.application-groups')) {
            content = content.replace(
              /<array>/,
              `<array>\n\t\t<string>${appGroup}</string>`
            );
          } else {
            content = content.replace(
              '<dict>',
              `<dict>\n\t<key>com.apple.security.application-groups</key>\n\t<array>\n\t\t<string>${appGroup}</string>\n\t</array>`
            );
          }
          fs.writeFileSync(entitlementsPath, content, 'utf8');
          console.log(`✅ Đã thêm App Group vào ${appName}.entitlements`);
        }
      }

      // C. Scaffold LiveWidgetsExtension Target Directory
      const widgetTargetDir = path.join(iosDir, 'LiveWidgetsExtension');
      const widgetSharedDir = path.join(widgetTargetDir, 'Shared');
      if (!fs.existsSync(widgetSharedDir)) {
        fs.mkdirSync(widgetSharedDir, { recursive: true });
      }

      // Copy template LiveWidgetsBundle.swift
      const widgetBundlePath = path.join(widgetTargetDir, 'LiveWidgetsBundle.swift');
      if (!fs.existsSync(widgetBundlePath)) {
        const bundleCode = `import WidgetKit
import SwiftUI
#if canImport(react_native_live_widgets)
import react_native_live_widgets
#endif

/// Bundle mở rộng hỗ trợ cả Live Activity (Lock Screen & Dynamic Island)
/// và Home Screen Widgets (Màn hình chính iOS 16.1 -> iOS 17/18/27+)
@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    // 1. Live Activity & Dynamic Island (iOS 16.1+)
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }

    // 2. Tiện ích chính (Dynamic / Đang chọn trong App)
    DynamicHomeScreenWidget()

    // 3. Tiện ích Bộ đếm tương tác (Interactive TS Counter)
    InteractiveCounterHomeScreenWidget()

    // 4. Tiện ích Bảo mật & Tính năng Pro (Core 2.0)
    ProFeaturesHomeScreenWidget()

    // 5. Tiện ích Chấm công & Ca làm việc (Shift Attendance)
    ShiftAttendanceHomeScreenWidget()

    // 6. Tiện ích Không gian làm việc đa trang (Multi-Page Workspace)
    MultiPageHomeScreenWidget()

    // 7. iOS 18+ Interactive Control Center Widgets
    if #available(iOS 18.0, *) {
      DynamicControlWidget()
      DynamicControlToggleWidget()
    }
  }
}

// ── 1. TIỆN ÍCH CHÍNH (ĐỒNG BỘ THEO MẪU ĐANG CHỌN) ──
struct DynamicHomeScreenWidget: Widget {
  let kind: String = "DynamicHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "main")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Tiện ích Live Widgets")
    .description("Tự động đồng bộ và hiển thị theo mẫu giao diện bạn chọn trong ứng dụng.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 2. TIỆN ÍCH BỘ ĐẾM TƯƠNG TÁC TYPESCRIPT ──
struct InteractiveCounterHomeScreenWidget: Widget {
  let kind: String = "InteractiveCounterHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "counter")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Bộ đếm tương tác (TS)")
    .description("Bấm nút [+] hoặc [-] để kích hoạt trực tiếp hàm logic TypeScript.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 3. TIỆN ÍCH BẢO MẬT & KPI PRO (CORE 2.0) ──
struct ProFeaturesHomeScreenWidget: Widget {
  let kind: String = "ProFeaturesHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "pro")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Bảo mật & KPI Pro")
    .description("Tự che số khi khoá máy (Privacy Sensitive) và hỗ trợ chế độ StandBy.")
    .supportedFamilies(commonFamilies)
    .applyStandByMargins()
  }
}

// ── 4. TIỆN ÍCH CHẤM CÔNG & CA LÀM VIỆC ──
struct ShiftAttendanceHomeScreenWidget: Widget {
  let kind: String = "ShiftAttendanceHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "shift")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Chấm công & Ca làm việc")
    .description("Theo dõi giờ vào làm, thời gian tan ca và thanh tiến trình công việc.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 5. TIỆN ÍCH KHÔNG GIAN ĐA TRANG (MULTI-PAGE) ──
struct MultiPageHomeScreenWidget: Widget {
  let kind: String = "MultiPageHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "workspace")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Không gian đa trang")
    .description("Chuyển đổi qua lại giữa Ca làm, Công việc và OKRs ngay trên mặt Widget.")
    .supportedFamilies(commonFamilies)
  }
}

private var commonFamilies: [WidgetFamily] {
  var list: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge]
  if #available(iOS 16.0, *) {
    list.append(contentsOf: [.accessoryRectangular, .accessoryCircular, .accessoryInline])
  }
  return list
}
`;
        fs.writeFileSync(widgetBundlePath, bundleCode, 'utf8');
        console.log('✅ Đã tạo template: ios/LiveWidgetsExtension/LiveWidgetsBundle.swift');
      }

      // Create extension Info.plist
      const widgetInfoPlist = path.join(widgetTargetDir, 'Info.plist');
      if (!fs.existsSync(widgetInfoPlist)) {
        const extPlistCode = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>en</string>
\t<key>CFBundleDisplayName</key>
\t<string>LiveWidgetsExtension</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>XPC!</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.widgetkit-extension</string>
\t</dict>
</dict>
</plist>
`;
        fs.writeFileSync(widgetInfoPlist, extPlistCode, 'utf8');
        console.log('✅ Đã tạo Info.plist cho Widget Extension');
      }

      // Create extension Entitlements
      const widgetEntitlementsPath = path.join(widgetTargetDir, 'LiveWidgetsExtension.entitlements');
      if (!fs.existsSync(widgetEntitlementsPath)) {
        fs.writeFileSync(widgetEntitlementsPath, entitlementsXml, 'utf8');
        console.log('✅ Đã tạo LiveWidgetsExtension.entitlements với App Group');
      }

      // Copy shared widget Swift files from library
      const libIosDir = path.resolve(__dirname, '..', 'ios');
      const subdirs = ['Renderer', 'Models', 'Storage', 'Intents', 'Widgets'];
      for (const subdir of subdirs) {
        const srcSubdir = path.join(libIosDir, subdir);
        if (fs.existsSync(srcSubdir)) {
          const swiftFiles = fs.readdirSync(srcSubdir).filter((f) => f.endsWith('.swift'));
          for (const f of swiftFiles) {
            fs.copyFileSync(path.join(srcSubdir, f), path.join(widgetSharedDir, f));
          }
        }
      }
      console.log('✅ Đã copy các Swift models và renderers vào LiveWidgetsExtension/Shared/');

      // D. Configure Xcode Project (project.pbxproj) via 'xcode' module
      let xcode;
      try {
        xcode = require('xcode');
      } catch (_e) {
        try {
          const resolveFrom = require.resolve('xcode', { paths: [projectRoot, __dirname] });
          xcode = require(resolveFrom);
        } catch (_e2) {}
      }

      if (xcode && fs.existsSync(pbxprojPath)) {
        const myProj = xcode.project(pbxprojPath);
        myProj.parseSync();

        const targetName = 'LiveWidgetsExtension';
        const targetBundleId = `${appGroup.replace('group.', '')}.LiveWidgetsExtension`;

        let targetExists = false;
        const targets = myProj.pbxNativeTargetSection();
        for (const key in targets) {
          if (targets[key] && targets[key].name === targetName) {
            targetExists = true;
            break;
          }
        }

        if (!targetExists) {
          console.log('➕ Đang tạo Xcode Target LiveWidgetsExtension...');
          const newTarget = myProj.addTarget(targetName, 'app_extension', targetName);

          // Tạo các Build Phases riêng biệt cho Extension Target
          myProj.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', newTarget.uuid);
          myProj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', newTarget.uuid);
          myProj.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', newTarget.uuid);

          // Thêm các file Swift CHỈ vào Sources của Extension Target (tránh xung đột @main với AppDelegate)
          const filesToAdd = [
            'LiveWidgetsExtension/LiveWidgetsBundle.swift',
            ...fs.readdirSync(widgetSharedDir).filter(f => f.endsWith('.swift')).map(f => `LiveWidgetsExtension/Shared/${f}`)
          ];

          for (const relPath of filesToAdd) {
            myProj.addSourceFile(relPath, { target: newTarget.uuid });
          }

          myProj.addFramework('WidgetKit.framework', { target: newTarget.uuid });
          myProj.addFramework('SwiftUI.framework', { target: newTarget.uuid });

          // Update build settings
          const configs = myProj.pbxXCBuildConfigurationSection();
          for (const key in configs) {
            const config = configs[key];
            if (config.buildSettings && (config.buildSettings.PRODUCT_NAME === `"${targetName}"` || config.buildSettings.PRODUCT_NAME === targetName)) {
              config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${targetBundleId}"`;
              config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"LiveWidgetsExtension/LiveWidgetsExtension.entitlements"`;
              config.buildSettings.INFOPLIST_FILE = `"LiveWidgetsExtension/Info.plist"`;
              config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.4';
              config.buildSettings.SWIFT_VERSION = '5.0';
              config.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
              config.buildSettings.LD_RUNPATH_SEARCH_PATHS = `"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"`;
              config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
            }
          }

          // Embed in Main App
          const mainTargetKey = myProj.findTargetKey(appName);
          if (mainTargetKey) {
            const copyPhase = myProj.addBuildPhase(
              [],
              'PBXCopyFilesBuildPhase',
              'Embed App Extensions',
              mainTargetKey,
              'app_extension'
            );
            if (copyPhase && copyPhase.buildPhase) {
              copyPhase.buildPhase.dstSubfolderSpec = 13;
            }
            myProj.addTargetDependency(mainTargetKey, [newTarget.uuid]);
          }

          fs.writeFileSync(pbxprojPath, myProj.writeSync(), 'utf8');
          console.log('✅ Đã nhúng LiveWidgetsExtension vào project.pbxproj thành công!');
        } else {
          console.log('ℹ️ LiveWidgetsExtension target đã tồn tại trong Xcode project.');
        }
      }

      // E. Update Podfile
      const podfilePath = path.join(iosDir, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podContent = fs.readFileSync(podfilePath, 'utf8');
        if (!podContent.includes('react-native-live-widgets')) {
          podContent = podContent.replace(
            `target '${appName}' do`,
            `target '${appName}' do\n  pod 'react-native-live-widgets', :path => '../node_modules/react-native-live-widgets'`
          );
          fs.writeFileSync(podfilePath, podContent, 'utf8');
          console.log(`✅ Đã thêm pod 'react-native-live-widgets' vào Podfile`);
        }
      }

      // F. Run pod install
      try {
        console.log('🔄 Đang chạy pod install...');
        execSync('pod install', { cwd: iosDir, stdio: 'inherit' });
        console.log('✅ pod install hoàn tất!');
      } catch (_e) {
        console.warn('⚠️ Vui lòng chạy "cd ios && pod install" thủ công.');
      }
    }
  } catch (e) {
    console.warn('⚠️ Lỗi khi cấu hình iOS:', e.message);
  }
} else if (isExpo) {
  console.log('\n💡 Gợi ý: Thư mục ios/ chưa được tạo. Sau khi cấu hình app.json xong, bạn chỉ cần chạy:');
  console.log('👉 npx expo prebuild');
  console.log('👉 npx react-native-live-widgets init (để tự động liên kết Xcode target)');
}

// 4. Configure Android Native Project (if android/ folder exists)
if (fs.existsSync(androidDir)) {
  console.log('\n🤖 Đang kiểm tra cấu hình Android...');
  const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    try {
      let manifest = fs.readFileSync(manifestPath, 'utf8');
      let changed = false;
      const permissions = [
        '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
        '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
      ];
      for (const perm of permissions) {
        if (!manifest.includes(perm)) {
          manifest = manifest.replace(
            '<manifest',
            `<manifest\n    ${perm}`
          );
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(manifestPath, manifest, 'utf8');
        console.log('✅ Đã thêm permissions vào AndroidManifest.xml');
      } else {
        console.log('ℹ️ Permissions Android đã đầy đủ');
      }
    } catch (e) {
      console.warn('⚠️ Không thể cập nhật AndroidManifest.xml:', e.message);
    }
  }
}

// 5. Ensure widgets.config.ts exists
const configCandidates = [
  'widgets.config.ts',
  'widgets.config.js',
  'widgets.config.mjs',
  'widgets.config.cjs',
  'widgets.config.json',
];
const hasConfig = configCandidates.some((c) => fs.existsSync(path.join(projectRoot, c)));
if (!hasConfig) {
  const targetConfig = path.join(projectRoot, 'widgets.config.ts');
  const defaultTemplate = `import { defineWidgetConfig } from 'react-native-live-widgets';

export default defineWidgetConfig({
  bundleName: 'LiveWidgetsBundle',
  liveActivity: true,
  controlWidgets: true,
  defaultLocale: 'vi',
  locales: {
    vi: {
      'widgets.main.title': 'Tiện ích Live Widgets',
      'widgets.main.desc': 'Tự động đồng bộ và hiển thị theo mẫu giao diện bạn chọn trong ứng dụng.',
    },
    en: {
      'widgets.main.title': 'Live Widgets Utility',
      'widgets.main.desc': 'Automatically syncs and displays layouts defined in your React Native app.',
    },
  },
  widgets: [
    {
      key: 'main',
      kind: 'DynamicHomeScreenWidget',
      displayName: 'widgets.main.title',
      description: 'widgets.main.desc',
      supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
    },
  ],
});
`;
  fs.writeFileSync(targetConfig, defaultTemplate, 'utf8');
  console.log('✅ Đã tạo cấu hình mặc định: widgets.config.ts');
}

console.log('\n🎉 THIẾT LẬP HOÀN TẤT 100%!');
console.log('👉 Bạn có thể chạy ứng dụng ngay bây giờ:');
if (isExpo) {
  console.log('   - iOS: npx expo run:ios');
  console.log('   - Android: npx expo run:android');
} else {
  console.log('   - iOS: npx react-native run-ios');
  console.log('   - Android: npx react-native run-android');
}
console.log('');
