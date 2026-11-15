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
  TextNode,
  TimerNode,
  ToggleNode,
  VStackNode,
  ZStackNode,
  ZStackProps,
} from './types';

function isLayoutNode(item: any): item is LayoutNode {
  return item && typeof item === 'object' && typeof item.type === 'string';
}

function parseContainerArgs(
  first?: ContainerProps | LayoutNode | LayoutNode[],
  rest?: LayoutNode[]
): { props?: ContainerProps; children: LayoutNode[] } {
  if (!first) {
    return { props: undefined, children: [] };
  }
  if (Array.isArray(first)) {
    return { props: undefined, children: first };
  }
  if (isLayoutNode(first)) {
    return { props: undefined, children: [first, ...(rest || [])] };
  }
  return { props: first as ContainerProps, children: rest || [] };
}

/**
 * Các hàm helper tạo node cây giao diện trực quan cho TypeScript/JavaScript
 */
export const UI = {
  VStack: (
    propsOrChildren?: ContainerProps | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): VStackNode => {
    const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
    return {
      type: 'VStack',
      props,
      children: parsedChildren,
    };
  },

  HStack: (
    propsOrChildren?: ContainerProps | LayoutNode | LayoutNode[],
    ...children: LayoutNode[]
  ): HStackNode => {
    const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
    return {
      type: 'HStack',
      props,
      children: parsedChildren,
    };
  },

  Text: (
    text: string,
    options?: {
      color?: string;
      fontSize?: number;
      fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
      numberOfLines?: number;
    }
  ): TextNode => ({
    type: 'Text',
    props: {
      text,
      ...options,
    },
  }),

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
