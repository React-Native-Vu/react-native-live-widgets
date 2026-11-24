import { SnapshotSize, SnapshotTheme } from './snapshot';
import { LayoutNode, WidgetSinglePageConfig } from './types';
/**
 * 🔬 Visual Widget Inspector (Self-contained HTML DevTools UI).
 * Biến Widget.inspectIR() từ log văn bản thành giao diện DevTools trực quan 3 cột:
 * 1. UI Tree & Render Strategy (Native vs Canvas)
 * 2. Live SVG Preview (Light/Dark/Tinted + Bounds/Semantic Focus Badges)
 * 3. Semantic Tree, State Bindings & Diagnostics Audit
 */
export declare function exportInspectorHTML(layout: LayoutNode | WidgetSinglePageConfig, options?: {
    size?: SnapshotSize;
    theme?: SnapshotTheme;
    rtl?: boolean;
}): string;
//# sourceMappingURL=inspector.d.ts.map