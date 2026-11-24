import { LayoutNode, WidgetSinglePageConfig } from './types';
export type SnapshotSize = 'small' | 'medium' | 'large' | 'lockScreen' | 'dynamicIsland';
export type SnapshotTheme = 'light' | 'dark' | 'tinted';
export interface SnapshotVariant {
    key: string;
    size: SnapshotSize;
    theme: SnapshotTheme;
    direction: 'ltr' | 'rtl';
    width: number;
    height: number;
    structuralHash: string;
    svgHash: string;
    svg: string;
    nodeCount: number;
    semanticNodeCount: number;
    semanticSummary: string;
}
export interface WidgetSnapshot {
    version: '1.0';
    createdAt: number;
    variants: Record<string, SnapshotVariant>;
}
export interface SnapshotDiffResult {
    passed: boolean;
    addedVariants: string[];
    removedVariants: string[];
    changedVariants: Array<{
        key: string;
        structuralChanged: boolean;
        svgChanged: boolean;
        semanticChanged: boolean;
        details: string;
    }>;
}
/**
 * 🎨 Kết xuất cây IR sang vector SVG chuẩn xác để làm Deterministic Snapshot Testing (Light/Dark/Tinted).
 */
export declare function renderLayoutToSVG(layout: LayoutNode | WidgetSinglePageConfig, size?: SnapshotSize, theme?: SnapshotTheme, direction?: 'ltr' | 'rtl'): string;
/**
 * 📸 Tạo Widget Snapshot đa kích thước & đa giao diện (Light / Dark / Tinted / RTL).
 */
export declare function createWidgetSnapshot(layout: LayoutNode | WidgetSinglePageConfig, options?: {
    sizes?: SnapshotSize[];
    themes?: SnapshotTheme[];
    directions?: Array<'ltr' | 'rtl'>;
}): WidgetSnapshot;
/**
 * 🔬 So sánh 2 Widget Snapshots để phát hiện regression giao diện & ngữ nghĩa giữa các phiên bản.
 */
export declare function compareWidgetSnapshots(baseline: WidgetSnapshot, current: WidgetSnapshot): SnapshotDiffResult;
//# sourceMappingURL=snapshot.d.ts.map