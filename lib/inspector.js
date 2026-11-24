"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportInspectorHTML = exportInspectorHTML;
const ir_1 = require("./ir");
const diagnostics_1 = require("./diagnostics");
const snapshot_1 = require("./snapshot");
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
/**
 * 🔬 Visual Widget Inspector (Self-contained HTML DevTools UI).
 * Biến Widget.inspectIR() từ log văn bản thành giao diện DevTools trực quan 3 cột:
 * 1. UI Tree & Render Strategy (Native vs Canvas)
 * 2. Live SVG Preview (Light/Dark/Tinted + Bounds/Semantic Focus Badges)
 * 3. Semantic Tree, State Bindings & Diagnostics Audit
 */
function exportInspectorHTML(layout, options) {
    const size = options?.size || 'medium';
    const theme = options?.theme || 'dark';
    const dir = options?.rtl ? 'rtl' : 'ltr';
    const ir = (0, ir_1.compileToIR)(layout, { rtl: options?.rtl });
    const diag = (0, diagnostics_1.diagnoseLayout)(layout);
    const a11yAscii = (0, ir_1.inspectAccessibilityTree)(layout, { rtl: options?.rtl });
    const svgDark = (0, snapshot_1.renderLayoutToSVG)(layout, size, 'dark', dir);
    const svgLight = (0, snapshot_1.renderLayoutToSVG)(layout, size, 'light', dir);
    const svgTinted = (0, snapshot_1.renderLayoutToSVG)(layout, size, 'tinted', dir);
    const renderRows = Object.values(ir.renderPlan.nodes)
        .map((n) => {
        const badgeColor = n.target === 'native_remote_view'
            ? '#10B981'
            : n.target === 'canvas_bitmap'
                ? '#F59E0B'
                : '#A855F7';
        return `<div class="node-row"><span class="badge" style="background:${badgeColor}">${n.target}</span> <strong>&lt;${n.type}&gt;</strong> <span class="muted">${escapeHtml(n.reason)}</span></div>`;
    })
        .join('');
    const diagRows = diag.issues.length === 0
        ? '<div class="ok">✅ Không phát hiện lỗi Schema, Props hay Accessibility!</div>'
        : diag.issues
            .map((i) => `<div class="diag-${i.severity}"><strong>[${i.code}]</strong> ${escapeHtml(i.message)}</div>`)
            .join('');
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>React Native Live Widgets — Visual Inspector</title>
  <style>
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0B1120; color:#E2E8F0; }
    header { padding:16px 24px; background:#0F172A; border-bottom:1px solid #1E293B; display:flex; justify-content:space-between; align-items:center; }
    .grid { display:grid; grid-template-columns: 1fr 1.1fr 1fr; gap:16px; padding:16px; }
    .panel { background:#0F172A; border:1px solid #1E293B; border-radius:12px; padding:16px; overflow:auto; max-height:82vh; }
    h2 { margin-top:0; font-size:14px; text-transform:uppercase; letter-spacing:0.06em; color:#38BDF8; }
    .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; color:#0B1120; margin-right:6px; }
    .node-row { padding:6px 0; border-bottom:1px solid #1E293B; font-size:12px; }
    .muted { color:#94A3B8; }
    pre { background:#020617; padding:12px; border-radius:8px; font-size:11px; overflow:auto; color:#A5F3FC; }
    .preview-stack { display:flex; flex-direction:column; gap:14px; align-items:center; }
    .diag-error { color:#F87171; padding:6px 0; font-size:12px; }
    .diag-warning { color:#FBBF24; padding:6px 0; font-size:12px; }
    .diag-info { color:#38BDF8; padding:6px 0; font-size:12px; }
    .ok { color:#34D399; font-size:12px; font-weight:600; }
  </style>
</head>
<body>
  <header>
    <div><strong>🔬 React Native Live Widgets — Visual Widget Inspector</strong></div>
    <div class="muted">Strategy: ${ir.renderPlan.overallStrategy} • Native: ${ir.renderPlan.nativeNodeCount} • Canvas: ${ir.renderPlan.canvasNodeCount} • Semantic Nodes: ${ir.semanticTree.length}</div>
  </header>
  <div class="grid">
    <div class="panel">
      <h2>1. UI Tree &amp; Render Strategy</h2>
      ${renderRows}
    </div>
    <div class="panel">
      <h2>2. Visual Snapshots (Dark / Light / Tinted)</h2>
      <div class="preview-stack">
        <div><div class="muted" style="margin-bottom:4px;font-size:11px">DARK (${size})</div>${svgDark}</div>
        <div><div class="muted" style="margin-bottom:4px;font-size:11px">LIGHT (${size})</div>${svgLight}</div>
        <div><div class="muted" style="margin-bottom:4px;font-size:11px">TINTED iOS 18 (${size})</div>${svgTinted}</div>
      </div>
    </div>
    <div class="panel">
      <h2>3. Semantic Focus Tree &amp; Diagnostics</h2>
      <pre>${escapeHtml(a11yAscii)}</pre>
      <h2 style="margin-top:16px">Diagnostics (${diag.errorCount}E / ${diag.warningCount}W)</h2>
      ${diagRows}
    </div>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=inspector.js.map