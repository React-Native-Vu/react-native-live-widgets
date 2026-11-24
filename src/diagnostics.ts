import { compileToIR } from './ir';
import { LayoutNode, WidgetSinglePageConfig } from './types';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticCategory =
  | 'schema'
  | 'unsupported_prop'
  | 'renderer_fallback'
  | 'accessibility'
  | 'sync'
  | 'action_queue';

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

const VALID_NODE_TYPES = new Set([
  'VStack',
  'HStack',
  'ZStack',
  'Grid',
  'Text',
  'Image',
  'Button',
  'Toggle',
  'Progress',
  'Gauge',
  'Timer',
  'Badge',
  'Spacer',
  'Divider',
  'Equalizer',
  'Sparkline',
  'Chart',
  'Link',
]);

const KNOWN_TYPO_PROPS: Record<string, string> = {
  backgroudColor: 'backgroundColor',
  bgColor: 'backgroundColor',
  pading: 'padding',
  fontWeigth: 'fontWeight',
  borderRadios: 'borderRadius',
  aligment: 'alignment',
  acessibilityLabel: 'accessibilityLabel',
  actionID: 'actionId',
};

const ANDROID_LIMITED_PROPS = new Set(['blurRadius', 'backdropFilter', 'shadowRadius']);

function validateNodeTree(node: any, path: string, issues: DiagnosticIssue[]): void {
  if (!node || typeof node !== 'object') {
    issues.push({
      code: 'SCHEMA_INVALID_NODE',
      severity: 'error',
      category: 'schema',
      path,
      message: `Node tại "${path}" không hợp lệ (null hoặc không phải object).`,
    });
    return;
  }

  const type = node.type;
  if (!type || typeof type !== 'string') {
    issues.push({
      code: 'SCHEMA_MISSING_TYPE',
      severity: 'error',
      category: 'schema',
      nodeId: node.id,
      path,
      message: `Node tại "${path}" thiếu thuộc tính "type".`,
    });
  } else if (!VALID_NODE_TYPES.has(type)) {
    issues.push({
      code: 'SCHEMA_UNKNOWN_TYPE',
      severity: 'warning',
      category: 'schema',
      nodeId: node.id,
      path,
      message: `Loại node "${type}" tại "${path}" không nằm trong danh sách chuẩn của UI DSL.`,
      suggestion: 'Kiểm tra lại chính tả (VStack, HStack, Text, Button, Progress, Gauge, Timer, ...).',
    });
  }

  const props = node.props || {};

  // Kiểm tra lỗi chính tả prop phổ biến & prop hạn chế trên Android RemoteViews
  for (const propKey of Object.keys(props)) {
    if (KNOWN_TYPO_PROPS[propKey]) {
      issues.push({
        code: 'PROP_TYPO',
        severity: 'warning',
        category: 'unsupported_prop',
        nodeId: node.id,
        path,
        message: `Thuộc tính "${propKey}" trên <${type}> có thể bị gõ nhầm.`,
        suggestion: `Bạn có định dùng "${KNOWN_TYPO_PROPS[propKey]}" không?`,
      });
    }
    if (ANDROID_LIMITED_PROPS.has(propKey)) {
      issues.push({
        code: 'PROP_PLATFORM_LIMITED',
        severity: 'info',
        category: 'unsupported_prop',
        nodeId: node.id,
        path,
        message: `Thuộc tính "${propKey}" trên <${type}> chỉ hỗ trợ đầy đủ trên iOS SwiftUI; Android RemoteViews sẽ dùng fallback.`,
      });
    }
  }

  // Kiểm tra schema bắt buộc theo từng loại component
  if (type === 'Button' && !props.actionId && !props.deepLink) {
    issues.push({
      code: 'BUTTON_NO_ACTION',
      severity: 'warning',
      category: 'schema',
      nodeId: node.id,
      path,
      message: `<Button title="${props.title || ''}"> không có actionId hoặc deepLink — chạm vào sẽ không thực thi gì.`,
      suggestion: 'Bổ sung prop actionId (ví dụ actionId="CHECK_IN") hoặc deepLink.',
    });
  }

  if (type === 'Timer' && !props.targetDate && !props.targetTimestamp && !props.seconds) {
    issues.push({
      code: 'TIMER_MISSING_TARGET',
      severity: 'error',
      category: 'schema',
      nodeId: node.id,
      path,
      message: `<Timer> thiếu mốc thời gian (targetDate / targetTimestamp / seconds).`,
    });
  }

  if ((type === 'Button' || type === 'Toggle') && props.accessible !== false) {
    const hasLabel = Boolean(props.accessibilityLabel || props.title || props.label);
    if (!hasLabel) {
      issues.push({
        code: 'A11Y_MISSING_LABEL',
        severity: 'warning',
        category: 'accessibility',
        nodeId: node.id,
        path,
        message: `Phần tử tương tác <${type}> thiếu nhãn trợ năng (accessibilityLabel / title / label).`,
        suggestion: 'Thêm accessibilityLabel để TalkBack và VoiceOver phát âm rõ chức năng của nút.',
      });
    }
  }

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      issues.push({
        code: 'SCHEMA_INVALID_CHILDREN',
        severity: 'error',
        category: 'schema',
        nodeId: node.id,
        path,
        message: `Thuộc tính "children" của <${type}> phải là mảng (Array).`,
      });
    } else {
      node.children.forEach((child: any, idx: number) => {
        validateNodeTree(child, `${path}.${idx}`, issues);
      });
    }
  }
}

/**
 * 🩺 Phân tích tĩnh & chẩn đoán toàn diện cây UI Widget (Schema, Unsupported Props,
 * Renderer Fallback Warnings, Accessibility Audit).
 */
export function diagnoseLayout(
  input: LayoutNode | WidgetSinglePageConfig,
  runtimeContext?: {
    syncTelemetry?: { state?: string; sourceErrors?: Record<string, string>; isOffline?: boolean };
    deadLetterCount?: number;
  }
): DiagnosticsReport {
  const issues: DiagnosticIssue[] = [];
  const ir = compileToIR(input);

  // 1. Schema, Unsupported Props & Accessibility Audit
  validateNodeTree(ir.root, '0', issues);

  // 2. Renderer Fallback Warnings từ IR Render Plan
  for (const [nodeId, plan] of Object.entries(ir.renderPlan.nodes)) {
    if (plan.requiresCanvas) {
      issues.push({
        code: 'RENDERER_CANVAS_FALLBACK',
        severity: 'info',
        category: 'renderer_fallback',
        nodeId,
        message: `<${plan.type}> (${nodeId}) sử dụng Canvas 2D Fallback: ${plan.reason}`,
      });
    }
  }

  // 3. Runtime Sync & Action Queue Diagnostics (nếu được truyền vào)
  if (runtimeContext?.syncTelemetry?.state === 'error') {
    issues.push({
      code: 'SYNC_ENGINE_ERROR',
      severity: 'error',
      category: 'sync',
      message: 'Background Data Engine đang ở trạng thái lỗi đồng bộ.',
      suggestion: 'Kiểm tra kết nối mạng, authRefresh hoặc gọi Widget.getSyncStatus() để xem chi tiết.',
    });
  }
  if (runtimeContext?.deadLetterCount && runtimeContext.deadLetterCount > 0) {
    issues.push({
      code: 'ACTION_QUEUE_DEAD_LETTER',
      severity: 'warning',
      category: 'action_queue',
      message: `Có ${runtimeContext.deadLetterCount} hành động bị chuyển vào Dead-Letter Queue sau khi vượt quá số lần retry.`,
      suggestion: 'Kiểm tra Widget.getPendingActions({ status: "dead_letter" }) để xử lý hoặc xóa.',
    });
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    timestamp: Date.now(),
    errorCount,
    warningCount,
    infoCount,
    passed: errorCount === 0,
    issues,
  };
}

export function formatDiagnosticsReport(report: DiagnosticsReport): string {
  const lines: string[] = [];
  const badge = report.passed ? '✅ PASSED' : '❌ FAILED';
  lines.push(`🩺 Widget Diagnostics Report [${badge}]`);
  lines.push(`   Errors: ${report.errorCount} | Warnings: ${report.warningCount} | Info: ${report.infoCount}`);
  lines.push('────────────────────────────────────────────────────────');
  for (const issue of report.issues) {
    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`${icon} [${issue.code}] (${issue.category}) ${issue.message}`);
    if (issue.suggestion) {
      lines.push(`   ↳ Gợi ý: ${issue.suggestion}`);
    }
  }
  return lines.join('\n');
}
