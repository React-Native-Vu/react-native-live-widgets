import { LayoutNode, WidgetSinglePageConfig } from './types';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export type DiagnosticCategory = 'schema' | 'unsupported_prop' | 'renderer_fallback' | 'accessibility' | 'sync' | 'action_queue';
export interface DiagnosticIssue {
    code: string;
    severity: DiagnosticSeverity;
    category: DiagnosticCategory;
    nodeId?: string;
    path?: string;
    message: string;
    suggestion?: string;
}
export interface DiagnosticsReport {
    timestamp: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    passed: boolean;
    issues: DiagnosticIssue[];
}
/**
 * 🩺 Phân tích tĩnh & chẩn đoán toàn diện cây UI Widget (Schema, Unsupported Props,
 * Renderer Fallback Warnings, Accessibility Audit).
 */
export declare function diagnoseLayout(input: LayoutNode | WidgetSinglePageConfig, runtimeContext?: {
    syncTelemetry?: {
        state?: string;
        sourceErrors?: Record<string, string>;
        isOffline?: boolean;
    };
    deadLetterCount?: number;
}): DiagnosticsReport;
export declare function formatDiagnosticsReport(report: DiagnosticsReport): string;
//# sourceMappingURL=diagnostics.d.ts.map