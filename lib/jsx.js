import React from 'react';
import { UI, flattenStyle } from './builder';
// ─── 1. JSX COMPONENT DEFINITIONS ────────────────────────────────────────────
export function extractPropsAndStyle(props) {
    if (!props)
        return {};
    const { style, children, ...rest } = props;
    if (!style)
        return rest;
    const flattened = flattenStyle(style);
    return { ...flattened, ...rest };
}
export const VStack = () => null;
VStack.displayName = 'VStack';
export const HStack = () => null;
HStack.displayName = 'HStack';
export const ZStack = () => null;
ZStack.displayName = 'ZStack';
export const Grid = () => null;
Grid.displayName = 'Grid';
export const Text = () => null;
Text.displayName = 'Text';
export const Button = () => null;
Button.displayName = 'Button';
export const Badge = () => null;
Badge.displayName = 'Badge';
export const Progress = () => null;
Progress.displayName = 'Progress';
export const Timer = () => null;
Timer.displayName = 'Timer';
export const Image = () => null;
Image.displayName = 'Image';
export const Spacer = () => null;
Spacer.displayName = 'Spacer';
export const Divider = () => null;
Divider.displayName = 'Divider';
export const Link = () => null;
Link.displayName = 'Link';
export const Equalizer = () => null;
Equalizer.displayName = 'Equalizer';
export const Gauge = () => null;
Gauge.displayName = 'Gauge';
export const Chart = () => null;
Chart.displayName = 'Chart';
export const Toggle = () => null;
Toggle.displayName = 'Toggle';
export const Switch = () => null;
Switch.displayName = 'Switch';
export const Checkbox = () => null;
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
export function renderToWidget(element) {
    if (element == null || typeof element === 'boolean') {
        return null;
    }
    if (typeof element === 'string' || typeof element === 'number') {
        return UI.Text(String(element));
    }
    if (Array.isArray(element)) {
        const children = element.map(renderToWidget).filter(Boolean);
        return UI.VStack({}, ...children);
    }
    // Nếu bản thân đối tượng đã là một LayoutNode của builder (đã có type string)
    if (element && typeof element.type === 'string' && element.props !== undefined && !React.isValidElement(element)) {
        return element;
    }
    if (!React.isValidElement(element)) {
        return null;
    }
    const { type, props } = element;
    const restProps = extractPropsAndStyle(props);
    const children = props?.children;
    const parsedChildren = [];
    if (children !== undefined && children !== null) {
        React.Children.forEach(children, (child) => {
            const parsed = renderToWidget(child);
            if (parsed) {
                parsedChildren.push(parsed);
            }
        });
    }
    // Trường hợp Component là Function
    if (typeof type === 'function') {
        const compName = type.displayName || type.name;
        const isComp = (target, name) => type === target || compName === name;
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
            const textContent = typeof children === 'string' || typeof children === 'number'
                ? String(children)
                : restProps.text || '';
            return UI.Text(textContent, restProps);
        }
        if (isComp(Button, 'Button')) {
            const title = restProps.title || (typeof children === 'string' ? children : '');
            return UI.Button({ ...restProps, title });
        }
        if (isComp(Badge, 'Badge')) {
            const text = restProps.text || (typeof children === 'string' ? children : '');
            return UI.Badge({ ...restProps, text });
        }
        if (isComp(Progress, 'Progress')) {
            return UI.Progress(restProps.value ?? restProps.totalDuration ?? 0, restProps);
        }
        if (isComp(Timer, 'Timer')) {
            return UI.Timer(restProps.targetTimestamp ?? Date.now(), restProps);
        }
        if (isComp(Image, 'Image')) {
            return UI.Image(restProps.url || restProps.base64 || restProps.systemName || restProps.source || '', restProps);
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
            const rendered = type(props);
            return renderToWidget(rendered);
        }
        catch {
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
                const textContent = typeof children === 'string' || typeof children === 'number'
                    ? String(children)
                    : restProps.text || '';
                return UI.Text(textContent, restProps);
            }
            case 'Button':
                return UI.Button({
                    ...restProps,
                    title: restProps.title || (typeof children === 'string' ? children : ''),
                });
            case 'Badge':
                return UI.Badge({
                    ...restProps,
                    text: restProps.text || (typeof children === 'string' ? children : ''),
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
//# sourceMappingURL=jsx.js.map