#!/usr/bin/env node

/**
 * TypeScript-Driven WidgetKit Codegen for react-native-live-widgets
 * 
 * Tự động đọc file cấu hình widgets.config.ts (hoặc .js / .json)
 * và sinh ra:
 * 1. File mã nguồn Swift hoàn chỉnh (LiveWidgetsBundle.swift)
 * 2. Tự động liên kết thư mục đa ngôn ngữ i18n (locales/*.json)
 *    và sinh ra các file Localizable.strings / Localizable.xcstrings cho iOS Extension.
 * 
 * Usage:
 *   npx react-native-live-widgets codegen
 *   npx live-widgets-codegen
 */

const fs = require('fs');
const path = require('path');

function toPascalCase(text) {
  if (!text) return 'Dynamic';
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
    .replace(/[\s_-]+/g, '');
}

function escapeSwiftString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Làm phẳng object lồng nhau (flatten JSON):
 * { widgets: { counter: { title: "A" } } } -> { "widgets.counter.title": "A" }
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else if (val !== undefined && val !== null) {
      result[fullKey] = String(val);
    }
  }
  return result;
}

/**
 * Trình tải cấu hình (TypeScript / JavaScript / JSON)
 */
function loadWidgetsConfig(projectRoot, customConfigPath = null) {
  let targetPath = null;
  if (customConfigPath) {
    targetPath = path.isAbsolute(customConfigPath)
      ? customConfigPath
      : path.join(projectRoot, customConfigPath);
  } else {
    const candidates = [
      'widgets.config.ts',
      'widgets.config.js',
      'widgets.config.mjs',
      'widgets.config.cjs',
      'widgets.config.json',
    ];
    for (const cand of candidates) {
      const fullPath = path.join(projectRoot, cand);
      if (fs.existsSync(fullPath)) {
        targetPath = fullPath;
        break;
      }
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    targetPath = path.join(projectRoot, 'widgets.config.ts');
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
    fs.writeFileSync(targetPath, defaultTemplate, 'utf8');
    console.log(`✨ Created default widget configuration at: widgets.config.ts`);
  }

  console.log(`📄 Reading widget configuration from: ${path.relative(projectRoot, targetPath)}`);

  if (targetPath.endsWith('.json')) {
    const raw = fs.readFileSync(targetPath, 'utf8');
    return { config: JSON.parse(raw), configPath: targetPath };
  }

  // Đối với .ts / .js
  let rawCode = fs.readFileSync(targetPath, 'utf8');
  let jsCode = rawCode;

  if (targetPath.endsWith('.ts')) {
    let tsCompiler = null;
    try {
      tsCompiler = require(require.resolve('typescript', { paths: [projectRoot, __dirname] }));
    } catch (_) {}

    if (tsCompiler) {
      jsCode = tsCompiler.transpileModule(rawCode, {
        compilerOptions: {
          module: tsCompiler.ModuleKind.CommonJS,
          target: tsCompiler.ScriptTarget.ES2020,
          allowJs: true,
        },
      }).outputText;
    } else {
      // Fallback: Loại bỏ type annotations cơ bản nếu không có typescript module
      jsCode = rawCode
        .replace(/import\s+[^;]+;?/g, '')
        .replace(/export\s+default\s+/g, 'module.exports = ')
        .replace(/export\s+const\s+/g, 'const ');
    }
  }

  // Chạy mã đã chuyển đổi trong môi trường module giả lập
  const moduleContext = { exports: {} };
  const mockRequire = (id) => {
    if (id === 'react-native-live-widgets') {
      return {
        defineWidgetsConfig: (c) => c,
        defineWidgetConfig: (c) => c,
      };
    }
    try {
      return require(require.resolve(id, { paths: [projectRoot, __dirname] }));
    } catch (_err) {
      return {};
    }
  };

  try {
    const executeFn = new Function('module', 'exports', 'require', '__dirname', '__filename', jsCode);
    executeFn(
      moduleContext,
      moduleContext.exports,
      mockRequire,
      path.dirname(targetPath),
      targetPath
    );
  } catch (err) {
    throw new Error(`Failed to execute config file (${path.basename(targetPath)}): ${err.message}`);
  }

  const loadedConfig = moduleContext.exports.default || moduleContext.exports.config || moduleContext.exports;
  if (!loadedConfig || typeof loadedConfig !== 'object') {
    throw new Error(
      `Config file (${path.basename(targetPath)}) does not export a valid configuration object.`
    );
  }

  return { config: loadedConfig, configPath: targetPath };
}

/**
 * Xây dựng Catalog bản dịch i18n từ thư mục locales JSON và inline translations
 */
function buildI18nCatalog(projectRoot, config) {
  const i18nConfig = config.i18n || {};
  const defaultLocale = i18nConfig.defaultLocale || 'vi';
  const catalog = {};

  const ensureLocale = (loc) => {
    if (!catalog[loc]) catalog[loc] = {};
  };

  ensureLocale(defaultLocale);

  // 1. Đọc từ thư mục localesDir
  if (i18nConfig.localesDir) {
    const localesFullPath = path.isAbsolute(i18nConfig.localesDir)
      ? i18nConfig.localesDir
      : path.join(projectRoot, i18nConfig.localesDir);

    if (fs.existsSync(localesFullPath)) {
      const files = fs.readdirSync(localesFullPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const locale = path.basename(file, '.json');
          ensureLocale(locale);
          try {
            const raw = fs.readFileSync(path.join(localesFullPath, file), 'utf8');
            const parsed = JSON.parse(raw);
            const flat = flattenObject(parsed);
            Object.assign(catalog[locale], flat);
          } catch (e) {
            console.warn(`⚠️ [i18n] Failed to read locale file ${file}:`, e.message);
          }
        }
      }
    }
  }

  // 2. Đọc từ translations inline
  if (i18nConfig.translations) {
    for (const [loc, dict] of Object.entries(i18nConfig.translations)) {
      ensureLocale(loc);
      const flat = flattenObject(dict);
      Object.assign(catalog[loc], flat);
    }
  }

  // 3. Đọc từ từng widget nếu khai báo object inline: { vi: '...', en: '...' }
  const widgets = Array.isArray(config.widgets) ? config.widgets : [];
  for (const w of widgets) {
    const key = w.key || 'main';

    if (w.displayName && typeof w.displayName === 'object') {
      const transKey = `widget.${key}.title`;
      for (const [loc, val] of Object.entries(w.displayName)) {
        ensureLocale(loc);
        catalog[loc][transKey] = String(val);
      }
      w._resolvedDisplayNameKey = transKey;
    }

    if (w.description && typeof w.description === 'object') {
      const descKey = `widget.${key}.desc`;
      for (const [loc, val] of Object.entries(w.description)) {
        ensureLocale(loc);
        catalog[loc][descKey] = String(val);
      }
      w._resolvedDescriptionKey = descKey;
    }
  }

  return { catalog, defaultLocale };
}

/**
 * Xuất các file Localizable.strings và Localizable.xcstrings cho iOS Extension target
 */
function writeI18nFiles(targetDir, catalog, defaultLocale, projectRoot) {
  const locales = Object.keys(catalog);
  if (locales.length === 0) return;

  // 1. Tạo các thư mục {lang}.lproj/Localizable.strings
  for (const loc of locales) {
    const lprojDir = path.join(targetDir, `${loc}.lproj`);
    if (!fs.existsSync(lprojDir)) {
      fs.mkdirSync(lprojDir, { recursive: true });
    }
    const stringsPath = path.join(lprojDir, 'Localizable.strings');
    const lines = [
      '/*',
      ' * Localizable.strings',
      ' * Generated automatically by react-native-live-widgets. DO NOT EDIT DIRECTLY.',
      ` * Language: ${loc}`,
      ' */',
      '',
    ];

    const entries = Object.entries(catalog[loc]);
    for (const [key, value] of entries) {
      const escapedKey = escapeSwiftString(key);
      const escapedVal = escapeSwiftString(value);
      lines.push(`"${escapedKey}" = "${escapedVal}";`);
    }
    lines.push('');
    fs.writeFileSync(stringsPath, lines.join('\n'), 'utf8');
  }

  // 2. Tạo file String Catalog: Localizable.xcstrings (Chuẩn Apple hiện đại iOS 16+)
  const allKeys = new Set();
  for (const loc of locales) {
    Object.keys(catalog[loc]).forEach((k) => allKeys.add(k));
  }

  const xcstringsData = {
    sourceLanguage: defaultLocale,
    strings: {},
    version: '1.0',
  };

  for (const key of allKeys) {
    const localizations = {};
    for (const loc of locales) {
      if (catalog[loc] && catalog[loc][key] !== undefined) {
        localizations[loc] = {
          stringUnit: {
            state: 'translated',
            value: catalog[loc][key],
          },
        };
      }
    }
    xcstringsData.strings[key] = {
      localizations,
    };
  }

  const xcstringsPath = path.join(targetDir, 'Localizable.xcstrings');
  fs.writeFileSync(xcstringsPath, JSON.stringify(xcstringsData, null, 2), 'utf8');

  console.log(`🌐 Successfully generated iOS localizations (${locales.join(', ')})`);
  console.log(`   - String Catalog: ${path.basename(targetDir)}/Localizable.xcstrings`);

  if (projectRoot) {
    syncI18nWithXcodeProject(projectRoot, locales, targetDir);
  }
}

/**
 * Tự động liên kết Localizable.xcstrings vào Xcode project.pbxproj và cập nhật CFBundleLocalizations
 */
function syncI18nWithXcodeProject(projectRoot, locales, targetDir) {
  const iosDir = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosDir)) return;

  // 1. Cập nhật CFBundleLocalizations trong Info.plist của Extension
  const infoPlistPath = path.join(targetDir, 'Info.plist');
  if (fs.existsSync(infoPlistPath)) {
    try {
      let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
      if (!plistContent.includes('CFBundleLocalizations')) {
        const localizationsXml = [
          '\t<key>CFBundleLocalizations</key>',
          '\t<array>',
          ...locales.map((loc) => `\t\t<string>${loc}</string>`),
          '\t</array>',
        ].join('\n');
        plistContent = plistContent.replace('</dict>', `${localizationsXml}\n</dict>`);
        fs.writeFileSync(infoPlistPath, plistContent, 'utf8');
      }
    } catch (_e) {}
  }

  // 2. Tìm project.pbxproj
  try {
    const entries = fs.readdirSync(iosDir);
    const xcodeProj = entries.find((e) => e.endsWith('.xcodeproj'));
    if (!xcodeProj) return;

    const pbxPath = path.join(iosDir, xcodeProj, 'project.pbxproj');
    if (!fs.existsSync(pbxPath)) return;

    let pbxContent = fs.readFileSync(pbxPath, 'utf8');
    let modified = false;

    // Check if Localizable.xcstrings is already referenced
    if (!pbxContent.includes('Localizable.xcstrings')) {
      const buildFileUuid = 'CC0100000000000000000001';
      const fileRefUuid = 'CC0200000000000000000001';

      // Add to PBXBuildFile
      const buildFileEntry = `/* Begin PBXBuildFile section */\n\t\t${buildFileUuid} /* Localizable.xcstrings in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefUuid} /* Localizable.xcstrings */; };`;
      if (pbxContent.includes('/* Begin PBXBuildFile section */')) {
        pbxContent = pbxContent.replace('/* Begin PBXBuildFile section */', buildFileEntry);
        modified = true;
      }

      // Add to PBXFileReference
      const relXcstringsPath = `${path.basename(targetDir)}/Localizable.xcstrings`;
      const fileRefEntry = `/* Begin PBXFileReference section */\n\t\t${fileRefUuid} /* Localizable.xcstrings */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = text.json.xcstrings; name = Localizable.xcstrings; path = ${relXcstringsPath}; sourceTree = "<group>"; };`;
      if (pbxContent.includes('/* Begin PBXFileReference section */')) {
        pbxContent = pbxContent.replace('/* Begin PBXFileReference section */', fileRefEntry);
        modified = true;
      }

      // Add to Extension Group children
      const extGroupName = path.basename(targetDir);
      const groupRegex = new RegExp(`(/\\* ${extGroupName} \\*/ = {[\\s\\S]*?children = \\()([\\s\\S]*?\\);)`);
      if (groupRegex.test(pbxContent)) {
        pbxContent = pbxContent.replace(groupRegex, `$1\n\t\t\t\t${fileRefUuid} /* Localizable.xcstrings */,$2`);
        modified = true;
      }

      // Add to Resources Build Phase of Extension
      const resPhaseRegex = /(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()([\s\S]*?\);)/g;
      const matches = [...pbxContent.matchAll(resPhaseRegex)];
      if (matches.length > 0) {
        const targetMatch = matches.length > 1 ? matches[1] : matches[0];
        const updatedMatch = `${targetMatch[1]}\n\t\t\t\t${buildFileUuid} /* Localizable.xcstrings in Resources */,${targetMatch[2]}`;
        pbxContent = pbxContent.replace(targetMatch[0], updatedMatch);
        modified = true;
      }
    }

    // Sync knownRegions with locales
    for (const loc of locales) {
      if (!pbxContent.includes(`\t\t\t\t${loc},\n`)) {
        pbxContent = pbxContent.replace(
          /(knownRegions = \([\s\S]*?Base,)/,
          `$1\n\t\t\t\t${loc},`
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(pbxPath, pbxContent, 'utf8');
      console.log(`📎 Automatically linked Localizable.xcstrings into ${xcodeProj} Resources.`);
    }
  } catch (err) {
    console.warn(`⚠️ [i18n] Could not auto-link Localizable.xcstrings in project.pbxproj:`, err.message);
  }
}

/**
 * Chuyển đổi key sang tên tài nguyên Android hợp lệ:
 * 'widgets.counter.title' -> 'widgets_counter_title'
 */
function toAndroidStringName(key) {
  if (!key) return 'rn_live_widget_str';
  let clean = key
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (/^[0-9]/.test(clean)) {
    clean = 'str_' + clean;
  }
  return clean;
}

/**
 * Escape chuỗi đặc biệt cho Android XML
 */
function escapeAndroidXmlString(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

/**
 * Tự động tạo và cập nhật các file strings.xml cho Android
 * Thư mục: android/app/src/main/res/values/ (mặc định) và values-{lang}/ (các ngôn ngữ khác)
 */
function writeAndroidI18nFiles(projectRoot, catalog, defaultLocale) {
  const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(resDir)) {
    return;
  }

  const locales = Object.keys(catalog);
  if (locales.length === 0) return;

  for (const loc of locales) {
    // Với defaultLocale -> res/values/strings.xml
    // Với các ngôn ngữ khác -> res/values-{loc}/strings.xml (ví dụ: values-vi, values-en, values-ja)
    const folderName = loc === defaultLocale ? 'values' : `values-${loc}`;
    const valuesDir = path.join(resDir, folderName);
    if (!fs.existsSync(valuesDir)) {
      fs.mkdirSync(valuesDir, { recursive: true });
    }

    const stringsXmlPath = path.join(valuesDir, 'strings.xml');
    const existingStrings = new Map();

    if (fs.existsSync(stringsXmlPath)) {
      const existingContent = fs.readFileSync(stringsXmlPath, 'utf8');
      const regex = /<string\s+name="([^"]+)">([\s\S]*?)<\/string>/g;
      let match;
      while ((match = regex.exec(existingContent)) !== null) {
        existingStrings.set(match[1], match[2]);
      }
    }

    // Merge các bản dịch vào file
    const dict = catalog[loc] || {};
    for (const [key, value] of Object.entries(dict)) {
      const androidName = toAndroidStringName(key);
      const escaped = escapeAndroidXmlString(value);
      existingStrings.set(androidName, escaped);
    }

    const lines = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<resources>',
    ];
    for (const [name, val] of existingStrings.entries()) {
      lines.push(`    <string name="${name}">${val}</string>`);
    }
    lines.push('</resources>');
    lines.push('');

    fs.writeFileSync(stringsXmlPath, lines.join('\n'), 'utf8');
  }

  console.log(`🤖 Successfully synced Android localizations (${locales.join(', ')})`);
  console.log(`   - Directory: android/app/src/main/res/values-*/strings.xml`);
}

/**
 * Sinh mã nguồn Swift từ cấu hình
 */
function generateSwiftSource(config, catalog = {}, defaultLocale = 'vi') {
  const bundleName = config.bundleName || 'LiveWidgetsBundle';
  const enableLiveActivity = config.liveActivity !== false;
  const enableControlWidgets = config.controlWidgets !== false;
  const widgets = Array.isArray(config.widgets) ? config.widgets : [];

  const defaultDict = catalog[defaultLocale] || {};

  const processedWidgets = widgets.map((w, index) => {
    const key = w.key || (index === 0 ? 'main' : `widget_${index}`);
    let kind = w.kind;
    if (!kind) {
      const base = toPascalCase(key);
      kind = base.endsWith('HomeScreenWidget') ? base : `${base}HomeScreenWidget`;
    }

    // Process displayName (i18n key or plain string)
    let displayNameKey = w._resolvedDisplayNameKey || w.displayName || `Widget ${key}`;
    if (typeof displayNameKey === 'object') {
      displayNameKey = displayNameKey[defaultLocale] || Object.values(displayNameKey)[0] || `Widget ${key}`;
    }

    // Process description (i18n key or plain string)
    let descriptionKey = w._resolvedDescriptionKey || w.description || '';
    if (typeof descriptionKey === 'object') {
      descriptionKey = descriptionKey[defaultLocale] || Object.values(descriptionKey)[0] || '';
    }

    const standbyMargins = Boolean(w.standbyMargins);

    let supportedFamiliesCode = 'commonFamilies';
    if (Array.isArray(w.supportedFamilies) && w.supportedFamilies.length > 0) {
      const familiesList = w.supportedFamilies
        .map((f) => `.${f.trim()}`)
        .join(', ');
      supportedFamiliesCode = `[${familiesList}]`;
    }

    // Lấy tiêu đề hiển thị cho comment code Swift
    const commentTitle = defaultDict[displayNameKey] || displayNameKey;

    return {
      key,
      kind,
      displayNameKey: escapeSwiftString(displayNameKey),
      descriptionKey: escapeSwiftString(descriptionKey),
      commentTitle: escapeSwiftString(commentTitle),
      supportedFamiliesCode,
      standbyMargins,
    };
  });

  const lines = [];

  // 1. Header
  lines.push('//');
  lines.push('// LiveWidgetsBundle.swift');
  lines.push('// Generated automatically by react-native-live-widgets. DO NOT EDIT DIRECTLY.');
  lines.push('// Source config: widgets.config.ts');
  lines.push('//');
  lines.push('');
  lines.push('import WidgetKit');
  lines.push('import SwiftUI');
  lines.push('#if canImport(react_native_live_widgets)');
  lines.push('import react_native_live_widgets');
  lines.push('#endif');
  lines.push('');
  lines.push('/// Bundle extension supporting both Live Activities (Dynamic Island / Lock Screen)');
  lines.push('/// and Home Screen Widgets (iOS 16.1 -> iOS 17/18+)');
  lines.push('@main');
  lines.push(`struct ${bundleName}: WidgetBundle {`);
  lines.push('  var body: some Widget {');

  // Live Activity
  if (enableLiveActivity) {
    lines.push('    // 1. Live Activity & Dynamic Island (iOS 16.1+)');
    lines.push('    if #available(iOS 16.1, *) {');
    lines.push('      DynamicLiveActivityWidget()');
    lines.push('    }');
    lines.push('');
  }

  // Home Screen Widgets
  if (processedWidgets.length > 0) {
    lines.push('    // 2. Home Screen Widgets registered from TypeScript configuration');
    for (const w of processedWidgets) {
      lines.push(`    ${w.kind}()`);
    }
  }

  // Control Center Widgets (iOS 18+)
  if (enableControlWidgets) {
    lines.push('');
    lines.push('    // 3. iOS 18+ Interactive Control Center Widgets');
    lines.push('    if #available(iOS 18.0, *) {');
    lines.push('      DynamicControlWidget()');
    lines.push('      DynamicControlToggleWidget()');
    lines.push('    }');
  }

  lines.push('  }');
  lines.push('}');
  lines.push('');

  // 2. Định nghĩa từng Widget struct
  processedWidgets.forEach((w, idx) => {
    lines.push(`// ── ${idx + 1}. TIỆN ÍCH: ${w.commentTitle.toUpperCase()} (KEY: "${w.key}") ──`);
    lines.push(`struct ${w.kind}: Widget {`);
    lines.push(`  let kind: String = "${w.kind}"`);
    lines.push('');
    lines.push('  var body: some WidgetConfiguration {');
    lines.push(`    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "${w.key}")) { entry in`);
    lines.push('      DynamicHomeScreenWidgetView(entry: entry)');
    lines.push('    }');
    lines.push(`    .configurationDisplayName(LocalizedStringKey("${w.displayNameKey}"))`);
    if (w.descriptionKey) {
      lines.push(`    .description(LocalizedStringKey("${w.descriptionKey}"))`);
    }
    lines.push(`    .supportedFamilies(${w.supportedFamiliesCode})`);
    if (w.standbyMargins) {
      lines.push('    .applyStandByMargins()');
    }
    lines.push('  }');
    lines.push('}');
    lines.push('');
  });

  // 3. Helper commonFamilies
  lines.push('private var commonFamilies: [WidgetFamily] {');
  lines.push('  var list: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge]');
  lines.push('  if #available(iOS 16.0, *) {');
  lines.push('    list.append(contentsOf: [.accessoryRectangular, .accessoryCircular, .accessoryInline])');
  lines.push('  }');
  lines.push('  return list');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Tìm kiếm đường dẫn file LiveWidgetsBundle.swift trên dự án iOS
 */
function findBundleSwiftPath(projectRoot) {
  const iosDir = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosDir)) {
    return null;
  }

  // 1. Tìm file *Bundle.swift sẵn có
  const entries = fs.readdirSync(iosDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.toLowerCase().includes('widget')) {
      const widgetDir = path.join(iosDir, entry.name);
      const subEntries = fs.readdirSync(widgetDir);
      for (const file of subEntries) {
        if (file.endsWith('Bundle.swift')) {
          return path.join(widgetDir, file);
        }
      }
    }
  }

  // 2. Mặc định là ios/LiveWidgetsExtension/LiveWidgetsBundle.swift
  const defaultDir = path.join(iosDir, 'LiveWidgetsExtension');
  return path.join(defaultDir, 'LiveWidgetsBundle.swift');
}

/**
 * Đảm bảo file Info.plist cho Widget Extension luôn tồn tại
 */
function ensureExtensionInfoPlist(targetDir) {
  const infoPlistPath = path.join(targetDir, 'Info.plist');
  if (!fs.existsSync(infoPlistPath)) {
    const defaultInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>en</string>
\t<key>CFBundleDisplayName</key>
\t<string>${path.basename(targetDir)}</string>
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
\t<key>RCTNewArchEnabled</key>
\t<true/>
</dict>
</plist>
`;
    fs.writeFileSync(infoPlistPath, defaultInfoPlist, 'utf8');
    console.log(`🛡️  Ensured WidgetKit Extension Info.plist at: ${path.basename(targetDir)}/Info.plist`);
  }
}

/**
 * Thực thi lệnh Codegen
 */
function runCodegen(projectRoot = process.cwd(), customConfigPath = null) {
  console.log('\n⚙️ [react-native-live-widgets] Starting WidgetKit Swift & Android Codegen...');

  // Sync SF Symbols from Apple system if available
  try {
    const symbolsScript = path.join(__dirname, '..', 'scripts', 'generate-sf-symbols.js');
    if (fs.existsSync(symbolsScript)) {
      const { generateSFSymbolsFile } = require(symbolsScript);
      const targetGenerated = path.join(__dirname, '..', 'src', 'sf-symbols.generated.ts');
      const count = generateSFSymbolsFile(targetGenerated);
      if (count) {
        console.log(`🍎 Synced ${count} SF Symbols from Apple system into TypeScript Auto-Complete.`);
      }
    }
  } catch (_e) {}

  // Sync Google Material Icons if available
  try {
    const materialScript = path.join(__dirname, '..', 'scripts', 'generate-material-icons.js');
    if (fs.existsSync(materialScript)) {
      const { generateMaterialIconsFile } = require(materialScript);
      const targetGenerated = path.join(__dirname, '..', 'src', 'material-icons.generated.ts');
      const count = generateMaterialIconsFile(targetGenerated);
      if (count) {
        console.log(`🤖 Synced ${count} Google Material Icons into TypeScript Auto-Complete.`);
      }
    }
  } catch (_e) {}

  const { config, configPath } = loadWidgetsConfig(projectRoot, customConfigPath);
  const { catalog, defaultLocale } = buildI18nCatalog(projectRoot, config);

  const bundleSwiftPath = findBundleSwiftPath(projectRoot);
  if (bundleSwiftPath) {
    const targetDir = path.dirname(bundleSwiftPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Ensure extension Info.plist exists (auto-generate if missing)
    ensureExtensionInfoPlist(targetDir);

    // 1. Generate i18n Localizable if catalog exists
    if (Object.keys(catalog).length > 0) {
      writeI18nFiles(targetDir, catalog, defaultLocale, projectRoot);
    }

    // 2. Generate Swift source code
    const swiftCode = generateSwiftSource(config, catalog, defaultLocale);
    fs.writeFileSync(bundleSwiftPath, swiftCode, 'utf8');

    console.log(`✅ Successfully generated Swift source bundle!`);
    console.log(`📍 Destination: ${path.relative(projectRoot, bundleSwiftPath)}`);
    console.log(`📊 Registered Widgets: ${(config.widgets || []).length}`);
    if (config.widgets && config.widgets.length > 0) {
      const defaultDict = catalog[defaultLocale] || {};
      config.widgets.forEach((w, i) => {
        const rawName = w.displayName;
        const keyName = typeof rawName === 'object' ? rawName[defaultLocale] : rawName;
        const resolved = defaultDict[keyName] || keyName;
        console.log(`   ${i + 1}. [${w.key || 'main'}] ${resolved} (${keyName})`);
      });
    }
  } else {
    console.log("ℹ️ Native iOS directory 'ios/' not found yet (will be generated upon 'npx expo prebuild').");
  }

  // Generate Android i18n if android/ exists
  if (Object.keys(catalog).length > 0) {
    writeAndroidI18nFiles(projectRoot, catalog, defaultLocale);
  }

  console.log('🎉 All set! No manual Swift editing required.\n');
  return bundleSwiftPath;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let configArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configArg = args[i + 1];
      break;
    }
  }
  try {
    runCodegen(process.cwd(), configArg);
  } catch (error) {
    console.error(`\n❌ [Codegen Error]: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  runCodegen,
  generateSwiftSource,
  loadWidgetsConfig,
  buildI18nCatalog,
  flattenObject,
  toAndroidStringName,
  writeAndroidI18nFiles,
  ensureExtensionInfoPlist,
};
