const path = require('path');
const fs = require('fs');

/**
 * Expo Config Plugin for react-native-live-widgets
 * 
 * Automatically configures:
 * 1. iOS Info.plist: NSSupportsLiveActivities = YES, NSSupportsLiveActivitiesFrequentUpdates = YES
 * 2. iOS Entitlements: com.apple.security.application-groups = [appGroup]
 * 3. Android AndroidManifest.xml: POST_NOTIFICATIONS, FOREGROUND_SERVICE permissions
 */

let withLiveWidgets;

try {
  const {
    withInfoPlist,
    withEntitlementsPlist,
    withAndroidManifest,
    withDangerousMod,
    createRunOncePlugin,
  } = require('@expo/config-plugins');

  const pkg = require('./package.json');
  const { runCodegen } = require('./cli/codegen');

  /**
   * Configures iOS Info.plist to enable Live Activities support
   */
  const withLiveWidgetsInfoPlist = (config, options = {}) => {
    return withInfoPlist(config, (plistConfig) => {
      const enableLiveActivities =
        options.enableLiveActivities !== undefined ? options.enableLiveActivities : true;
      const frequentUpdates =
        options.frequentUpdates !== undefined ? options.frequentUpdates : true;

      plistConfig.modResults.NSSupportsLiveActivities = enableLiveActivities;
      if (frequentUpdates) {
        plistConfig.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
      }

      return plistConfig;
    });
  };

  /**
   * Configures iOS Entitlements for App Groups shared storage
   */
  const withLiveWidgetsEntitlements = (config, options = {}) => {
    return withEntitlementsPlist(config, (entitlementsConfig) => {
      if (options.appGroup) {
        const existingGroups =
          entitlementsConfig.modResults['com.apple.security.application-groups'] || [];
        const groups = Array.isArray(existingGroups) ? [...existingGroups] : [existingGroups];

        if (!groups.includes(options.appGroup)) {
          groups.push(options.appGroup);
        }

        entitlementsConfig.modResults['com.apple.security.application-groups'] = groups;
      }
      return entitlementsConfig;
    });
  };

  /**
   * Configures Android Manifest permissions for Notifications & Background Service
   */
  const withLiveWidgetsAndroidManifest = (config, _options = {}) => {
    return withAndroidManifest(config, (manifestConfig) => {
      const manifest = manifestConfig.modResults.manifest;

      if (!manifest['uses-permission']) {
        manifest['uses-permission'] = [];
      }

      const permissions = [
        'android.permission.INTERNET',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.FOREGROUND_SERVICE',
      ];

      for (const permission of permissions) {
        const hasPermission = manifest['uses-permission'].some(
          (p) => p.$?.['android:name'] === permission
        );
        if (!hasPermission) {
          manifest['uses-permission'].push({
            $: { 'android:name': permission },
          });
        }
      }

      return manifestConfig;
    });
  };

  /**
   * Tự động chạy TypeScript-driven Widget Codegen & i18n Sync trong quá trình expo prebuild
   */
  const withLiveWidgetsCodegen = (config, options = {}) => {
    return withDangerousMod(config, [
      'ios',
      async (modConfig) => {
        const projectRoot = modConfig.modRequest.projectRoot;
        try {
          runCodegen(projectRoot, options.configPath);
        } catch (error) {
          // Nếu chưa có file widgets.config.ts thì chỉ thông báo log, không làm fail build prebuild
          console.log(`ℹ️ [Expo Plugin] LiveWidgets Codegen: ${error.message}`);
        }
        return modConfig;
      },
    ]);
  };

  /**
   * Main Expo Config Plugin composite function
   */
  const plugin = (config, options = {}) => {
    config = withLiveWidgetsInfoPlist(config, options);
    config = withLiveWidgetsEntitlements(config, options);
    config = withLiveWidgetsAndroidManifest(config, options);
    config = withLiveWidgetsCodegen(config, options);
    return config;
  };

  withLiveWidgets = createRunOncePlugin(plugin, pkg.name, pkg.version);
} catch (_error) {
  // Fallback for non-Expo / bare React Native environments where @expo/config-plugins is absent
  withLiveWidgets = function (config) {
    return config;
  };
}

module.exports = withLiveWidgets;
