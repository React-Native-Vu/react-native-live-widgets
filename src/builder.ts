import {
  ButtonNode,
  ContainerProps,
  HStackNode,
  ImageNode,
  LayoutNode,
  ProgressNode,
  SpacerNode,
  TextNode,
  TimerNode,
  VStackNode,
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

  Image: (options: {
    assetName?: string;
    systemName?: string;
    filePath?: string;
    width?: number;
    height?: number;
    tintColor?: string;
    borderRadius?: number;
  }): ImageNode => ({
    type: 'Image',
    props: options,
  }),

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
};
