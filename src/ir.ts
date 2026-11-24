import {
  LayoutNode,
  WidgetSinglePageConfig,
  WidgetIR,
  SemanticNode,
  NodeRenderPlan,
  RenderPlanTarget,
  StateBinding,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityGrouping,
} from './types';

let nodeCounter = 0;

/**
 * 🌲 Trình biên dịch UI Intermediate Representation (IR).
 * Chuyển hóa cây DSL thành cấu trúc dữ liệu trung gian chuẩn gồm:
 * 1. Root LayoutNode (đã chuẩn hóa thuộc tính & định danh).
 * 2. Semantic Tree độc lập (Tách biệt hoàn toàn khỏi việc vẽ hình của Canvas).
 *    Bao gồm: Focus Order, Grouping, State Description, Adjustable Actions, Live Region, RTL.
 * 3. Render Plan (Renderer Planner phân loại Native RemoteViews vs Canvas Bitmap).
 * 4. State Bindings (Danh sách các liên kết tương tác & đồng bộ trạng thái).
 */
export function compileToIR(
  input: LayoutNode | WidgetSinglePageConfig,
  options?: { rtl?: boolean }
): WidgetIR {
  nodeCounter = 0;
  const rootNode = resolveRootLayoutNode(input);
  const rootDirection: 'ltr' | 'rtl' =
    options?.rtl || (rootNode as any)?.props?.layoutDirection === 'rtl' ? 'rtl' : 'ltr';

  // 1. Gán ID duy nhất và lập bản đồ cây
  const indexedRoot = assignNodeIds(rootNode, '0');

  // 2. Xây dựng Semantic Tree độc lập với hỗ trợ Focus Order, Grouping, State & RTL
  const rawSemanticTree: Array<{ node: SemanticNode; explicitOrder?: number; domIndex: number }> = [];
  buildSemanticNodes(indexedRoot, '0', rawSemanticTree, rootDirection);

  // Sắp xếp Focus Order: Các node có accessibilityFocusOrder tường minh được ưu tiên theo thứ tự tăng dần
  rawSemanticTree.sort((a, b) => {
    const hasA = a.explicitOrder !== undefined;
    const hasB = b.explicitOrder !== undefined;
    if (hasA && hasB) {
      if (a.explicitOrder! !== b.explicitOrder!) {
        return a.explicitOrder! - b.explicitOrder!;
      }
      return a.domIndex - b.domIndex;
    }
    if (hasA) return -1;
    if (hasB) return 1;
    return a.domIndex - b.domIndex;
  });

  const semanticTree: SemanticNode[] = rawSemanticTree.map((item, idx) => ({
    ...item.node,
    focusOrder: idx + 1,
  }));

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

function synthesizeStateDescription(state?: AccessibilityState): string | undefined {
  if (!state) return undefined;
  const parts: string[] = [];
  if (state.checked === true) parts.push('Đã chọn');
  else if (state.checked === false) parts.push('Chưa chọn');
  if (state.selected === true) parts.push('Đang được chọn');
  if (state.expanded === true) parts.push('Đang mở rộng');
  else if (state.expanded === false) parts.push('Đang thu gọn');
  if (state.disabled === true) parts.push('Vô hiệu hóa');
  if (state.busy === true) parts.push('Đang tải');
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function collectCombinedGroupText(node: any, labels: string[], childIds: string[]): void {
  if (!node || typeof node !== 'object') return;
  const props = node.props || {};
  if (props.accessible === false) return;

  if (node.id) childIds.push(node.id);

  if (props.accessibilityLabel) {
    labels.push(String(props.accessibilityLabel).trim());
  } else if (props.text !== undefined) {
    labels.push(String(props.text).trim());
  } else if (props.title !== undefined) {
    labels.push(String(props.title).trim());
  } else if (props.label !== undefined) {
    labels.push(String(props.label).trim());
  }

  if (props.accessibilityValue !== undefined) {
    labels.push(String(props.accessibilityValue).trim());
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectCombinedGroupText(child, labels, childIds);
    }
  }
}

function buildSemanticNodes(
  node: any,
  path: string,
  result: Array<{ node: SemanticNode; explicitOrder?: number; domIndex: number }>,
  inheritedDirection: 'ltr' | 'rtl'
): void {
  if (!node || typeof node !== 'object') return;

  const props = node.props || {};
  const accessible = props.accessible !== false;
  if (!accessible) {
    // Ẩn hoàn toàn khỏi Semantic Tree (decorative elements)
    return;
  }

  const type = node.type;
  const direction: 'ltr' | 'rtl' = props.layoutDirection || inheritedDirection;
  const groupStrategy: AccessibilityGrouping | undefined = props.accessibilityGroup;
  const explicitOrder: number | undefined =
    typeof props.accessibilityFocusOrder === 'number' ? props.accessibilityFocusOrder : undefined;

  let state: AccessibilityState | undefined = props.accessibilityState
    ? { ...props.accessibilityState }
    : undefined;

  if (type === 'Toggle' && props.isChecked !== undefined) {
    state = { ...(state || {}), checked: Boolean(props.isChecked) };
  }
  if (props.disabled === true) {
    state = { ...(state || {}), disabled: true };
  }

  const stateDescription = synthesizeStateDescription(state);
  const adjustable = props.accessibilityAdjustable;
  const liveRegion = props.accessibilityLiveRegion;

  // ♿ Xử lý Accessibility Grouping ('combine'): Gộp toàn bộ node con vào 1 SemanticNode duy nhất
  if (groupStrategy === 'combine') {
    const combinedLabels: string[] = [];
    const groupedChildIds: string[] = [];
    if (props.accessibilityLabel) {
      combinedLabels.push(String(props.accessibilityLabel).trim());
    }
    if (Array.isArray(node.children)) {
      const orderedChildren =
        direction === 'rtl' && type === 'HStack' ? [...node.children].reverse() : node.children;
      for (const child of orderedChildren) {
        collectCombinedGroupText(child, combinedLabels, groupedChildIds);
      }
    }

    const mergedLabel = Array.from(new Set(combinedLabels.filter(Boolean))).join(', ');
    if (mergedLabel || props.actionId) {
      result.push({
        domIndex: result.length,
        explicitOrder,
        node: {
          id: node.id || `semantic_${path}`,
          path,
          type,
          role: props.accessibilityRole || (props.actionId ? 'button' : 'summary'),
          label: mergedLabel,
          hint: props.accessibilityHint,
          value: props.accessibilityValue,
          interactive: Boolean(props.actionId || adjustable),
          actionId: props.actionId,
          deepLink: props.deepLink,
          isDecorative: false,
          groupStrategy: 'combine',
          state,
          stateDescription,
          adjustable,
          liveRegion,
          isHeading: props.accessibilityRole === 'header',
          direction,
          groupedChildIds,
        },
      });
    }
    return;
  }

  let role: AccessibilityRole = props.accessibilityRole || 'none';
  let label = props.accessibilityLabel || '';
  let hint = props.accessibilityHint;
  let value = props.accessibilityValue;
  let interactive = Boolean(adjustable);
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
      role = adjustable ? 'adjustable' : 'button';
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
      role = adjustable ? 'adjustable' : 'progressbar';
      if (!label) label = 'Tiến độ';
      if (value === undefined && props.value !== undefined) {
        const num = Number(props.value);
        value = Number.isNaN(num) ? String(props.value) : `${Math.round(num * 100)}%`;
      }
      break;
    }

    case 'Gauge': {
      role = adjustable ? 'adjustable' : 'progressbar';
      label = props.label || label || 'Chỉ số';
      if (value === undefined) {
        if (props.valueText) {
          value = props.valueText;
        } else if (props.value !== undefined) {
          const num = Number(props.value);
          value = Number.isNaN(num) ? String(props.value) : `${Math.round(num * 100)}%`;
        }
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
      hint = hint || 'Chạm để thay đổi trạng thái';
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
      if (adjustable && role === 'none') {
        role = 'adjustable';
      }
      break;
  }

  if (label || value !== undefined || interactive) {
    result.push({
      domIndex: result.length,
      explicitOrder,
      node: {
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
        isDecorative: false,
        groupStrategy,
        state,
        stateDescription,
        adjustable,
        liveRegion,
        isHeading: role === 'header',
        direction,
      },
    });
  }

  if (Array.isArray(node.children)) {
    // ♿ RTL Accessibility: Với HStack trong môi trường RTL, đảo thứ tự duyệt con từ phải sang trái
    const childrenEntries = node.children.map((child: any, idx: number) => ({ child, idx }));
    if (direction === 'rtl' && type === 'HStack') {
      childrenEntries.reverse();
    }
    for (const { child, idx } of childrenEntries) {
      buildSemanticNodes(child, `${path}.${idx}`, result, direction);
    }
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

/**
 * ♿ Accessibility Test Inspector:
 * Công cụ kiểm tra Cây Trợ Năng (Native Accessibility Node Tree) thực tế từ UI IR.
 * Hiển thị rõ thứ tự Focus Order, Grouping, State Description, Adjustable Actions, Live Region và RTL.
 */
export function inspectAccessibilityTree(
  input: LayoutNode | WidgetSinglePageConfig,
  options?: { rtl?: boolean }
): string {
  const ir = compileToIR(input, options);
  const direction = options?.rtl ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)';
  const lines: string[] = [];

  lines.push(`♿ Accessibility Node Tree Inspector [Direction: ${direction}]`);
  lines.push(`   Total Focusable Semantic Nodes: ${ir.semanticTree.length}`);
  lines.push(`   Synthesized Summary: "${ir.semanticSummary}"`);
  lines.push(`────────────────────────────────────────────────────────`);

  ir.semanticTree.forEach((node, idx) => {
    const isLast = idx === ir.semanticTree.length - 1;
    const branch = isLast ? '└──' : '├──';
    const roleIcon =
      node.isHeading
        ? '🏷️ Header'
        : node.groupStrategy === 'combine'
        ? '📦 Group'
        : node.role === 'button'
        ? '🔘 Button'
        : node.role === 'switch'
        ? '🔀 Switch'
        : node.role === 'adjustable'
        ? '🎚️ Adjustable'
        : node.role === 'timer'
        ? '⏱️ Timer'
        : node.role === 'progressbar'
        ? '📊 Progress'
        : '📝 Text';

    const metaParts: string[] = [];
    if (node.value !== undefined) metaParts.push(`Value: "${node.value}"`);
    if (node.stateDescription) metaParts.push(`State: ${node.stateDescription}`);
    if (node.actionId) metaParts.push(`Action: ${node.actionId}`);
    if (node.adjustable) {
      metaParts.push(
        `Adjustable(+${node.adjustable.incrementActionId || 'inc'}/-${node.adjustable.decrementActionId || 'dec'})`
      );
    }
    if (node.liveRegion && node.liveRegion !== 'none') {
      metaParts.push(`LiveRegion: ${node.liveRegion}`);
    }
    if (node.groupedChildIds && node.groupedChildIds.length > 0) {
      metaParts.push(`Combined: ${node.groupedChildIds.length} nodes`);
    }

    const metaStr = metaParts.length > 0 ? ` (${metaParts.join(' | ')})` : '';
    lines.push(`${branch} [Focus ${node.focusOrder}] ${roleIcon}: "${node.label}"${metaStr}`);
  });

  return lines.join('\n');
}
