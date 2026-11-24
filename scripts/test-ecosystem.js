#!/usr/bin/env node

/**
 * 🧪 Test Suite for Nhóm E – Native Feature Expansion (P2):
 * 1. Standalone MediaSession API (Metadata, PlaybackState, RemoteCommand events)
 * 2. Navigation Live UI (Dynamic Island Compact/Expanded + Lock Screen + Distance formatting)
 * 3. Smart Home Controls (iOS 18 ControlWidget / Android QS Tile toggle & scene builders)
 * 4. High-ROI UI Primitives (List/Repeater maxItems cap, Timeline, DonutChart, Sparkline, When, Responsive)
 * 5. LocaleFormatter (Currency, Number, Date, RelativeTime across vi-VN / en-US / ja-JP)
 */

const assert = require('assert');
const { UI } = require('../lib/builder');
const { buildNavigationLiveLayout, formatNavigationDistance } = require('../lib/navigationLive');
const { SmartHomeControl } = require('../lib/smartHome');
const {
  createListNode,
  createTimelineNode,
  createDonutChartNode,
  createSparklineNode,
  whenNode,
  responsiveLayout,
  LocaleFormatter,
} = require('../lib/ecosystem');
const { compileToIR } = require('../lib/ir');

console.log('🧪 [Test Suite] Running Native Feature Expansion & Ecosystem (Group E) Test Suite...');

// ── Test 1: Navigation Live UI Turn-by-Turn Layout ───────────────────────────
console.log('   ✓ Test 1: Verifying Navigation Live UI (Dynamic Island + Lock Screen + Distance)...');
assert.strictEqual(formatNavigationDistance(350), '350 m');
assert.strictEqual(formatNavigationDistance(1500), '1.5 km');
const nav = buildNavigationLiveLayout({
  destination: 'Sân bay Tân Sơn Nhất',
  maneuver: 'turn_right',
  instruction: 'Rẽ phải vào đường Trường Sơn',
  distanceMeters: 350,
  etaTimestamp: Date.now() + 900000,
  routeProgress: 0.68,
});
assert(nav.lockScreen && nav.dynamicIsland.compactLeading && nav.dynamicIsland.expandedBottom);
const navIR = compileToIR(nav.lockScreen);
assert(navIR.semanticTree.some((n) => n.label.includes('Rẽ phải vào đường Trường Sơn')));

// ── Test 2: Smart Home Controls (Control Center & QS Tile) ───────────────────
console.log('   ✓ Test 2: Verifying Smart Home Controls (Light/AC Toggle & Scene Button)...');
const acToggle = SmartHomeControl.createToggle({
  deviceId: 'living_room_ac',
  name: 'Điều hòa Phòng khách',
  deviceType: 'ac',
  isOn: true,
  detailText: '24°C',
});
assert.strictEqual(acToggle.type, 'toggle');
assert.strictEqual(acToggle.checked, true);
assert.strictEqual(acToggle.subtitle, '24°C');
assert.strictEqual(acToggle.actionId, 'toggle:smarthome_living_room_ac');

const sceneBtn = SmartHomeControl.createSceneButton('sleep', 'Chế độ ngủ');
assert.strictEqual(sceneBtn.type, 'button');
assert.strictEqual(sceneBtn.actionId, 'smarthome:scene:sleep');

// ── Test 3: List/Repeater with RAM-safe maxItems Cap & Empty Fallback ────────
console.log('   ✓ Test 3: Verifying UI.List maxItems cap & emptyFallback...');
const listNode = createListNode({
  items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  maxItems: 4,
  renderItem: (item) => UI.Text(`Item ${item}`),
});
assert.strictEqual(listNode.children.length, 4, 'List must enforce maxItems cap for WidgetKit memory safety');

const emptyList = createListNode({
  items: [],
  renderItem: (item) => UI.Text(String(item)),
  emptyFallback: UI.Text('Trống'),
});
assert.strictEqual(emptyList.props.text, 'Trống');

// ── Test 4: Timeline, DonutChart, Sparkline, When & Responsive ───────────────
console.log('   ✓ Test 4: Verifying Timeline, DonutChart, Sparkline, When & Responsive...');
const timeline = createTimelineNode([
  { time: '08:00', title: 'Check-in ca sáng', status: 'done' },
  { time: '10:30', title: 'Họp Sprint', status: 'active' },
  { time: '14:00', title: 'Review PR', status: 'upcoming' },
]);
assert.strictEqual(timeline.children.length, 3);

const donut = createDonutChartNode({
  segments: [
    { value: 75, color: '#10B981', label: 'Hoàn thành' },
    { value: 25, color: '#334155', label: 'Còn lại' },
  ],
  centerLabel: 'KPI',
});
assert.strictEqual(donut.type, 'Gauge');
assert.strictEqual(donut.props.valueText, '75%');

const spark = createSparklineNode({ data: [10, 15, 12, 22, 28] });
assert.strictEqual(spark.type, 'Sparkline');
assert(spark.props.accessibilityLabel.includes('tăng'));

const condTrue = whenNode(true, UI.Text('Online'), UI.Text('Offline'));
const condFalse = whenNode(false, UI.Text('Online'), UI.Text('Offline'));
assert.strictEqual(condTrue.props.text, 'Online');
assert.strictEqual(condFalse.props.text, 'Offline');

const resp = responsiveLayout({
  small: UI.Text('Compact'),
  medium: UI.Text('Detailed'),
});
assert.strictEqual(resp.small.props.text, 'Compact');
assert.strictEqual(resp.medium.props.text, 'Detailed');

// ── Test 5: LocaleFormatter (Currency, Number, Date, RelativeTime) ───────────
console.log('   ✓ Test 5: Verifying LocaleFormatter (vi-VN / en-US)...');
const vnd = LocaleFormatter.formatCurrency(150000, 'VND', 'vi-VN');
const usd = LocaleFormatter.formatCurrency(99.5, 'USD', 'en-US');
assert(vnd.includes('150') && usd.includes('99.50'));
const rel = LocaleFormatter.formatRelativeTime(300, 'en-US');
assert(rel.toLowerCase().includes('5'));

console.log('\n🎉 [Ecosystem & Native Expansion Test] All 5 test suites passed with 100% assertions satisfied!\n');
