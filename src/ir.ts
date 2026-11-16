import {
  LayoutNode,
  WidgetSinglePageConfig,
  WidgetIR,
  SemanticNode,
  NodeRenderPlan,
  RenderPlanTarget,
  StateBinding,
  AccessibilityRole,
} from './types.js';

let nodeCounter = 0;

/**
 * 🌲 Trình biên dịch UI Intermediate Representation (IR).
 * Chuyển hóa cây DSL thành cấu trúc dữ liệu trung gian chuẩn gồm:
 * 1. Root LayoutNode (đã chuẩn hóa thuộc tính & định danh).
 * 2. Semantic Tree độc lập (Tách biệt hoàn toàn khỏi việc vẽ hình của Canvas).
 * 3. Render Plan (Renderer Planner phân loại Native RemoteViews vs Canvas Bitmap).
 * 4. State Bindings (Danh sách các liên kết tương tác & đồng bộ trạng thái).
 */
export function compileToIR(input: LayoutNode | WidgetSinglePageConfig): WidgetIR {
  nodeCounter = 0;
  const rootNode = resolveRootLayoutNode(input);

  // 1. Gán ID duy nhất và lập bản đồ cây
  const indexedRoot = assignNodeIds(rootNode, '0');

  // 2. Xây dựng Semantic Tree độc lập
  const semanticTree: SemanticNode[] = [];
  buildSemanticNodes(indexedRoot, '0', semanticTree);
  const semanticSummary = synthesizeSemanticSummary(semanticTree);

  // 3. Renderer Planner: Phân loại node theo khả năng native
  const planNodes: Record<string, NodeRenderPlan> = {};
  let nativeCount = 0;
  let canvasCount = 0;
  classifyRenderTargets(indexedRoot, planNodes, () => {
    nativeCount++;
  }, () => {
    canvasCount++;
  });

  // 4. Trích xuất State Bindings
  const stateBindings: StateBinding[] = [];
  extractBindings(indexedRoot, stateBindings);

  return {
    version: '2.0',
    timestamp: Date.now(),
    root: indexedRoot,
    semanticTree,
    semanticSummary,
    renderPlan: {
      overallStrategy: nativeCount >= canvasCount ? 'native_first_hybrid' : 'canvas_fallback',
      nativeNodeCount: nativeCount,
      canvasNodeCount: canvasCount,
      nodes: planNodes,
    },
    stateBindings,
  };
}

function resolveRootLayoutNode(input: LayoutNode | WidgetSinglePageConfig): LayoutNode {
  if ('type' in input) {
    return input;
  }
  return input.medium || input.large || input.small || { type: 'VStack', children: [] };
}

function assignNodeIds(node: any, path: string): LayoutNode {
  if (!node || typeof node !== 'object') return node;

  const cloned = { ...node };
  if (!cloned.id) {
    cloned.id = `node_${path}_${++nodeCounter}`;
  }

  if (Array.isArray(cloned.children)) {
    cloned.children = cloned.children.map((child: any, idx: number) =>
      assignNodeIds(child, `${path}.${idx}`)
    );
  }

  return cloned as LayoutNode;
}

function buildSemanticNodes(node: any, path: string, result: SemanticNode[]): void {
  if (!node || typeof node !== 'object') return;

  const props = node.props || {};
  const accessible = props.accessible !== false;
  const type = node.type;

  let role: AccessibilityRole = props.accessibilityRole || 'none';
  let label = props.accessibilityLabel || '';
  let hint = props.accessibilityHint;
  let value = props.accessibilityValue;
  let interactive = false;
  let actionId = props.actionId;
  let deepLink = props.deepLink;

  switch (type) {
    case 'Text': {
      if (role === 'none') {
        const typo = props.typography || '';
        role = typo.startsWith('title') || typo === 'largeTitle' || typo === 'headline'
          ? 'header'
          : 'text';
      }
      if (!label && props.text !== undefined) {
        label = String(props.text);
      }
      break;
    }

    case 'Button': {
      role = 'button';
      interactive = true;
      if (!label && props.title !== undefined) {
        label = String(props.title);
      }
      if (!hint) {
        hint = actionId ? `Kích hoạt hành động ${actionId}` : 'Chạm để thực hiện';
      }
      break;
    }

    case 'Progress': {
      role = 'progressbar';
      if (!label) label = 'Tiến độ';
      if (value === undefined && props.value !== undefined) {
        value = `${Math.round(props.value * 100)}%`;
      }
      break;
    }

    case 'Gauge': {
      role = 'progressbar';
      label = props.label || label || 'Chỉ số';
      if (value === undefined) {
        value = props.valueText || (props.value !== undefined ? `${Math.round(props.value * 100)}%` : undefined);
      }
      break;
    }

    case 'Timer': {
      role = 'timer';
      if (!label) label = 'Đồng hồ đếm';
      break;
    }

    case 'Toggle': {
      role = 'switch';
      interactive = true;
      if (!label && props.label) label = String(props.label);
      value = props.isChecked ? 'Đã chọn' : 'Chưa chọn';
      hint = 'Chạm để thay đổi trạng thái';
      break;
    }

    case 'Badge': {
      role = 'summary';
      if (!label && props.text) label = String(props.text);
      break;
    }

    case 'Image': {
      role = props.systemName || props.url ? 'image' : 'none';
      if (!label && props.systemName) {
        label = `Biểu tượng ${props.systemName}`;
      }
      break;
    }

    default:
      break;
  }

  if (accessible && (label || value || interactive)) {
    result.push({
      id: node.id || `semantic_${path}`,
      path,
      type,
      role,
      label: label.trim(),
      hint,
      value,
      interactive,
      actionId,
      deepLink,
      isDecorative: !accessible,
    });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child: any, idx: number) => {
      buildSemanticNodes(child, `${path}.${idx}`, result);
    });
  }
}

function synthesizeSemanticSummary(tree: SemanticNode[]): string {
  const parts: string[] = [];
  for (const node of tree) {
    if (node.isDecorative) continue;

    let phrase = '';
    if (node.role === 'header' || node.role === 'text') {
      phrase = node.label;
    } else if (node.role === 'button') {
      phrase = `Nút ${node.label}`;
      if (node.hint) phrase += ` (${node.hint})`;
    } else if (node.role === 'progressbar' || node.role === 'timer') {
      phrase = `${node.label} ${node.value ?? ''}`.trim();
    } else if (node.role === 'switch') {
      phrase = `${node.label}: ${node.value ?? ''}`.trim();
    } else if (node.label) {
      phrase = node.label;
    }

    if (phrase && !parts.includes(phrase)) {
      parts.push(phrase);
    }
  }

  return parts.join('. ');
}

/**
 * 🎯 Phân loại Render Target (Native RemoteViews vs Canvas Bitmap).
 * Áp dụng nguyên tắc "Native-first, Canvas-when-needed".
 */
function classifyRenderTargets(
  node: any,
  registry: Record<string, NodeRenderPlan>,
  onNative: () => void,
  onCanvas: () => void
): void {
  if (!node || typeof node !== 'object') return;

  const type = node.type;
  const props = node.props || {};
  const id = node.id || 'anonymous';

  let target: RenderPlanTarget = 'native_remote_view';
  let reason = '';
  let hasNative = true;
  let requiresCanvas = false;

  switch (type) {
    case 'Text':
      target = 'native_remote_view';
      reason = 'Ánh xạ trực tiếp sang native TextView với đầy đủ font scaling';
      hasNative = true;
      requiresCanvas = false;
      onNative();
      break;

    case 'Button':
      target = 'native_remote_view';
      reason = 'Ánh xạ trực tiếp sang native Button với PendingIntent';
      hasNative = true;
      requiresCanvas = false;
      onNative();
      break;

    case 'Progress':
      if (props.style === 'circular') {
        target = 'canvas_bitmap';
        reason = 'Vòng tròn tiến độ 360° đòi hỏi vẽ đường cong Canvas 2D';
        hasNative = false;
        requiresCanvas = true;
        onCanvas();
      } else {
        target = 'native_remote_view';
        reason = 'Thanh tiến độ ngang ánh xạ trực tiếp sang native ProgressBar';
        hasNative = true;
        requiresCanvas = false;
        onNative();
      }
      break;

    case 'Gauge':
      target = 'canvas_bitmap';
      reason = 'Đồng hồ cung tròn 240° đòi hỏi tính toán góc quét và bóng kim bằng Canvas';
      hasNative = false;
      requiresCanvas = true;
      onCanvas();
      break;

    case 'Equalizer':
      target = 'canvas_bitmap';
      reason = 'Dải sóng âm thanh nhiều cột đòi hỏi hoạt họa pha sóng Canvas';
      hasNative = false;
      requiresCanvas = true;
      onCanvas();
      break;

    case 'Divider':
      target = 'native_remote_view';
      reason = 'Đường phân cách ánh xạ trực tiếp sang native View với background/height';
      hasNative = true;
      requiresCanvas = false;
      onNative();
      break;

    case 'Image':
      target = 'native_remote_view';
      reason = 'Ảnh ánh xạ trực tiếp sang native ImageView';
      hasNative = true;
      requiresCanvas = false;
      onNative();
      break;

    case 'VStack':
    case 'HStack':
    case 'ZStack':
    case 'Grid': {
      const hasDashed = props.borderStyle === 'dashed' || props.borderStyle === 'dotted';
      const hasComplexGradient = props.gradient && props.gradient.colors?.length > 2;

      if (hasDashed || hasComplexGradient) {
        target = 'composite';
        reason = 'Vùng chứa có viền đứt nét hoặc gradient đa điểm cần nền Canvas kèm con Native';
        hasNative = false;
        requiresCanvas = true;
        onCanvas();
      } else {
        target = 'native_remote_view';
        reason = 'Khung bố cục chuẩn ánh xạ sang LinearLayout hoặc FrameLayout';
        hasNative = true;
        requiresCanvas = false;
        onNative();
      }
      break;
    }

    default:
      target = 'native_remote_view';
      reason = 'Thành phần tiêu chuẩn';
      hasNative = true;
      onNative();
      break;
  }

  const childrenTargets: RenderPlanTarget[] = [];
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      classifyRenderTargets(child, registry, onNative, onCanvas);
      const childPlan = registry[child.id];
      if (childPlan) {
        childrenTargets.push(childPlan.target);
      }
    });
  }

  registry[id] = {
    id,
    type,
    target,
    reason,
    hasNativeEquivalent: hasNative,
    requiresCanvas,
    childrenTargets: childrenTargets.length > 0 ? childrenTargets : undefined,
  };
}

function extractBindings(node: any, bindings: StateBinding[]): void {
  if (!node || typeof node !== 'object') return;

  const props = node.props || {};
  const actionId = props.actionId;

  if (actionId) {
    let bindingType: StateBinding['bindingType'] = 'custom';
    let targetKey: string | undefined = undefined;

    if (actionId.startsWith('toggle:')) {
      bindingType = 'toggle';
      targetKey = actionId.replace('toggle:', '');
    } else if (actionId.startsWith('page:')) {
      bindingType = 'page';
      targetKey = actionId.replace('page:', '');
    }

    bindings.push({
      id: node.id || `bind_${bindings.length}`,
      actionId,
      bindingType,
      targetKey,
      initialValue: props.isChecked,
    });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => extractBindings(child, bindings));
  }
}

/**
 * 🔍 Tiện ích gỡ lỗi: In ra cây kiểm tra trực quan của Intermediate Representation.
 */
export function inspectIR(input: LayoutNode | WidgetSinglePageConfig): string {
  const ir = compileToIR(input);
  const lines: string[] = [];

  lines.push(`🌲 Widget IR v${ir.version} [${new Date(ir.timestamp).toISOString()}]`);
  lines.push(`📊 Chiến lược kết xuất: ${ir.renderPlan.overallStrategy.toUpperCase()}`);
  lines.push(`   - Native RemoteViews nodes: ${ir.renderPlan.nativeNodeCount}`);
  lines.push(`   - Canvas Bitmap nodes: ${ir.renderPlan.canvasNodeCount}`);
  lines.push(`\n♿ Tóm tắt âm thanh Trợ năng (Synthesized A11y Summary):`);
  lines.push(`   "${ir.semanticSummary}"`);

  lines.push(`\n🎯 Kế hoạch phân bổ (Render Plan Tree):`);
  for (const node of ir.semanticTree) {
    const plan = ir.renderPlan.nodes[node.id];
    const targetTag = plan?.target === 'native_remote_view' ? '[NATIVE]' : (plan?.target === 'canvas_bitmap' ? '[CANVAS]' : '[COMPOSITE]');
    lines.push(`   ${targetTag} ${node.path} <${node.type}> role=${node.role} label="${node.label}" ${node.interactive ? `(Action: ${node.actionId})` : ''}`);
  }

  if (ir.stateBindings.length > 0) {
    lines.push(`\n⚡ Liên kết trạng thái (State Bindings):`);
    for (const b of ir.stateBindings) {
      lines.push(`   - [${b.bindingType.toUpperCase()}] action=${b.actionId} target=${b.targetKey ?? 'N/A'}`);
    }
  }

  return lines.join('\n');
}
