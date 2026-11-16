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
const path = require('path');

// Run tests against the compiled lib/
const { compileToIR, inspectIR } = require('../lib/ir');
const { UI } = require('../lib/builder');

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

console.log('\n🎉 [Test Suite] All 6 test suites passed with 100% assertions satisfied!\n');
