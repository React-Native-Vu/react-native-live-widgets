#!/usr/bin/env node

/**
 * 🧪 Test Suite for UI Intermediate Representation (IR) & Semantic Tree (Phase 2 & Phase 6)
 * Verifies:
 * 1. AST compilation & unique ID indexing.
 * 2. Semantic Tree generation & TalkBack synthesis.
 * 3. Decorative node suppression.
 * 4. Renderer Planner target classification (Native-first, Canvas-when-needed).
 * 5. State Bindings identification (Two-Way Sync).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Run tests against the compiled lib/
const { compileToIR, inspectIR } = require('../lib/ir');
const {
  UI,
  createDataBinding,
  flattenDataObject,
  resolveTemplateString,
} = require('../lib/builder');
const { actionHandlers } = require('../lib/dispatcher');

console.log('🧪 [Test Suite] Running UI IR & Semantic Tree Test Suite...');

// ── Test 1: Full Architecture Compilation ────────────────────────────────────
console.log('   ✓ Test 1: Compiling complex layout into IR v2.0...');
const complexLayout = UI.VStack(
  { padding: 16, backgroundColor: '#0F172A' },
  UI.Text('BẢNG ĐIỀU KHIỂN CHẤM CÔNG', { typography: 'title2' }),
  UI.Progress({ value: 0.86, accessibilityLabel: 'Tiến độ hoàn thành ca' }),
  UI.Button({ title: 'Xác nhận vào ca', actionId: 'toggle:attendance_shift' }),
  UI.Gauge({ value: 0.95, label: 'KPI' }),
  UI.Image('sparkles', { accessible: false }) // Decorative image
);

const ir = compileToIR(complexLayout);

assert.strictEqual(ir.version, '2.0', 'IR version must be 2.0');
assert(ir.timestamp > 0, 'IR must include a timestamp');
assert(Array.isArray(ir.semanticTree), 'Semantic tree must be an array');
assert(typeof ir.semanticSummary === 'string', 'Semantic summary must be a string');
console.log('     -> Generated IR with', ir.semanticTree.length, 'semantic nodes.');

// ── Test 2: Decorative Elements Suppression ──────────────────────────────────
console.log('   ✓ Test 2: Verifying decorative elements are excluded from TalkBack summary...');
const hasDecorativeInTree = ir.semanticTree.some((n) => n.isDecorative === true);
assert.strictEqual(hasDecorativeInTree, false, 'Decorative elements must not be in active semantic tree');
assert(!ir.semanticSummary.includes('sparkles'), 'Decorative image sparkles must not appear in spoken summary');

// ── Test 3: Renderer Planner Target Classification ───────────────────────────
console.log('   ✓ Test 3: Verifying Renderer Planner (Native-first vs Canvas-when-needed)...');
const plan = ir.renderPlan;
assert.strictEqual(plan.overallStrategy, 'native_first_hybrid', 'Strategy should be native_first_hybrid');
assert(plan.nativeNodeCount >= 3, 'Should identify at least 3 native RemoteViews nodes (Text, Progress, Button)');
assert(plan.canvasNodeCount >= 1, 'Should identify at least 1 canvas node (Gauge)');

// Check specific nodes in the plan
const nodes = Object.values(plan.nodes);
const textPlan = nodes.find((n) => n.type === 'Text');
assert.strictEqual(textPlan.target, 'native_remote_view', 'Text must be native_remote_view');

const buttonPlan = nodes.find((n) => n.type === 'Button');
assert.strictEqual(buttonPlan.target, 'native_remote_view', 'Button must be native_remote_view');

const gaugePlan = nodes.find((n) => n.type === 'Gauge');
assert.strictEqual(gaugePlan.target, 'canvas_bitmap', 'Gauge must be canvas_bitmap');

// ── Test 4: State Bindings Identification ────────────────────────────────────
console.log('   ✓ Test 4: Verifying Two-Way State Bindings extraction...');
assert(ir.stateBindings.length >= 1, 'Should extract state bindings for interactive buttons');
const toggleBinding = ir.stateBindings.find((b) => b.actionId === 'toggle:attendance_shift');
assert(toggleBinding, 'Should find toggle:attendance_shift binding');
assert.strictEqual(toggleBinding.bindingType, 'toggle', 'Binding type must be toggle');
assert.strictEqual(toggleBinding.targetKey, 'attendance_shift', 'Target key must match');

// ── Test 5: Speech Synthesizer Output ────────────────────────────────────────
console.log('   ✓ Test 5: Verifying synthesized speech summary...');
assert(ir.semanticSummary.includes('BẢNG ĐIỀU KHIỂN CHẤM CÔNG'), 'Summary must contain heading');
assert(ir.semanticSummary.includes('86%'), 'Summary must contain progress percentage');
assert(ir.semanticSummary.includes('Xác nhận vào ca'), 'Summary must contain button title');
assert(ir.semanticSummary.includes('KPI'), 'Summary must contain gauge label');

// ── Test 6: inspectIR utility output ─────────────────────────────────────────
console.log('   ✓ Test 6: Verifying inspectIR() ASCII formatting...');
const inspectOutput = inspectIR(complexLayout);
assert(inspectOutput.includes('[NATIVE]'), 'inspectIR must output [NATIVE] tags');
assert(inspectOutput.includes('[CANVAS]'), 'inspectIR must output [CANVAS] tags');
assert(inspectOutput.includes('🌲 Widget IR v2.0'), 'inspectIR must output header');

// ── Test 7: Extended Families (extraLarge, standBy) & widgetAccentable ────────
console.log('   ✓ Test 7: Verifying widgetAccentable & extended family layout nodes...');
const standByLayout = UI.VStack(
  { padding: 12, backgroundColor: '#000000' },
  UI.Text('08:30', { fontSize: 32, widgetAccentable: true }),
  UI.Progress({ value: 0.72, widgetAccentable: true }),
  UI.Gauge({ value: 0.9, label: 'Focus', widgetAccentable: true })
);
const extraLargeLayout = UI.VStack(
  { padding: 20, backgroundColor: '#0F172A' },
  UI.Text('Bảng tổng hợp iPadOS Extra Large', { typography: 'title1' }),
  standByLayout
);
const extendedConfig = {
  small: UI.VStack(UI.Text('Small')),
  extraLarge: extraLargeLayout,
  standBy: standByLayout,
};
assert(extendedConfig.extraLarge.type === 'VStack', 'extraLarge layout must be valid');
assert(extendedConfig.standBy.type === 'VStack', 'standBy layout must be valid');
assert.strictEqual(standByLayout.children[0].props.widgetAccentable, true, 'Text must preserve widgetAccentable');
assert.strictEqual(standByLayout.children[1].props.widgetAccentable, true, 'Progress must preserve widgetAccentable');
assert.strictEqual(standByLayout.children[2].props.widgetAccentable, true, 'Gauge must preserve widgetAccentable');

const standByIR = compileToIR(standByLayout);
assert(standByIR.semanticSummary.includes('08:30'), 'standBy IR summary must include text');

// ── Test 8: ControlWidget DSL Helpers & Export Declarations ──────────────────
console.log('   ✓ Test 8: Verifying UI.ControlButton, UI.ControlToggle & exported types...');
let controlCallbackTriggered = false;
const ctrlBtn = UI.ControlButton({
  title: 'Check-in nhanh',
  systemName: 'bolt.fill',
  actionId: 'quick_checkin',
  onPress: () => {
    controlCallbackTriggered = true;
  },
});
assert.strictEqual(ctrlBtn.type, 'button', 'ControlButton type must be button');
assert.strictEqual(ctrlBtn.actionId, 'quick_checkin', 'ControlButton must keep explicit actionId');
assert.strictEqual('onPress' in ctrlBtn, false, 'Serialized ControlWidgetConfig must strip onPress function');
assert(actionHandlers.has('quick_checkin'), 'ControlButton onPress must register in actionHandlers');
actionHandlers.get('quick_checkin')({ actionId: 'quick_checkin' });
assert.strictEqual(controlCallbackTriggered, true, 'Registered ControlButton handler must execute');

const ctrlToggle = UI.ControlToggle({
  title: 'Tạm nghỉ',
  checkedTitle: 'Đang làm việc',
  systemName: 'clock.badge.checkmark.fill',
  checked: true,
  actionId: 'shift_active',
});
assert.strictEqual(ctrlToggle.type, 'toggle', 'ControlToggle type must be toggle');
assert.strictEqual(ctrlToggle.actionId, 'toggle:shift_active', 'ControlToggle must ensure toggle: prefix');
assert.strictEqual(ctrlToggle.checked, true, 'ControlToggle must preserve checked flag');

const indexDts = fs.readFileSync(path.join(__dirname, '../lib/index.d.ts'), 'utf8');
const previewDts = fs.readFileSync(path.join(__dirname, '../lib/preview.d.ts'), 'utf8');
const typesDts = fs.readFileSync(path.join(__dirname, '../lib/types.d.ts'), 'utf8');
assert(indexDts.includes('export declare const ControlWidget'), 'lib/index.d.ts must export ControlWidget');
assert(previewDts.includes("'control'") && previewDts.includes('controlConfig?: ControlWidgetConfig'), 'lib/preview.d.ts must include control preview size and prop');
assert(typesDts.includes('extraLarge?: LayoutNode') && typesDts.includes('standBy?: LayoutNode'), 'lib/types.d.ts must include extraLarge and standBy');

// ── Test 9: Background Data Engine 2.0 & Structured Data Binding ──────────────
console.log('   ✓ Test 9: Verifying createDataBinding, flattenDataObject & pipe transforms...');
const data = createDataBinding({
  defaults: { user: { name: 'Khách' }, attendance: { progress: 0 } },
});

const boundLayout = UI.VStack(
  { padding: 14 },
  UI.Text(data.user.name),
  UI.Text(`${data.attendance.progress}%`),
  UI.Progress(data.attendance.progress.divide(100)),
  UI.Gauge(data.attendance.progress.divide(100), { label: 'KPI' }),
  UI.Text(UI.bind('salary', { currency: '₫' }))
);

assert.strictEqual(boundLayout.children[0].props.text, '{{user.name|default:Khách}}');
assert.strictEqual(boundLayout.children[1].props.text, '{{attendance.progress|default:0}}%');
assert.strictEqual(boundLayout.children[2].props.value, '{{attendance.progress|default:0|divide:100}}');
assert.strictEqual(boundLayout.children[3].props.value, '{{attendance.progress|default:0|divide:100}}');
assert.strictEqual(boundLayout.children[4].props.text, '{{salary|currency:₫}}');

const plainData = createDataBinding();
assert.strictEqual(
  plainData.attendance.progress.divide(100).toToken(),
  '{{attendance.progress|divide:100}}'
);

const flatVars = flattenDataObject({
  user: { name: 'Vũ Trần' },
  attendance: { progress: 85, onTime: true },
  salary: 15000000,
  items: [{ title: 'OKR Q4' }],
});
assert.strictEqual(flatVars['user.name'], 'Vũ Trần');
assert.strictEqual(flatVars['attendance.progress'], '85');
assert.strictEqual(flatVars['attendance.onTime'], 'true');
assert.strictEqual(flatVars['items.0.title'], 'OKR Q4');

assert.strictEqual(resolveTemplateString('{{user.name|upper}}', flatVars), 'VŨ TRẦN');
assert.strictEqual(resolveTemplateString('{{user.role|default:Nhân viên}}', flatVars), 'Nhân viên');
assert.strictEqual(resolveTemplateString('{{attendance.progress|divide:100}}', flatVars), '0.85');
assert.strictEqual(resolveTemplateString('{{attendance.progress|divide:100|multiply:100|round:0}}', flatVars), '85');
assert.strictEqual(resolveTemplateString('{{attendance.progress|percent:0}}', flatVars), '85%');
assert.strictEqual(resolveTemplateString('{{attendance.onTime|if:Đúng giờ:Đi trễ}}', flatVars), 'Đúng giờ');
assert.strictEqual(resolveTemplateString('{{salary|currency:₫}}', flatVars), '15,000,000₫');
assert.strictEqual(
  resolveTemplateString('{{wrapped|divide:100}}', { wrapped: '{{92}}' }),
  '0.92',
  'Stale {{...}} wrapped values must unwrap cleanly before pipe math'
);

assert(
  typesDts.includes('cacheTtlSeconds?: number') &&
    typesDts.includes('enableETag?: boolean') &&
    typesDts.includes('authRefresh?: WidgetAuthRefreshConfig'),
  'lib/types.d.ts must include Background Data Engine 2.0 fields'
);

// ── Test 10: Widget Codegen Swift Generator ──────────────────────────────────
console.log('   ✓ Test 10: Verifying TypeScript-driven Swift Codegen (generateSwiftSource)...');
const { generateSwiftSource } = require('../cli/codegen');
const testConfig = {
  bundleName: 'TestLiveWidgetsBundle',
  liveActivity: true,
  controlWidgets: true,
  widgets: [
    {
      key: 'main',
      kind: 'DynamicHomeScreenWidget',
      displayName: 'Tiện ích chính',
      description: 'Mô tả tiện ích chính',
    },
    {
      key: 'counter',
      displayName: 'Bộ đếm',
      supportedFamilies: ['systemSmall', 'systemMedium'],
      standbyMargins: true,
    },
  ],
};

const swiftCode = generateSwiftSource(testConfig);
assert(swiftCode.includes('struct TestLiveWidgetsBundle: WidgetBundle'));
assert(swiftCode.includes('DynamicLiveActivityWidget()'));
assert(swiftCode.includes('DynamicHomeScreenWidget()'));
assert(swiftCode.includes('CounterHomeScreenWidget()'));
assert(swiftCode.includes('DynamicControlWidget()'));
assert(swiftCode.includes('struct DynamicHomeScreenWidget: Widget'));
assert(swiftCode.includes('struct CounterHomeScreenWidget: Widget'));
assert(swiftCode.includes('DynamicWidgetProvider(widgetKey: "counter")'));
assert(swiftCode.includes('.supportedFamilies([.systemSmall, .systemMedium])'));
assert(swiftCode.includes('.applyStandByMargins()'));

// ── Test 11: i18n Catalog & String Catalog Generator ─────────────────────────
console.log('   ✓ Test 11: Verifying i18n Catalog & LocalizedStringKey...');
const { buildI18nCatalog, flattenObject } = require('../cli/codegen');
const flatTest = flattenObject({
  widgets: {
    counter: { title: 'Bộ đếm', desc: 'Bấm nút để đếm' },
  },
});
assert.strictEqual(flatTest['widgets.counter.title'], 'Bộ đếm');
assert.strictEqual(flatTest['widgets.counter.desc'], 'Bấm nút để đếm');

const i18nTestConfig = {
  i18n: {
    defaultLocale: 'vi',
    translations: {
      vi: { 'widgets.counter.title': 'Bộ đếm (VI)' },
      en: { 'widgets.counter.title': 'Counter (EN)' },
    },
  },
  widgets: [
    {
      key: 'counter',
      displayName: 'widgets.counter.title',
      description: {
        vi: 'Mô tả tiếng Việt',
        en: 'English description',
      },
    },
  ],
};

const { catalog, defaultLocale } = buildI18nCatalog(process.cwd(), i18nTestConfig);
assert.strictEqual(catalog.vi['widgets.counter.title'], 'Bộ đếm (VI)');
assert.strictEqual(catalog.en['widgets.counter.title'], 'Counter (EN)');
assert.strictEqual(catalog.vi['widget.counter.desc'], 'Mô tả tiếng Việt');
assert.strictEqual(catalog.en['widget.counter.desc'], 'English description');

const i18nSwiftCode = generateSwiftSource(i18nTestConfig, catalog, defaultLocale);
assert(i18nSwiftCode.includes('.configurationDisplayName(LocalizedStringKey("widgets.counter.title"))'));
assert(i18nSwiftCode.includes('.description(LocalizedStringKey("widget.counter.desc"))'));

// ── Test 12: Android i18n strings.xml Resource Mapping ───────────────────────
console.log('   ✓ Test 12: Verifying Android i18n Resource Mapping (toAndroidStringName)...');
const { toAndroidStringName, ensureExtensionInfoPlist } = require('../cli/codegen');
assert.strictEqual(toAndroidStringName('widgets.counter.title'), 'widgets_counter_title');
assert.strictEqual(toAndroidStringName('widgets.shift-attendance.desc'), 'widgets_shift_attendance_desc');
assert.strictEqual(toAndroidStringName('123.kpi'), 'str_123_kpi');

// ── Test 13: Extension Info.plist Auto-generation ───────────────────────────
console.log('   ✓ Test 13: Verifying Extension Info.plist auto-generation (ensureExtensionInfoPlist)...');
const os = require('os');
const tmpTestDir = path.join(os.tmpdir(), 'live_widget_test_' + Date.now());
fs.mkdirSync(tmpTestDir, { recursive: true });
try {
  ensureExtensionInfoPlist(tmpTestDir);
  const generatedPlistPath = path.join(tmpTestDir, 'Info.plist');
  assert(fs.existsSync(generatedPlistPath), 'Info.plist should be generated');
  const plistContent = fs.readFileSync(generatedPlistPath, 'utf8');
  assert(plistContent.includes('com.apple.widgetkit-extension'));
  assert(plistContent.includes('RCTNewArchEnabled'));
} finally {
  fs.rmSync(tmpTestDir, { recursive: true, force: true });
}

console.log('\n🎉 [Test Suite] All 13 test suites passed with 100% assertions satisfied!\n');
