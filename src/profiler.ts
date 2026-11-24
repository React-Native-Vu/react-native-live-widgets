import { compileToIR } from './ir';
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

const reloadTimestamps: number[] = [];
const stateSyncSamples: number[] = [];
let lastIRCompileMs = 0;

export function recordReloadEvent(): void {
  const now = Date.now();
  reloadTimestamps.push(now);
  const cutoff = now - 24 * 60 * 60 * 1000;
  while (reloadTimestamps.length > 0 && reloadTimestamps[0] < cutoff) {
    reloadTimestamps.shift();
  }
}

export function recordStateSyncDuration(durationMs: number): void {
  stateSyncSamples.push(durationMs);
  if (stateSyncSamples.length > 50) {
    stateSyncSamples.shift();
  }
}

/**
 * ⏱️ Biên dịch UI IR kèm đo thời gian thực thi chính xác (ms).
 */
export function profileIRCompile(input: LayoutNode | WidgetSinglePageConfig): {
  durationMs: number;
  nodeCount: number;
  nativeRatio: number;
} {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ir = compileToIR(input);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.max(0.01, Number((t1 - t0).toFixed(3)));
  lastIRCompileMs = durationMs;

  const total = ir.renderPlan.nativeNodeCount + ir.renderPlan.canvasNodeCount;
  const nativeRatio = total > 0 ? Number(((ir.renderPlan.nativeNodeCount / total) * 100).toFixed(1)) : 100;
  return { durationMs, nodeCount: total, nativeRatio };
}

/**
 * 📊 Tổng hợp báo cáo Native Renderer Profiler (IR Compile, Bitmap RAM, RemoteViews Actions, Reload Budget 24h).
 */
export function buildProfilerReport(
  widgetKey = 'main',
  nativeRender?: NativeRenderProfile
): WidgetProfilerReport {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const recentReloads = reloadTimestamps.filter((ts) => ts >= cutoff).length;
  const avgSyncMs =
    stateSyncSamples.length > 0
      ? Number((stateSyncSamples.reduce((a, b) => a + b, 0) / stateSyncSamples.length).toFixed(2))
      : 0;

  const warnings: string[] = [];
  const reloadBudgetWarning = recentReloads > 40;
  if (reloadBudgetWarning) {
    warnings.push(
      `Số lần reload trong 24h (${recentReloads}) vượt ngưỡng an toàn 40 lần/ngày của iOS WidgetKit!`
    );
  }
  if (lastIRCompileMs > 10) {
    warnings.push(`Thời gian compile UI IR (${lastIRCompileMs}ms) vượt ngưỡng khuyến nghị 10ms.`);
  }
  if (nativeRender?.bitmapMemoryMB && nativeRender.bitmapMemoryMB > 4.0) {
    warnings.push(
      `Bộ nhớ Bitmap (${nativeRender.bitmapMemoryMB.toFixed(2)} MB) vượt 4MB — nguy cơ TransactionTooLargeException trên Android.`
    );
  }
  if (nativeRender?.remoteViewsActionCount && nativeRender.remoteViewsActionCount > 32) {
    warnings.push(
      `Số RemoteViews actions (${nativeRender.remoteViewsActionCount}) cao (>32), nên gom nhóm với accessibilityGroup="combine".`
    );
  }

  return {
    widgetKey,
    timestamp: now,
    irCompileDurationMs: lastIRCompileMs,
    stateSyncAvgDurationMs: avgSyncMs,
    reloadCount24h: recentReloads,
    reloadBudgetWarning,
    nativeRender,
    warnings,
  };
}

export function formatProfilerReport(report: WidgetProfilerReport): string {
  const lines: string[] = [];
  lines.push(`⚡ Native Renderer Profiler Report [${report.widgetKey}]`);
  lines.push(`   • UI IR Compile Time:     ${report.irCompileDurationMs} ms`);
  lines.push(`   • State Sync Avg Time:    ${report.stateSyncAvgDurationMs} ms`);
  lines.push(
    `   • Widget Reloads (24h):   ${report.reloadCount24h} / 40 ${report.reloadBudgetWarning ? '⚠️ BUDGET EXCEEDED' : '✅ OK'}`
  );
  if (report.nativeRender) {
    const n = report.nativeRender;
    lines.push(
      `   • Bitmap Dimensions:      ${n.bitmapWidthPx ?? 0} × ${n.bitmapHeightPx ?? 0} px (${(n.bitmapMemoryMB ?? 0).toFixed(2)} MB)`
    );
    lines.push(`   • Native Render Duration: ${n.renderDurationMs ?? 0} ms`);
    lines.push(
      `   • RemoteViews Actions:    ${n.remoteViewsActionCount ?? 0} (Semantic: ${n.semanticNodeCount ?? 0}, HitZones: ${n.hitZoneCount ?? 0})`
    );
  }
  if (report.warnings.length > 0) {
    lines.push('   ⚠️ Warnings:');
    report.warnings.forEach((w) => lines.push(`      - ${w}`));
  }
  return lines.join('\n');
}
