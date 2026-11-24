import { LayoutNode, WidgetSinglePageConfig } from './types';
export interface NativeRenderProfile {
    bitmapWidthPx?: number;
    bitmapHeightPx?: number;
    bitmapMemoryMB?: number;
    renderDurationMs?: number;
    remoteViewsActionCount?: number;
    semanticNodeCount?: number;
    hitZoneCount?: number;
    recordedAt?: number;
}
export interface WidgetProfilerReport {
    widgetKey: string;
    timestamp: number;
    irCompileDurationMs: number;
    stateSyncAvgDurationMs: number;
    reloadCount24h: number;
    reloadBudgetWarning: boolean;
    nativeRender?: NativeRenderProfile;
    warnings: string[];
}
export declare function recordReloadEvent(): void;
export declare function recordStateSyncDuration(durationMs: number): void;
/**
 * ⏱️ Biên dịch UI IR kèm đo thời gian thực thi chính xác (ms).
 */
export declare function profileIRCompile(input: LayoutNode | WidgetSinglePageConfig): {
    durationMs: number;
    nodeCount: number;
    nativeRatio: number;
};
/**
 * 📊 Tổng hợp báo cáo Native Renderer Profiler (IR Compile, Bitmap RAM, RemoteViews Actions, Reload Budget 24h).
 */
export declare function buildProfilerReport(widgetKey?: string, nativeRender?: NativeRenderProfile): WidgetProfilerReport;
export declare function formatProfilerReport(report: WidgetProfilerReport): string;
//# sourceMappingURL=profiler.d.ts.map