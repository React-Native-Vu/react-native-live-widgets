import React from 'react';
import {
  LayoutNode,
  VStackNode,
  HStackNode,
  ZStackNode,
  GridNode,
  TextNode,
  ButtonNode,
  BadgeNode,
  ProgressNode,
  TimerNode,
  EqualizerNode,
  ImageNode,
  SpacerNode,
  DividerNode,
  LinkNode,
  GaugeNode,
  ChartNode,
  ToggleNode,
  ContainerProps,
  TextStyle,
  ZStackProps,
  GridProps,
  LinkProps,
  EqualizerProps,
  StyleProp,
  DataBindingField,
} from './types';
import { UI, flattenStyle, isDataBinding, resolveBindingValue } from './builder';

type WidgetTextChild =
  | React.ReactNode
  | DataBindingField<any>
  | Array<React.ReactNode | DataBindingField<any>>;

function flattenTextChildren(children: any): string {
  if (children === undefined || children === null || typeof children === 'boolean') {
    return '';
  }
  if (isDataBinding(children)) {
    return children.toToken();
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(flattenTextChildren).join('');
  }
  return '';
}

function collectChildElements(children: any, out: any[] = []): any[] {
  if (children === undefined || children === null || typeof children === 'boolean') {
    return out;
  }
  if (Array.isArray(children)) {
    for (const item of children) {
      collectChildElements(item, out);
    }
    return out;
  }
  out.push(children);
  return out;
}

// ─── 1. JSX COMPONENT DEFINITIONS ────────────────────────────────────────────

export function extractPropsAndStyle<T extends object>(props: any): any {
  if (!props) return {};
  const { style, children, ...rest } = props;
  if (!style) return rest;
  const flattened = flattenStyle(style);
  return { ...flattened, ...rest };
}

export interface VStackProps extends ContainerProps {
  children?: React.ReactNode;
  style?: StyleProp<ContainerProps>;
}
export const VStack: React.FC<VStackProps> = () => null;
VStack.displayName = 'VStack';

export interface HStackProps extends ContainerProps {
  children?: React.ReactNode;
  style?: StyleProp<ContainerProps>;
}
export const HStack: React.FC<HStackProps> = () => null;
HStack.displayName = 'HStack';

export interface ZStackJSXProps extends ZStackProps {
  children?: React.ReactNode;
  style?: StyleProp<ZStackProps>;
}
export const ZStack: React.FC<ZStackJSXProps> = () => null;
ZStack.displayName = 'ZStack';

export interface GridJSXProps extends GridProps {
  children?: React.ReactNode;
  style?: StyleProp<GridProps>;
}
export const Grid: React.FC<GridJSXProps> = () => null;
Grid.displayName = 'Grid';

export interface TextJSXProps extends TextStyle {
  children?: WidgetTextChild;
  text?: string | DataBindingField<any>;
  style?: StyleProp<TextStyle>;
}
export const Text: React.FC<TextJSXProps> = () => null;
Text.displayName = 'Text';

export type ButtonJSXProps = Omit<ButtonNode['props'], 'title'> & {
  title?: string | DataBindingField<any>;
  children?: WidgetTextChild;
  style?: StyleProp<ButtonNode['props']>;
};
export const Button: React.FC<ButtonJSXProps> = () => null;
Button.displayName = 'Button';

export type BadgeJSXProps = Omit<BadgeNode['props'], 'text'> & {
  text?: string | DataBindingField<any>;
  children?: WidgetTextChild;
  style?: StyleProp<BadgeNode['props']>;
};
export const Badge: React.FC<BadgeJSXProps> = () => null;
Badge.displayName = 'Badge';

export type ProgressJSXProps = ProgressNode['props'] & {
  style?: StyleProp<ProgressNode['props']>;
};
export const Progress: React.FC<ProgressJSXProps> = () => null;
Progress.displayName = 'Progress';

export type TimerJSXProps = TimerNode['props'] & {
  style?: StyleProp<TimerNode['props']>;
};
export const Timer: React.FC<TimerJSXProps> = () => null;
Timer.displayName = 'Timer';

export type ImageJSXProps = ImageNode['props'] & {
  style?: StyleProp<ImageNode['props']>;
};
export const Image: React.FC<ImageJSXProps> = () => null;
Image.displayName = 'Image';

export const Spacer: React.FC<{ minLength?: number }> = () => null;
Spacer.displayName = 'Spacer';

export const Divider: React.FC<DividerNode['props']> = () => null;
Divider.displayName = 'Divider';

export interface LinkJSXProps extends LinkProps {
  children?: React.ReactNode;
  style?: StyleProp<LinkProps>;
}
export const Link: React.FC<LinkJSXProps> = () => null;
Link.displayName = 'Link';

export const Equalizer: React.FC<EqualizerProps> = () => null;
Equalizer.displayName = 'Equalizer';

export const Gauge: React.FC<GaugeNode['props']> = () => null;
Gauge.displayName = 'Gauge';

export const Chart: React.FC<ChartNode['props']> = () => null;
Chart.displayName = 'Chart';

export type ToggleJSXProps = Partial<ToggleNode['props']> & {
  children?: React.ReactNode;
  actionId?: string;
  key?: string;
};

export const Toggle: React.FC<ToggleJSXProps> = () => null;
Toggle.displayName = 'Toggle';

export const Switch: React.FC<ToggleJSXProps> = () => null;
Switch.displayName = 'Switch';

export const Checkbox: React.FC<ToggleJSXProps> = () => null;
Checkbox.displayName = 'Checkbox';

// ─── 2. RECURSIVE JSX -> LAYOUTNODE CONVERTER ────────────────────────────────

/**
 * Chuyển đổi một cây JSX/TSX thành cấu trúc cây LayoutNode chuẩn của thư viện.
 *
 * ```tsx
 * const layout = renderToWidget(
 *   <VStack padding={16} backgroundColor="#0F172A" borderRadius={16}>
 *     <HStack justifyContent="spaceBetween">
 *       <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Vào ca sáng</Text>
 *       <Badge text="07:54 (Hợp lệ)" backgroundColor="#064E3B" textColor="#6EE7B7" />
 *     </HStack>
 *     <Button title="Làm mới" actionId="refresh" />
 *   </VStack>
 * );
 * ```
 */
export function renderToWidget(element: any): LayoutNode | null {
  if (element == null || typeof element === 'boolean') {
    return null;
  }
  if (isDataBinding(element)) {
    return UI.Text(element.toToken());
  }
  if (typeof element === 'string' || typeof element === 'number') {
    return UI.Text(String(element));
  }
  if (Array.isArray(element)) {
    const children = element.map(renderToWidget).filter(Boolean) as LayoutNode[];
    return UI.VStack({}, ...children);
  }

  // Nếu bản thân đối tượng đã là một LayoutNode của builder (đã có type string)
  if (element && typeof element.type === 'string' && (element as any).props !== undefined && !React.isValidElement(element)) {
    return element as LayoutNode;
  }

  if (!React.isValidElement(element)) {
    return null;
  }

  const { type, props } = element as React.ReactElement<any>;
  const restProps = extractPropsAndStyle(props);
  const children = props?.children;

  const parsedChildren: LayoutNode[] = [];
  if (children !== undefined && children !== null) {
    for (const child of collectChildElements(children)) {
      const parsed = renderToWidget(child);
      if (parsed) {
        parsedChildren.push(parsed);
      }
    }
  }

  // Trường hợp Component là Function
  if (typeof type === 'function') {
    const compName = (type as any).displayName || type.name;
    const isComp = (target: any, name: string) => type === target || compName === name;

    if (isComp(VStack, 'VStack')) {
      return UI.VStack(restProps, ...parsedChildren);
    }
    if (isComp(HStack, 'HStack')) {
      return UI.HStack(restProps, ...parsedChildren);
    }
    if (isComp(ZStack, 'ZStack')) {
      return UI.ZStack(restProps, ...parsedChildren);
    }
    if (isComp(Grid, 'Grid')) {
      return UI.Grid(restProps, ...parsedChildren);
    }
    if (isComp(Text, 'Text')) {
      const childText = flattenTextChildren(children);
      const textContent = childText || String(resolveBindingValue(restProps.text) ?? '');
      return UI.Text(textContent, restProps);
    }
    if (isComp(Button, 'Button')) {
      const title =
        String(resolveBindingValue(restProps.title) || '') || flattenTextChildren(children);
      return UI.Button({ ...restProps, title });
    }
    if (isComp(Badge, 'Badge')) {
      const text =
        String(resolveBindingValue(restProps.text) || '') || flattenTextChildren(children);
      return UI.Badge({ ...restProps, text });
    }
    if (isComp(Progress, 'Progress')) {
      return UI.Progress(restProps.value ?? restProps.totalDuration ?? 0, restProps);
    }
    if (isComp(Timer, 'Timer')) {
      return UI.Timer(restProps.targetTimestamp ?? Date.now(), restProps);
    }
    if (isComp(Image, 'Image')) {
      return UI.Image(
        restProps.url ||
          restProps.base64 ||
          restProps.iosSystemName ||
          restProps.systemNameIos ||
          restProps.androidSystemName ||
          restProps.systemNameAndroid ||
          restProps.materialName ||
          restProps.systemName ||
          restProps.source ||
          '',
        restProps
      );
    }
    if (isComp(Spacer, 'Spacer')) {
      return UI.Spacer(restProps.minLength);
    }
    if (isComp(Divider, 'Divider')) {
      return UI.Divider(restProps);
    }
    if (isComp(Equalizer, 'Equalizer')) {
      return UI.Equalizer(restProps);
    }
    if (isComp(Link, 'Link')) {
      return UI.Link(restProps, ...parsedChildren);
    }
    if (isComp(Gauge, 'Gauge')) {
      return UI.Gauge(restProps.value ?? 0, restProps);
    }
    if (isComp(Chart, 'Chart')) {
      return UI.Chart(restProps.values ?? [], restProps);
    }
    if (isComp(Toggle, 'Toggle') || isComp(Switch, 'Switch') || isComp(Checkbox, 'Checkbox')) {
      const label = restProps.label || (typeof children === 'string' ? children : '');
      const actionId = restProps.actionId || (restProps.key ? `toggle:${restProps.key}` : 'toggle:item');
      const style = isComp(Switch, 'Switch') ? 'switch' : (isComp(Checkbox, 'Checkbox') ? 'checkbox' : restProps.style);
      return UI.Toggle(label, { ...restProps, actionId, style });
    }

    // Component do người dùng tự viết: gọi hàm render để đệ quy phân giải
    try {
      const rendered = (type as any)(props);
      return renderToWidget(rendered);
    } catch {
      return null;
    }
  }

  // Trường hợp Component được truyền dạng string type
  if (typeof type === 'string') {
    switch (type) {
      case 'VStack':
        return UI.VStack(restProps, ...parsedChildren);
      case 'HStack':
        return UI.HStack(restProps, ...parsedChildren);
      case 'ZStack':
        return UI.ZStack(restProps, ...parsedChildren);
      case 'Text': {
        const textContent =
          flattenTextChildren(children) || String(resolveBindingValue(restProps.text) ?? '');
        return UI.Text(textContent, restProps);
      }
      case 'Button':
        return UI.Button({
          ...restProps,
          title:
            String(resolveBindingValue(restProps.title) || '') || flattenTextChildren(children),
        });
      case 'Badge':
        return UI.Badge({
          ...restProps,
          text:
            String(resolveBindingValue(restProps.text) || '') || flattenTextChildren(children),
        });
      case 'Progress':
        return UI.Progress(restProps.value ?? 0, restProps);
      case 'Image':
        return UI.Image(restProps.url || restProps.base64 || restProps.systemName || '', restProps);
      case 'Spacer':
        return UI.Spacer(restProps.minLength);
      case 'Divider':
        return UI.Divider(restProps);
      case 'Toggle':
      case 'Switch':
      case 'Checkbox': {
        const label = restProps.label || (typeof children === 'string' ? children : '');
        const actionId = restProps.actionId || 'toggle:item';
        const style = type === 'Switch' ? 'switch' : (type === 'Checkbox' ? 'checkbox' : restProps.style);
        return UI.Toggle(label, { ...restProps, actionId, style });
      }
      default:
        return null;
    }
  }

  return null;
}
