import {
  BadgeNode,
  ButtonNode,
  ChartNode,
  ContainerProps,
  ControlWidgetConfig,
  CustomNode,
  DataBindingField,
  DataBindingProxy,
  DividerNode,
  EqualizerNode,
  EqualizerProps,
  GaugeNode,
  GridNode,
  GridProps,
  HStackNode,
  ImageNode,
  LayoutNode,
  LinkNode,
  LinkProps,
  ProgressNode,
  SpacerNode,
  StyleProp,
  TextNode,
  TextNodeProps,
  TextStyle,
  TimerNode,
  ToggleNode,
  VStackNode,
  WidgetDataPipeOptions,
  ZStackNode,
  ZStackProps,
} from './types';
import { registerAction } from './dispatcher';

let autoActionCounter = 0;

export function isDataBinding(value: any): value is DataBindingField<any> {
  return Boolean(
    value &&
      (typeof value === 'object' || typeof value === 'function') &&
      (value as any).__isDataBinding === true
  );
}

export function resolveBindingValue(value: any): any {
  if (isDataBinding(value)) {
    return value.toToken();
  }
  return value;
}

function buildPipeToken(path: string, pipes: string[]): string {
  return pipes.length > 0 ? `{{${path}|${pipes.join('|')}}}` : `{{${path}}}`;
}

function convertPipeOptions(pipes?: WidgetDataPipeOptions): string[] {
  if (!pipes) return [];
  const out: string[] = [];
  if (pipes.default !== undefined) out.push(`default:${pipes.default}`);
  if (pipes.divide !== undefined) out.push(`divide:${pipes.divide}`);
  if (pipes.multiply !== undefined) out.push(`multiply:${pipes.multiply}`);
  if (pipes.add !== undefined) out.push(`add:${pipes.add}`);
  if (pipes.round !== undefined) out.push(`round:${pipes.round}`);
  if (pipes.upper) out.push('upper');
  if (pipes.lower) out.push('lower');
  if (pipes.currency !== undefined) out.push(`currency:${pipes.currency}`);
  if (pipes.percent !== undefined) out.push(`percent:${pipes.percent}`);
  if (pipes.ifTruthy) {
    const [thenVal, elseVal = ''] = pipes.ifTruthy;
    out.push(`if:${thenVal}:${elseVal}`);
  }
  return out;
}

function createBindingField(
  path: string,
  pipes: string[] = [],
  defaultsMap?: Record<string, string>
): DataBindingField<any> {
  const effectivePipes = [...pipes];
  if (
    defaultsMap &&
    defaultsMap[path] !== undefined &&
    !effectivePipes.some((p) => p.startsWith('default:'))
  ) {
    effectivePipes.unshift(`default:${defaultsMap[path]}`);
  }

  const token = buildPipeToken(path, effectivePipes);
  const target: Record<string | symbol, any> = {
    __isDataBinding: true,
    __bindingPath: path,
    __bindingPipes: effectivePipes,
    toToken: () => token,
    toString: () => token,
    valueOf: () => token,
    toJSON: () => token,
    [Symbol.toPrimitive]: () => token,
    default: (fallback: string | number | boolean) =>
      createBindingField(path, [...pipes, `default:${fallback}`], defaultsMap),
    divide: (divisor: number) =>
      createBindingField(path, [...pipes, `divide:${divisor}`], defaultsMap),
    multiply: (factor: number) =>
      createBindingField(path, [...pipes, `multiply:${factor}`], defaultsMap),
    add: (offset: number) =>
      createBindingField(path, [...pipes, `add:${offset}`], defaultsMap),
    round: (decimals = 0) =>
      createBindingField(path, [...pipes, `round:${decimals}`], defaultsMap),
    upper: () => createBindingField(path, [...pipes, 'upper'], defaultsMap),
    lower: () => createBindingField(path, [...pipes, 'lower'], defaultsMap),
    currency: (symbol = '₫') =>
      createBindingField(path, [...pipes, `currency:${symbol}`], defaultsMap),
    percent: (decimals = 0) =>
      createBindingField(path, [...pipes, `percent:${decimals}`], defaultsMap),
    ifTruthy: (thenValue: string | number, elseValue: string | number = '') =>
      createBindingField(path, [...pipes, `if:${thenValue}:${elseValue}`], defaultsMap),
  };

  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj || typeof prop === 'symbol') {
        return obj[prop];
      }
      // Tránh đánh lừa Promise (.then) hoặc React element checks ($$typeof)
      if (prop === 'then' || prop === 'catch' || prop === 'finally' || prop === '$$typeof') {
        return undefined;
      }
      const nextPath = path ? `${path}.${String(prop)}` : String(prop);
      return createBindingField(nextPath, [], defaultsMap);
    },
  }) as DataBindingField<any>;
}

/**
 * Tạo đối tượng Data Binding có cấu trúc & gợi ý kiểu TypeScript để nhúng trực tiếp vào JSX/DSL Widget.
 */
export function createDataBinding<T extends Record<string, any> = Record<string, any>>(options?: {
  defaults?: Record<string, any>;
  prefix?: string;
}): DataBindingProxy<T> {
  const defaultsMap = options?.defaults ? flattenDataObject(options.defaults) : undefined;
  return createBindingField(options?.prefix || '', [], defaultsMap) as DataBindingProxy<T>;
}

/**
 * Làm phẳng đệ quy JSON lồng nhau thành các đường dẫn dot-notation (`user.name`, `items.0.title`).
 */
export function flattenDataObject(
  obj: any,
  prefix = '',
  out: Record<string, string> = {}
): Record<string, string> {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      const nextKey = prefix ? `${prefix}.${idx}` : String(idx);
      if (item !== null && typeof item === 'object') {
        flattenDataObject(item, nextKey, out);
      } else if (item !== undefined && item !== null) {
        out[nextKey] = String(item);
      }
    });
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object') {
        flattenDataObject(v, nextKey, out);
      } else if (v !== undefined && v !== null) {
        out[nextKey] = String(v);
      }
    }
  } else if (prefix) {
    out[prefix] = String(obj);
  }
  return out;
}

/**
 * Thực thi các phép biến đổi Pipe trên chuỗi giá trị thô (đồng bộ 1:1 với Swift & Kotlin).
 */
export function evaluateTemplatePipe(rawValue: string | undefined, pipes: string[]): string {
  let current = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';

  for (const rawPipe of pipes) {
    const colonIdx = rawPipe.indexOf(':');
    const op = colonIdx >= 0 ? rawPipe.slice(0, colonIdx).trim() : rawPipe.trim();
    const arg = colonIdx >= 0 ? rawPipe.slice(colonIdx + 1) : '';

    switch (op) {
      case 'default': {
        if (current === '') {
          current = arg;
        }
        break;
      }
      case 'divide': {
        const num = parseFloat(current);
        const div = parseFloat(arg);
        if (!Number.isNaN(num) && !Number.isNaN(div) && div !== 0) {
          current = String(num / div);
        }
        break;
      }
      case 'multiply': {
        const num = parseFloat(current);
        const mul = parseFloat(arg);
        if (!Number.isNaN(num) && !Number.isNaN(mul)) {
          current = String(num * mul);
        }
        break;
      }
      case 'add': {
        const num = parseFloat(current);
        const offset = parseFloat(arg);
        if (!Number.isNaN(num) && !Number.isNaN(offset)) {
          current = String(num + offset);
        }
        break;
      }
      case 'round': {
        const num = parseFloat(current);
        const decimals = Math.max(0, parseInt(arg || '0', 10) || 0);
        if (!Number.isNaN(num)) {
          current = decimals === 0 ? String(Math.round(num)) : num.toFixed(decimals);
        }
        break;
      }
      case 'upper': {
        current = current.toUpperCase();
        break;
      }
      case 'lower': {
        current = current.toLowerCase();
        break;
      }
      case 'currency': {
        const num = parseFloat(current);
        const symbol = arg || '₫';
        if (!Number.isNaN(num)) {
          current = `${Math.round(num).toLocaleString('en-US')}${symbol}`;
        }
        break;
      }
      case 'percent': {
        const num = parseFloat(current);
        const decimals = Math.max(0, parseInt(arg || '0', 10) || 0);
        if (!Number.isNaN(num)) {
          current = `${decimals === 0 ? Math.round(num) : num.toFixed(decimals)}%`;
        }
        break;
      }
      case 'if': {
        const splitIdx = arg.indexOf(':');
        const thenVal = splitIdx >= 0 ? arg.slice(0, splitIdx) : arg;
        const elseVal = splitIdx >= 0 ? arg.slice(splitIdx + 1) : '';
        const lower = current.trim().toLowerCase();
        const isTruthy =
          current.trim() !== '' && lower !== 'false' && lower !== '0' && lower !== 'null';
        current = isTruthy ? thenVal : elseVal;
        break;
      }
      default:
        break;
    }
  }
  return current;
}

/**
 * Thay thế toàn bộ token `{{path|pipe1|pipe2}}` trong chuỗi theo bản đồ biến (hỗ trợ cả JSON lồng nhau).
 */
export function resolveTemplateString(template: string, vars: Record<string, any>): string {
  if (!template || !template.includes('{{')) return template;
  const flatVars = flattenDataObject(vars);
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const parts = String(expr).split('|');
    const pathKey = parts[0].trim();
    const pipes = parts.slice(1);
    const hasKey = Object.prototype.hasOwnProperty.call(flatVars, pathKey);
    if (!hasKey && pipes.length === 0) {
      return match;
    }
    const rawVal = hasKey ? flatVars[pathKey] : undefined;
    if (!hasKey && !pipes.some((p) => p.trim().startsWith('default:') || p.trim().startsWith('if:'))) {
      return match;
    }
    return evaluateTemplatePipe(rawVal, pipes);
  });
}

export function flattenStyle<T extends object>(...styles: StyleProp<T>[]): T | undefined {
  let merged: any = undefined;

  function walk(item: any) {
    if (!item) return;
    if (Array.isArray(item)) {
      for (const sub of item) walk(sub);
    } else if (typeof item === 'object') {
      if (!merged) merged = {};
      Object.assign(merged, item);
    }
  }

  for (const s of styles) {
    walk(s);
  }
  return merged as T | undefined;
}

export type AnyWidgetStyle = TextStyle | ContainerProps | Record<string, any>;

export type NamedStyles<T> = {
  [P in keyof T]: AnyWidgetStyle;
};

export const StyleSheet = {
  create: <T extends NamedStyles<T> | NamedStyles<any>>(styles: T & NamedStyles<any>): T => styles,
  flatten: flattenStyle,
};

function isLayoutNode(item: any): item is LayoutNode {
  return item && typeof item === 'object' && typeof item.type === 'string';
}

const TYPOGRAPHY_DEFAULTS: Record<string, { fontSize: number; fontWeight: any }> = {
  largeTitle: { fontSize: 34, fontWeight: 'bold' },
  title1: { fontSize: 28, fontWeight: 'bold' },
  title2: { fontSize: 22, fontWeight: 'bold' },
  title3: { fontSize: 20, fontWeight: 'semibold' },
  headline: { fontSize: 17, fontWeight: 'semibold' },
  body: { fontSize: 17, fontWeight: 'regular' },
  callout: { fontSize: 16, fontWeight: 'regular' },
  subheadline: { fontSize: 15, fontWeight: 'regular' },
  footnote: { fontSize: 13, fontWeight: 'regular' },
  caption1: { fontSize: 12, fontWeight: 'regular' },
  caption2: { fontSize: 11, fontWeight: 'regular' },
};

function normalizeProps<P extends object>(props?: P): P | undefined {
  if (!props) return undefined;
  const p = { ...props } as any;

  for (const key of Object.keys(p)) {
    if (isDataBinding(p[key])) {
      p[key] = p[key].toToken();
    }
  }

  // Bo góc alias
  if (p.cornerRadius !== undefined && p.borderRadius === undefined) {
    p.borderRadius = p.cornerRadius;
  }

  // Spacing / Gap alias chuẩn React Native
  if (p.gap !== undefined && p.spacing === undefined) {
    p.spacing = p.gap;
  }

  // Graceful Fallback cho Gradient: nếu nền tảng/OS không hỗ trợ gradient, tự lấy màu đầu tiên làm backgroundColor
  if (p.gradient && Array.isArray(p.gradient.colors) && p.gradient.colors.length > 0 && !p.backgroundColor) {
    p.backgroundColor = p.gradient.colors[0];
  }

  // Typography scale chuẩn
  if (p.typography && TYPOGRAPHY_DEFAULTS[p.typography]) {
    const typo = TYPOGRAPHY_DEFAULTS[p.typography];
    if (p.fontSize === undefined) p.fontSize = typo.fontSize;
    if (p.fontWeight === undefined) p.fontWeight = typo.fontWeight;
  }

  // Trợ năng / Accessibility Semantics Fallback (Phase 1):
  if (p.accessible === undefined) {
    if (p.text !== undefined || p.title !== undefined || p.actionId !== undefined) {
      p.accessible = true;
    }
  }

  if (p.accessibilityLabel === undefined) {
    if (p.text !== undefined) p.accessibilityLabel = String(p.text);
    else if (p.title !== undefined) p.accessibilityLabel = String(p.title);
  }

  if (p.accessibilityRole === undefined) {
    if (p.title !== undefined || p.actionId !== undefined) {
      p.accessibilityRole = 'button';
    } else if (p.typography && (p.typography.startsWith('title') || p.typography === 'largeTitle' || p.typography === 'headline')) {
      p.accessibilityRole = 'header';
    }
  }

  return p as P;
}

function parseContainerArgs<P extends object>(
  first?: StyleProp<P> | LayoutNode | LayoutNode[],
  rest?: LayoutNode[]
): { props?: P; children: LayoutNode[] } {
  if (!first) {
    return { props: undefined, children: [] };
  }
  if (Array.isArray(first)) {
    if (first.length > 0 && isLayoutNode(first[0])) {
      return { props: undefined, children: first as LayoutNode[] };
    }
    const flattened = flattenStyle<P>(first as StyleProp<P>);
    return { props: normalizeProps(flattened), children: rest || [] };
  }
  if (isLayoutNode(first)) {
    return { props: undefined, children: [first, ...(rest || [])] };
  }
  return { props: normalizeProps(first as P), children: rest || [] };
}

/**
 * Các hàm helper tạo node cây giao diện trực quan cho TypeScript/JavaScript
 */
export const UI = {
  StyleSheet,

  VStack: (
    propsOrChildren?: StyleProp<ContainerProps> | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): VStackNode => {
    const { props, children: parsedChildren } = parseContainerArgs<ContainerProps>(propsOrChildren, children);
    return {
      type: 'VStack',
      props,
      children: parsedChildren,
    };
  },

  HStack: (
    propsOrChildren?: StyleProp<ContainerProps> | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): HStackNode => {
    const { props, children: parsedChildren } = parseContainerArgs<ContainerProps>(propsOrChildren, children);
    return {
      type: 'HStack',
      props,
      children: parsedChildren,
    };
  },

  Text: (
    text: string | DataBindingField<any>,
    ...styles: StyleProp<TextStyle>[]
  ): TextNode => {
    const merged = flattenStyle(...styles);
    return {
      type: 'Text',
      props: normalizeProps<TextNodeProps>({
        text: String(resolveBindingValue(text) ?? ''),
        ...(merged || {}),
      })!,
    };
  },

  Timer: (
    targetTimestamp: number,
    options?: {
      mode?: 'countdown' | 'countup';
      color?: string;
      fontSize?: number;
      fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
      prefix?: string;
      suffix?: string;
    }
  ): TimerNode => ({
    type: 'Timer',
    props: {
      targetTimestamp,
      mode: options?.mode ?? 'countdown',
      ...options,
    },
  }),

  Progress: (
    valueOrOptions: number | string | DataBindingField<any> | ProgressNode['props'],
    options?: Omit<ProgressNode['props'], 'value'>
  ): ProgressNode => {
    if (
      typeof valueOrOptions === 'number' ||
      typeof valueOrOptions === 'string' ||
      isDataBinding(valueOrOptions)
    ) {
      return {
        type: 'Progress',
        props: normalizeProps({
          value: resolveBindingValue(valueOrOptions),
          ...options,
        })!,
      };
    }
    return {
      type: 'Progress',
      props: normalizeProps(valueOrOptions)!,
    };
  },

  Image: (
    urlOrOptions: string | DataBindingField<any> | ImageNode['props'],
    options?: Omit<ImageNode['props'], 'url'>
  ): ImageNode => {
    if (typeof urlOrOptions === 'string' || isDataBinding(urlOrOptions)) {
      const resolved = String(resolveBindingValue(urlOrOptions));
      const isHttp =
        resolved.startsWith('http://') ||
        resolved.startsWith('https://') ||
        resolved.includes('{{');
      const isBase64 = resolved.startsWith('data:image/');
      return {
        type: 'Image',
        props: normalizeProps({
          ...(isHttp
            ? { url: resolved }
            : isBase64
            ? { base64: resolved }
            : { systemName: resolved }),
          ...options,
        })!,
      };
    }
    return {
      type: 'Image',
      props: normalizeProps(urlOrOptions)!,
    };
  },

  Spacer: (minLength?: number): SpacerNode => ({
    type: 'Spacer',
    props: { minLength },
  }),

  Button: (
    titleOrProps: string | DataBindingField<any> | ButtonNode['props'],
    options?: Omit<ButtonNode['props'], 'title'>
  ): ButtonNode => {
    if (typeof titleOrProps === 'object' && titleOrProps !== null && !isDataBinding(titleOrProps)) {
      const normalized = normalizeProps(titleOrProps)!;
      if (normalized.onPress && !normalized.actionId) {
        autoActionCounter += 1;
        normalized.actionId = `act_${Date.now()}_${autoActionCounter}`;
        registerAction(normalized.actionId, normalized.onPress);
      } else if (normalized.onPress && normalized.actionId) {
        registerAction(normalized.actionId, normalized.onPress);
      }
      return {
        type: 'Button',
        props: normalized,
      };
    }

    let finalActionId = options?.actionId;
    if (options?.onPress) {
      if (!finalActionId) {
        autoActionCounter += 1;
        finalActionId = `act_${Date.now()}_${autoActionCounter}`;
      }
      registerAction(finalActionId, options.onPress);
    }

    return {
      type: 'Button',
      props: normalizeProps({
        title: String(resolveBindingValue(titleOrProps)),
        ...options,
        actionId: finalActionId,
      })!,
    };
  },

  /**
   * Tạo nút bấm kèm logic hàm TypeScript trực tiếp.
   * Thư viện tự động sinh ActionId và kết nối bộ lắng nghe Native -> hàm async TypeScript của bạn!
   */
  ActionButton: (
    title: string,
    onPress: (payload?: any) => Promise<any> | any,
    options?: Omit<ButtonNode['props'], 'title' | 'actionId' | 'onPress'>
  ): ButtonNode => {
    autoActionCounter += 1;
    const actionId = `act_${Date.now()}_${autoActionCounter}`;
    registerAction(actionId, onPress);
    return {
      type: 'Button',
      props: {
        title,
        actionId,
        onPress,
        ...options,
      },
    };
  },

  ZStack: (
    propsOrChildren?: ZStackProps | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): ZStackNode => {
    const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
    return {
      type: 'ZStack',
      props: props as ZStackProps | undefined,
      children: parsedChildren,
    };
  },

  Grid: (
    propsOrChildren?: GridProps | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): GridNode => {
    const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
    return {
      type: 'Grid',
      props: props as GridProps | undefined,
      children: parsedChildren,
    };
  },

  Divider: (options?: DividerNode['props']): DividerNode => ({
    type: 'Divider',
    props: options,
  }),

  Gauge: (
    valueOrOptions: number | string | DataBindingField<any> | GaugeNode['props'],
    options?: Omit<GaugeNode['props'], 'value'>
  ): GaugeNode => {
    if (
      typeof valueOrOptions === 'number' ||
      typeof valueOrOptions === 'string' ||
      isDataBinding(valueOrOptions)
    ) {
      return {
        type: 'Gauge',
        props: normalizeProps({
          value: resolveBindingValue(valueOrOptions),
          ...options,
        })!,
      };
    }
    return {
      type: 'Gauge',
      props: normalizeProps(valueOrOptions)!,
    };
  },

  Chart: (
    valuesOrOptions: number[] | ChartNode['props'],
    options?: Omit<ChartNode['props'], 'values'>
  ): ChartNode => {
    if (Array.isArray(valuesOrOptions)) {
      return {
        type: 'Chart',
        props: {
          values: valuesOrOptions,
          ...options,
        },
      };
    }
    return {
      type: 'Chart',
      props: valuesOrOptions,
    };
  },

  Toggle: (
    labelOrOptions: string | ToggleNode['props'],
    options?: Omit<ToggleNode['props'], 'label'>
  ): ToggleNode => {
    if (typeof labelOrOptions === 'string') {
      return {
        type: 'Toggle',
        props: {
          label: labelOrOptions,
          actionId: options?.actionId ?? 'toggle:default',
          ...options,
        },
      };
    }
    return {
      type: 'Toggle',
      props: labelOrOptions,
    };
  },

  Badge: (
    textOrOptions: string | DataBindingField<any> | BadgeNode['props'],
    options?: Omit<BadgeNode['props'], 'text'>
  ): BadgeNode => {
    if (typeof textOrOptions === 'string' || isDataBinding(textOrOptions)) {
      return {
        type: 'Badge',
        props: normalizeProps({
          text: String(resolveBindingValue(textOrOptions)),
          ...options,
        })!,
      };
    }
    return {
      type: 'Badge',
      props: normalizeProps(textOrOptions)!,
    };
  },

  Link: (
    props: LinkProps,
    ...children: LayoutNode[]
  ): LinkNode => ({
    type: 'Link',
    props,
    children,
  }),

  /**
   * Khởi tạo một Component Native tùy chỉnh đã được đăng ký qua:
   * - iOS (Swift): `DynamicNodeRegistry.shared.register("MyComponent") { node in ... }`
   * - Android (Kotlin): `DynamicNodeRegistry.register("MyComponent", ...)`
   */
  Custom: (
    componentName: string,
    props?: Record<string, any>,
    ...children: LayoutNode[]
  ): CustomNode => ({
    type: 'Custom',
    props: {
      ...props,
      componentName,
    },
    children: children.length > 0 ? children : undefined,
  }),

  /**
   * Component sóng nhạc chuyển động (Equalizer / Sound Visualizer):
   * Tự động chạy animation nhịp sóng nhạc mượt mà trên Dynamic Island và Lock Screen (iOS)
   * và hiển thị trực quan trên Android.
   */
  Equalizer: (options?: EqualizerProps): EqualizerNode => ({
    type: 'Equalizer',
    props: {
      isPlaying: true,
      barCount: 4,
      tintColor: '#10B981',
      height: 16,
      barWidth: 3,
      spacing: 2,
      ...options,
    },
  }),

  /**
   * Cấu hình Control Button cho iOS 18+ Control Center / Action Button & Android Quick Settings Tile.
   */
  ControlButton: (
    options: Omit<ControlWidgetConfig, 'type' | 'actionId'> & {
      actionId?: string;
      onPress?: (payload?: any) => Promise<any> | any;
    }
  ): ControlWidgetConfig => buildControlConfig('button', options),

  /**
   * Cấu hình Control Toggle 2 trạng thái cho iOS 18+ Control Center & Android Quick Settings Tile.
   */
  ControlToggle: (
    options: Omit<ControlWidgetConfig, 'type' | 'actionId'> & {
      actionId?: string;
      onPress?: (payload?: any) => Promise<any> | any;
    }
  ): ControlWidgetConfig => buildControlConfig('toggle', options),

  /**
   * Tạo biểu thức Data Binding chuỗi token (`{{path|pipe1|pipe2}}`) dùng với Background Data Engine 2.0.
   */
  bind: (path: string, pipes?: WidgetDataPipeOptions): string =>
    buildPipeToken(path, convertPipeOptions(pipes)),

  /**
   * Tạo Proxy Data Binding có cấu trúc & gợi ý kiểu TypeScript (`data.user.name`, `data.attendance.progress.divide(100)`).
   */
  createDataBinding,
};

function buildControlConfig(
  type: 'button' | 'toggle',
  options: Omit<ControlWidgetConfig, 'type' | 'actionId'> & {
    actionId?: string;
    onPress?: (payload?: any) => Promise<any> | any;
  }
): ControlWidgetConfig {
  const { onPress, actionId, ...rest } = options;
  let resolvedActionId = actionId;
  if (!resolvedActionId) {
    autoActionCounter += 1;
    resolvedActionId =
      type === 'toggle'
        ? `toggle:control_${Date.now()}_${autoActionCounter}`
        : `control_${Date.now()}_${autoActionCounter}`;
  } else if (type === 'toggle' && !resolvedActionId.startsWith('toggle:')) {
    resolvedActionId = `toggle:${resolvedActionId}`;
  }

  if (onPress) {
    registerAction(resolvedActionId, onPress);
  }

  return {
    ...rest,
    type,
    actionId: resolvedActionId,
  };
}
