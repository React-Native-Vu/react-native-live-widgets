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

// Support subcommands: codegen / generate
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

console.log('\n🚀 [react-native-live-widgets] Starting automated setup...');

// 1. Detect project name and bundle ID
let pkgName = 'MyApp';
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.name) pkgName = pkg.name;
  } catch (_e) {}
}

let appGroup = customAppGroup || `group.com.${pkgName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
console.log(`📦 App Group configured: ${appGroup}`);

// 2. Handle Expo project (app.json)
const isExpo = fs.existsSync(appJsonPath);
if (isExpo) {
  try {
    console.log('📱 Expo project detected. Updating app.json...');
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
      console.log('ℹ️ Updated react-native-live-widgets plugin in app.json');
    } else {
      appJson.expo.plugins.push(pluginConfig);
      console.log('✅ Added react-native-live-widgets plugin to app.json');
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
  } catch (e) {
    console.warn('⚠️ Failed to update app.json:', e.message);
  }
}

// 3. Configure iOS Native Project (if ios/ folder exists)
if (fs.existsSync(iosDir)) {
  console.log('\n🍎 Configuring iOS (Info.plist, Entitlements, WidgetExtension Target)...');

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
          console.log(`✅ Added NSSupportsLiveActivities to ${appName}/Info.plist`);
        } else {
          console.log(`ℹ️ NSSupportsLiveActivities already exists in ${appName}/Info.plist`);
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
        console.log(`✅ Created ${appName}.entitlements with App Group: ${appGroup}`);
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
          console.log(`✅ Added App Group to ${appName}.entitlements`);
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

/// Bundle extension supporting both Live Activities (Dynamic Island / Lock Screen)
/// and Home Screen Widgets (iOS 16.1 -> iOS 17/18+)
@main
struct LiveWidgetsBundle: WidgetBundle {
  var body: some Widget {
    // 1. Live Activity & Dynamic Island (iOS 16.1+)
    if #available(iOS 16.1, *) {
      DynamicLiveActivityWidget()
    }

    // 2. Primary dynamic Home Screen widget
    DynamicHomeScreenWidget()

    // 3. Interactive TypeScript counter widget
    InteractiveCounterHomeScreenWidget()

    // 4. Pro Features & Security widget
    ProFeaturesHomeScreenWidget()

    // 5. Shift Attendance widget
    ShiftAttendanceHomeScreenWidget()

    // 6. Multi-page Workspace widget
    MultiPageHomeScreenWidget()

    // 7. iOS 18+ Interactive Control Center Widgets
    if #available(iOS 18.0, *) {
      DynamicControlWidget()
      DynamicControlToggleWidget()
    }
  }
}

// ── 1. PRIMARY DYNAMIC WIDGET ──
struct DynamicHomeScreenWidget: Widget {
  let kind: String = "DynamicHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "main")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Live Widgets")
    .description("Automatically syncs and displays the dynamic layout selected in app.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 2. INTERACTIVE COUNTER WIDGET ──
struct InteractiveCounterHomeScreenWidget: Widget {
  let kind: String = "InteractiveCounterHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "counter")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Interactive Counter (TS)")
    .description("Tap [+] or [-] to trigger TypeScript logic directly.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 3. PRO FEATURES & SECURITY WIDGET ──
struct ProFeaturesHomeScreenWidget: Widget {
  let kind: String = "ProFeaturesHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "pro")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Security & KPI Pro")
    .description("Redacts sensitive data when locked and supports StandBy mode.")
    .supportedFamilies(commonFamilies)
    .applyStandByMargins()
  }
}

// ── 4. SHIFT ATTENDANCE WIDGET ──
struct ShiftAttendanceHomeScreenWidget: Widget {
  let kind: String = "ShiftAttendanceHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "shift")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Shift & Attendance")
    .description("Track clock-in time, shift end, and work progress bar.")
    .supportedFamilies(commonFamilies)
  }
}

// ── 5. MULTI-PAGE WORKSPACE WIDGET ──
struct MultiPageHomeScreenWidget: Widget {
  let kind: String = "MultiPageHomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "workspace")) { entry in
      DynamicHomeScreenWidgetView(entry: entry)
    }
    .configurationDisplayName("Multi-Page Workspace")
    .description("Switch between Shifts, Tasks, and OKRs directly on the widget.")
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
        console.log('✅ Created template: ios/LiveWidgetsExtension/LiveWidgetsBundle.swift');
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
        console.log('✅ Created Info.plist for Widget Extension');
      }

      // Create extension Entitlements
      const widgetEntitlementsPath = path.join(widgetTargetDir, 'LiveWidgetsExtension.entitlements');
      if (!fs.existsSync(widgetEntitlementsPath)) {
        fs.writeFileSync(widgetEntitlementsPath, entitlementsXml, 'utf8');
        console.log('✅ Created LiveWidgetsExtension.entitlements with App Group');
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
      console.log('✅ Copied Swift models and renderers into LiveWidgetsExtension/Shared/');

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
          console.log('➕ Creating Xcode Target LiveWidgetsExtension...');
          const newTarget = myProj.addTarget(targetName, 'app_extension', targetName);

          // Create separate Build Phases for the Extension Target
          myProj.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', newTarget.uuid);
          myProj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', newTarget.uuid);
          myProj.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', newTarget.uuid);

          // Add Swift files ONLY to Sources of Extension Target (prevents @main conflict with AppDelegate)
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
          console.log('✅ Successfully embedded LiveWidgetsExtension in project.pbxproj!');
        } else {
          console.log('ℹ️ LiveWidgetsExtension target already exists in Xcode project.');
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
          console.log(`✅ Added pod 'react-native-live-widgets' to Podfile`);
        }
      }

      // F. Run pod install
      try {
        console.log('🔄 Running pod install...');
        execSync('pod install', { cwd: iosDir, stdio: 'inherit' });
        console.log('✅ pod install completed successfully!');
      } catch (_e) {
        console.warn('⚠️ Please run "cd ios && pod install" manually.');
      }
    }
  } catch (e) {
    console.warn('⚠️ Error configuring iOS:', e.message);
  }
} else if (isExpo) {
  console.log('\n💡 Tip: ios/ directory not found. After configuring app.json, simply run:');
  console.log('👉 npx expo prebuild');
  console.log('👉 npx react-native-live-widgets init (to link Xcode target automatically)');
}

// 4. Configure Android Native Project (if android/ folder exists)
if (fs.existsSync(androidDir)) {
  console.log('\n🤖 Verifying Android configuration...');
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
        console.log('✅ Added permissions to AndroidManifest.xml');
      } else {
        console.log('ℹ️ Android permissions are already up-to-date');
      }
    } catch (e) {
      console.warn('⚠️ Failed to update AndroidManifest.xml:', e.message);
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

/**
 * ==============================================================================
 * react-native-live-widgets Configuration (widgets.config.ts)
 * ==============================================================================
 *
 * This configuration file drives the TypeScript codegen engine.
 * Run the following command whenever you modify this file:
 *
 *   npx react-native-live-widgets codegen
 *
 * It will automatically:
 *   1. Generate 'LiveWidgetsBundle.swift' for iOS WidgetKit Extension.
 *   2. Generate modern Apple String Catalog ('Localizable.xcstrings').
 *   3. Synchronize Android string resources ('res/values-{lang}/strings.xml').
 *   4. Synchronize SF Symbols (iOS) & Material Icons (Android) type definitions.
 * ==============================================================================
 */
export default defineWidgetConfig({
  /**
   * The name of the Swift WidgetBundle struct generated in the iOS extension.
   * Default: 'LiveWidgetsBundle'
   */
  bundleName: 'LiveWidgetsBundle',

  /**
   * Enable or disable iOS Lock Screen Live Activities & Dynamic Island.
   * Set to 'false' if your application only uses Home Screen widgets.
   */
  liveActivity: true,

  /**
   * Enable or disable iOS 18+ Interactive Control Center widgets.
   */
  controlWidgets: true,

  /**
   * Default fallback locale for widget titles, descriptions, and static labels.
   */
  defaultLocale: 'vi',

  /**
   * Multi-language translation catalog.
   * Keys defined here are automatically mapped to:
   *   - iOS: Localizable.xcstrings (LocalizedStringKey in Swift)
   *   - Android: res/values-{lang}/strings.xml (R.string in Kotlin/Java)
   */
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

  /**
   * List of registered Home Screen widgets.
   * Each entry maps to a distinct timeline provider and widget kind.
   */
  widgets: [
    {
      /** Unique key identifier used in Widget.setLayout('<key>', ...) */
      key: 'main',

      /** Native Swift struct kind name generated in WidgetBundle */
      kind: 'DynamicHomeScreenWidget',

      /** Display name shown in the iOS & Android Widget Gallery picker */
      displayName: 'widgets.main.title',

      /** Description shown below the widget preview in the Widget Gallery */
      description: 'widgets.main.desc',

      /** Supported widget sizes for this widget */
      supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
    },
  ],
});
`;
  fs.writeFileSync(targetConfig, defaultTemplate, 'utf8');
  console.log('✅ Created default configuration: widgets.config.ts');
}

// 6. Automatically run Codegen to generate icons, localizations, and LiveWidgetsBundle.swift
try {
  const { runCodegen } = require('./codegen');
  runCodegen(projectRoot);
} catch (codegenErr) {
  console.warn('⚠️ Codegen warning:', codegenErr.message);
}

console.log('🎉 SETUP 100% COMPLETE!');
console.log('👉 You can now run your application:');
if (isExpo) {
  console.log('   - iOS: npx expo run:ios');
  console.log('   - Android: npx expo run:android');
} else {
  console.log('   - iOS: npx react-native run-ios');
  console.log('   - Android: npx react-native run-android');
}
console.log('');
