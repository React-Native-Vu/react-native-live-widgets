import {
  BadgeNode,
  ButtonNode,
  ChartNode,
  ContainerProps,
  CustomNode,
  DividerNode,
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
  TextStyle,
  TimerNode,
  ToggleNode,
  VStackNode,
  ZStackNode,
  ZStackProps,
} from './types';

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
    return { props: flattened, children: rest || [] };
  }
  if (isLayoutNode(first)) {
    return { props: undefined, children: [first, ...(rest || [])] };
  }
  return { props: first as P, children: rest || [] };
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
    text: string,
    ...styles: StyleProp<TextStyle>[]
  ): TextNode => {
    const merged = flattenStyle(...styles);
    return {
      type: 'Text',
      props: {
        text,
        ...(merged || {}),
      },
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
    valueOrOptions: number | ProgressNode['props'],
    options?: Omit<ProgressNode['props'], 'value'>
  ): ProgressNode => {
    if (typeof valueOrOptions === 'number') {
      return {
        type: 'Progress',
        props: {
          value: valueOrOptions,
          ...options,
        },
      };
    }
    return {
      type: 'Progress',
      props: valueOrOptions,
    };
  },

  Image: (
    urlOrOptions: string | ImageNode['props'],
    options?: Omit<ImageNode['props'], 'url'>
  ): ImageNode => {
    if (typeof urlOrOptions === 'string') {
      const isHttp = urlOrOptions.startsWith('http://') || urlOrOptions.startsWith('https://');
      const isBase64 = urlOrOptions.startsWith('data:image/');
      return {
        type: 'Image',
        props: {
          ...(isHttp
            ? { url: urlOrOptions }
            : isBase64
            ? { base64: urlOrOptions }
            : { systemName: urlOrOptions }),
          ...options,
        },
      };
    }
    return {
      type: 'Image',
      props: urlOrOptions,
    };
  },

  Spacer: (minLength?: number): SpacerNode => ({
    type: 'Spacer',
    props: { minLength },
  }),

  Button: (
    title: string,
    options?: Omit<ButtonNode['props'], 'title'>
  ): ButtonNode => ({
    type: 'Button',
    props: {
      title,
      ...options,
    },
  }),

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
    valueOrOptions: number | GaugeNode['props'],
    options?: Omit<GaugeNode['props'], 'value'>
  ): GaugeNode => {
    if (typeof valueOrOptions === 'number') {
      return {
        type: 'Gauge',
        props: {
          value: valueOrOptions,
          ...options,
        },
      };
    }
    return {
      type: 'Gauge',
      props: valueOrOptions,
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
    textOrOptions: string | BadgeNode['props'],
    options?: Omit<BadgeNode['props'], 'text'>
  ): BadgeNode => {
    if (typeof textOrOptions === 'string') {
      return {
        type: 'Badge',
        props: {
          text: textOrOptions,
          ...options,
        },
      };
    }
    return {
      type: 'Badge',
      props: textOrOptions,
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
};
