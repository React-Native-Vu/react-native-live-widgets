import React from 'react';
import { UI } from './builder';
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
    const { children, ...restProps } = props || {};
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
        switch (compName) {
            case 'VStack':
                return UI.VStack(restProps, ...parsedChildren);
            case 'HStack':
                return UI.HStack(restProps, ...parsedChildren);
            case 'ZStack':
                return UI.ZStack(restProps, ...parsedChildren);
            case 'Grid':
                return UI.Grid(restProps, ...parsedChildren);
            case 'Text': {
                const textContent = typeof children === 'string' || typeof children === 'number'
                    ? String(children)
                    : restProps.text || '';
                return UI.Text(textContent, restProps);
            }
            case 'Button': {
                const title = restProps.title || (typeof children === 'string' ? children : '');
                return UI.Button({ ...restProps, title });
            }
            case 'Badge': {
                const text = restProps.text || (typeof children === 'string' ? children : '');
                return UI.Badge({ ...restProps, text });
            }
            case 'Progress':
                return UI.Progress(restProps.value ?? restProps.totalDuration ?? 0, restProps);
            case 'Timer':
                return UI.Timer(restProps.targetTimestamp ?? Date.now(), restProps);
            case 'Image':
                return UI.Image(restProps.url || restProps.base64 || restProps.systemName || restProps.source || '', restProps);
            case 'Spacer':
                return UI.Spacer(restProps.minLength);
            case 'Divider':
                return UI.Divider(restProps);
            case 'Equalizer':
                return UI.Equalizer(restProps);
            case 'Link':
                return UI.Link(restProps, ...parsedChildren);
            case 'Gauge':
                return UI.Gauge(restProps.value ?? 0, restProps);
            case 'Chart':
                return UI.Chart(restProps.values ?? [], restProps);
            default: {
                // Component do người dùng tự viết: gọi hàm render để đệ quy phân giải
                try {
                    const rendered = type(props);
                    return renderToWidget(rendered);
                }
                catch {
                    return null;
                }
            }
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
            default:
                return null;
        }
    }
    return null;
}
//# sourceMappingURL=jsx.js.map