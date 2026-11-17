#!/usr/bin/env node

/**
 * TypeScript-Driven WidgetKit Codegen for react-native-live-widgets
 * 
 * Tự động đọc file cấu hình widgets.config.ts (hoặc .js / .json)
 * và sinh ra file mã nguồn Swift hoàn chỉnh (LiveWidgetsBundle.swift)
 * mà không cần phải viết Swift thủ công.
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
    throw new Error(
      `Không tìm thấy file cấu hình widget! Vui lòng tạo 'widgets.config.ts' ở thư mục gốc của dự án.`
    );
  }

  console.log(`📄 Đang đọc cấu hình từ: ${path.relative(projectRoot, targetPath)}`);

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
    throw new Error(`Lỗi thực thi file cấu hình (${path.basename(targetPath)}): ${err.message}`);
  }

  const loadedConfig = moduleContext.exports.default || moduleContext.exports.config || moduleContext.exports;
  if (!loadedConfig || typeof loadedConfig !== 'object') {
    throw new Error(
      `File cấu hình (${path.basename(targetPath)}) không export đối tượng cấu hình hợp lệ.`
    );
  }

  return { config: loadedConfig, configPath: targetPath };
}

/**
 * Sinh mã nguồn Swift từ cấu hình
 */
function generateSwiftSource(config) {
  const bundleName = config.bundleName || 'LiveWidgetsBundle';
  const enableLiveActivity = config.liveActivity !== false;
  const enableControlWidgets = config.controlWidgets !== false;
  const widgets = Array.isArray(config.widgets) ? config.widgets : [];

  const processedWidgets = widgets.map((w, index) => {
    const key = w.key || (index === 0 ? 'main' : `widget_${index}`);
    let kind = w.kind;
    if (!kind) {
      const base = toPascalCase(key);
      kind = base.endsWith('HomeScreenWidget') ? base : `${base}HomeScreenWidget`;
    }
    const displayName = escapeSwiftString(w.displayName || `Tiện ích ${key}`);
    const description = escapeSwiftString(w.description || '');
    const standbyMargins = Boolean(w.standbyMargins);

    let supportedFamiliesCode = 'commonFamilies';
    if (Array.isArray(w.supportedFamilies) && w.supportedFamilies.length > 0) {
      const familiesList = w.supportedFamilies
        .map((f) => `.${f.trim()}`)
        .join(', ');
      supportedFamiliesCode = `[${familiesList}]`;
    }

    return {
      key,
      kind,
      displayName,
      description,
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
  lines.push('/// Bundle mở rộng hỗ trợ cả Live Activity (Lock Screen & Dynamic Island)');
  lines.push('/// và Home Screen Widgets (Màn hình chính iOS 16.1 -> iOS 17/18/27+)');
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
    lines.push('    // 2. Home Screen Widgets đăng ký từ TypeScript config');
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
    lines.push(`// ── ${idx + 1}. TIỆN ÍCH: ${w.displayName.toUpperCase()} (KEY: "${w.key}") ──`);
    lines.push(`struct ${w.kind}: Widget {`);
    lines.push(`  let kind: String = "${w.kind}"`);
    lines.push('');
    lines.push('  var body: some WidgetConfiguration {');
    lines.push(`    StaticConfiguration(kind: kind, provider: DynamicWidgetProvider(widgetKey: "${w.key}")) { entry in`);
    lines.push('      DynamicHomeScreenWidgetView(entry: entry)');
    lines.push('    }');
    lines.push(`    .configurationDisplayName("${w.displayName}")`);
    if (w.description) {
      lines.push(`    .description("${w.description}")`);
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
 * Thực thi lệnh Codegen
 */
function runCodegen(projectRoot = process.cwd(), customConfigPath = null) {
  console.log('\n⚙️ [react-native-live-widgets] Khởi chạy WidgetKit Swift Codegen...');

  const { config, configPath } = loadWidgetsConfig(projectRoot, customConfigPath);
  const swiftCode = generateSwiftSource(config);

  const bundleSwiftPath = findBundleSwiftPath(projectRoot);
  if (!bundleSwiftPath) {
    throw new Error('Không tìm thấy thư mục ios/ trong dự án.');
  }

  const targetDir = path.dirname(bundleSwiftPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(bundleSwiftPath, swiftCode, 'utf8');

  console.log(`✅ Đã tự động sinh file Swift thành công!`);
  console.log(`📍 Đích: ${path.relative(projectRoot, bundleSwiftPath)}`);
  console.log(`📊 Số lượng Widget đã đăng ký: ${(config.widgets || []).length}`);
  if (config.widgets && config.widgets.length > 0) {
    config.widgets.forEach((w, i) => {
      console.log(`   ${i + 1}. [${w.key || 'main'}] ${w.displayName}`);
    });
  }
  console.log('🎉 Sẵn sàng! Không cần phải sửa file Swift thủ công nữa.\n');
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
};
