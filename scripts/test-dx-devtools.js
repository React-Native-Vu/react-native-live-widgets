#!/usr/bin/env node

/**
 * 🧪 Test Suite for Nhóm D – Developer Experience & Debugging (P1):
 * 1. Diagnostics Engine (schema errors, prop typos, platform limits, canvas fallback warnings, a11y audit)
 * 2. Native Renderer Profiler (IR compile timing, Bitmap RAM warnings, WidgetKit 40-reload budget)
 * 3. Widget Snapshot Testing (multi-size, Light/Dark/Tinted/RTL, structural & SVG regression diff)
 * 4. Visual Widget Inspector (self-contained 3-pane HTML DevTools export)
 */

const assert = require('assert');
const { UI } = require('../lib/builder');
const { diagnoseLayout, formatDiagnosticsReport } = require('../lib/diagnostics');
const {
  profileIRCompile,
  recordReloadEvent,
  buildProfilerReport,
  formatProfilerReport,
} = require('../lib/profiler');
const { createWidgetSnapshot, compareWidgetSnapshots } = require('../lib/snapshot');
const { exportInspectorHTML } = require('../lib/inspector');

console.log('🧪 [Test Suite] Running Developer Experience & Debugging (Group D) Test Suite...');

// ── Test 1: Diagnostics Engine catches schema, typos, fallback & runtime errors ─
console.log('   ✓ Test 1: Verifying Diagnostics Engine catches typos, missing actions & Canvas fallbacks...');
const buggyLayout = UI.VStack(
  { padding: 12, backgroudColor: '#000', blurRadius: 8 },
  UI.Text('Header', { typography: 'headline' }),
  UI.Button({ title: 'Broken Button' }), // missing actionId
  UI.Gauge({ value: 0.8, label: 'CPU' }) // triggers canvas fallback info
);
const diagReport = diagnoseLayout(buggyLayout, { deadLetterCount: 2 });
assert.strictEqual(diagReport.passed, true, 'Warnings/info alone should not fail schema pass');
assert(diagReport.issues.some((i) => i.code === 'PROP_TYPO'), 'Must detect backgroudColor typo');
assert(diagReport.issues.some((i) => i.code === 'PROP_PLATFORM_LIMITED'), 'Must flag blurRadius platform limit');
assert(diagReport.issues.some((i) => i.code === 'BUTTON_NO_ACTION'), 'Must warn Button without actionId');
assert(diagReport.issues.some((i) => i.code === 'RENDERER_CANVAS_FALLBACK'), 'Must report Canvas fallback');
assert(diagReport.issues.some((i) => i.code === 'ACTION_QUEUE_DEAD_LETTER'), 'Must report dead-letter actions');
const diagText = formatDiagnosticsReport(diagReport);
assert(diagText.includes('Widget Diagnostics Report'));

// ── Test 2: Diagnostics Engine catches critical schema errors ────────────────
console.log('   ✓ Test 2: Verifying Diagnostics Engine fails on invalid Timer schema...');
const invalidTimerLayout = { type: 'VStack', children: [{ type: 'Timer', props: {} }] };
const invalidReport = diagnoseLayout(invalidTimerLayout);
assert.strictEqual(invalidReport.passed, false, 'Missing Timer targetDate must fail diagnostics');
assert(invalidReport.issues.some((i) => i.code === 'TIMER_MISSING_TARGET'));

// ── Test 3: Native Renderer Profiler & Reload Budget Warning ─────────────────
console.log('   ✓ Test 3: Verifying Native Renderer Profiler, Bitmap RAM & Reload Budget...');
const cleanLayout = UI.VStack(
  { padding: 16, backgroundColor: '#0F172A' },
  UI.Text('KPI Dashboard', { typography: 'title2', accessibilityFocusOrder: 1 }),
  UI.Progress({ value: 0.75, accessibilityLabel: 'Sales target' }),
  UI.Button({ title: 'Refresh', actionId: 'REFRESH_KPI' })
);
const irPerf = profileIRCompile(cleanLayout);
assert(irPerf.durationMs > 0);
assert(irPerf.nodeCount >= 3);

for (let i = 0; i < 42; i++) recordReloadEvent();
const profReport = buildProfilerReport('main', {
  bitmapWidthPx: 1200,
  bitmapHeightPx: 1000,
  bitmapMemoryMB: 4.58,
  renderDurationMs: 18.4,
  semanticNodeCount: 4,
  hitZoneCount: 1,
  remoteViewsActionCount: 7,
});
assert.strictEqual(profReport.reloadBudgetWarning, true, '42 reloads must trigger WidgetKit 40/day warning');
assert(profReport.warnings.some((w) => w.includes('4MB')), '4.58MB bitmap must trigger memory warning');
const profText = formatProfilerReport(profReport);
assert(profText.includes('Native Renderer Profiler Report'));

// ── Test 4: Widget Snapshot Testing (Multi-size + Light/Dark/Tinted + Diff) ──
console.log('   ✓ Test 4: Verifying Widget Snapshot Testing & Regression Diff detection...');
const snapV1 = createWidgetSnapshot(cleanLayout, {
  sizes: ['small', 'medium'],
  themes: ['light', 'dark', 'tinted'],
});
assert.strictEqual(Object.keys(snapV1.variants).length, 6, '2 sizes × 3 themes = 6 variants');
assert(snapV1.variants['medium:dark:ltr'].svg.includes('<svg'));

const sameDiff = compareWidgetSnapshots(snapV1, snapV1);
assert.strictEqual(sameDiff.passed, true, 'Identical snapshots must pass diff');

const modifiedLayout = UI.VStack(
  { padding: 16, backgroundColor: '#0F172A' },
  UI.Text('KPI Dashboard v2', { typography: 'title2', accessibilityFocusOrder: 1 }),
  UI.Progress({ value: 0.75, accessibilityLabel: 'Sales target' }),
  UI.Button({ title: 'Refresh', actionId: 'REFRESH_KPI' })
);
const snapV2 = createWidgetSnapshot(modifiedLayout, {
  sizes: ['small', 'medium'],
  themes: ['light', 'dark', 'tinted'],
});
const changedDiff = compareWidgetSnapshots(snapV1, snapV2);
assert.strictEqual(changedDiff.passed, false, 'Changed title must be detected by snapshot diff');
assert.strictEqual(changedDiff.changedVariants.length, 6);

// ── Test 5: Visual Widget Inspector HTML Export ──────────────────────────────
console.log('   ✓ Test 5: Verifying Visual Widget Inspector HTML DevTools export...');
const html = exportInspectorHTML(cleanLayout, { size: 'medium', theme: 'dark' });
assert(html.includes('<!DOCTYPE html>'));
assert(html.includes('Visual Widget Inspector'));
assert(html.includes('1. UI Tree'));
assert(html.includes('2. Visual Snapshots'));
assert(html.includes('3. Semantic Focus Tree'));

console.log('\n🎉 [DX & DevTools Test] All 5 test suites passed with 100% assertions satisfied!\n');
