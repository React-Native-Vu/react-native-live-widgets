"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checkbox = exports.Switch = exports.Toggle = exports.Chart = exports.Gauge = exports.Equalizer = exports.Link = exports.Divider = exports.Spacer = exports.Image = exports.Timer = exports.Progress = exports.Badge = exports.Button = exports.Text = exports.Grid = exports.ZStack = exports.HStack = exports.VStack = void 0;
exports.extractPropsAndStyle = extractPropsAndStyle;
exports.renderToWidget = renderToWidget;
const react_1 = __importDefault(require("react"));
const builder_1 = require("./builder");
function flattenTextChildren(children) {
    if (children === undefined || children === null || typeof children === 'boolean') {
        return '';
    }
    if ((0, builder_1.isDataBinding)(children)) {
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
function collectChildElements(children, out = []) {
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
function extractPropsAndStyle(props) {
    if (!props)
        return {};
    const { style, children, ...rest } = props;
    if (!style)
        return rest;
    const flattened = (0, builder_1.flattenStyle)(style);
    return { ...flattened, ...rest };
}
const VStack = () => null;
exports.VStack = VStack;
exports.VStack.displayName = 'VStack';
const HStack = () => null;
exports.HStack = HStack;
exports.HStack.displayName = 'HStack';
const ZStack = () => null;
exports.ZStack = ZStack;
exports.ZStack.displayName = 'ZStack';
const Grid = () => null;
exports.Grid = Grid;
exports.Grid.displayName = 'Grid';
const Text = () => null;
exports.Text = Text;
exports.Text.displayName = 'Text';
const Button = () => null;
exports.Button = Button;
exports.Button.displayName = 'Button';
const Badge = () => null;
exports.Badge = Badge;
exports.Badge.displayName = 'Badge';
const Progress = () => null;
exports.Progress = Progress;
exports.Progress.displayName = 'Progress';
const Timer = () => null;
exports.Timer = Timer;
exports.Timer.displayName = 'Timer';
const Image = () => null;
exports.Image = Image;
exports.Image.displayName = 'Image';
const Spacer = () => null;
exports.Spacer = Spacer;
exports.Spacer.displayName = 'Spacer';
const Divider = () => null;
exports.Divider = Divider;
exports.Divider.displayName = 'Divider';
const Link = () => null;
exports.Link = Link;
exports.Link.displayName = 'Link';
const Equalizer = () => null;
exports.Equalizer = Equalizer;
exports.Equalizer.displayName = 'Equalizer';
const Gauge = () => null;
exports.Gauge = Gauge;
exports.Gauge.displayName = 'Gauge';
const Chart = () => null;
exports.Chart = Chart;
exports.Chart.displayName = 'Chart';
const Toggle = () => null;
exports.Toggle = Toggle;
exports.Toggle.displayName = 'Toggle';
const Switch = () => null;
exports.Switch = Switch;
exports.Switch.displayName = 'Switch';
const Checkbox = () => null;
exports.Checkbox = Checkbox;
exports.Checkbox.displayName = 'Checkbox';
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
function renderToWidget(element) {
    if (element == null || typeof element === 'boolean') {
        return null;
    }
    if ((0, builder_1.isDataBinding)(element)) {
        return builder_1.UI.Text(element.toToken());
    }
    if (typeof element === 'string' || typeof element === 'number') {
        return builder_1.UI.Text(String(element));
    }
    if (Array.isArray(element)) {
        const children = element.map(renderToWidget).filter(Boolean);
        return builder_1.UI.VStack({}, ...children);
    }
    // Nếu bản thân đối tượng đã là một LayoutNode của builder (đã có type string)
    if (element && typeof element.type === 'string' && element.props !== undefined && !react_1.default.isValidElement(element)) {
        return element;
    }
    if (!react_1.default.isValidElement(element)) {
        return null;
    }
    const { type, props } = element;
    const restProps = extractPropsAndStyle(props);
    const children = props?.children;
    const parsedChildren = [];
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
        const compName = type.displayName || type.name;
        const isComp = (target, name) => type === target || compName === name;
        if (isComp(exports.VStack, 'VStack')) {
            return builder_1.UI.VStack(restProps, ...parsedChildren);
        }
        if (isComp(exports.HStack, 'HStack')) {
            return builder_1.UI.HStack(restProps, ...parsedChildren);
        }
        if (isComp(exports.ZStack, 'ZStack')) {
            return builder_1.UI.ZStack(restProps, ...parsedChildren);
        }
        if (isComp(exports.Grid, 'Grid')) {
            return builder_1.UI.Grid(restProps, ...parsedChildren);
        }
        if (isComp(exports.Text, 'Text')) {
            const childText = flattenTextChildren(children);
            const textContent = childText || String((0, builder_1.resolveBindingValue)(restProps.text) ?? '');
            return builder_1.UI.Text(textContent, restProps);
        }
        if (isComp(exports.Button, 'Button')) {
            const title = String((0, builder_1.resolveBindingValue)(restProps.title) || '') || flattenTextChildren(children);
            return builder_1.UI.Button({ ...restProps, title });
        }
        if (isComp(exports.Badge, 'Badge')) {
            const text = String((0, builder_1.resolveBindingValue)(restProps.text) || '') || flattenTextChildren(children);
            return builder_1.UI.Badge({ ...restProps, text });
        }
        if (isComp(exports.Progress, 'Progress')) {
            return builder_1.UI.Progress(restProps.value ?? restProps.totalDuration ?? 0, restProps);
        }
        if (isComp(exports.Timer, 'Timer')) {
            return builder_1.UI.Timer(restProps.targetTimestamp ?? Date.now(), restProps);
        }
        if (isComp(exports.Image, 'Image')) {
            return builder_1.UI.Image(restProps.url || restProps.base64 || restProps.systemName || restProps.source || '', restProps);
        }
        if (isComp(exports.Spacer, 'Spacer')) {
            return builder_1.UI.Spacer(restProps.minLength);
        }
        if (isComp(exports.Divider, 'Divider')) {
            return builder_1.UI.Divider(restProps);
        }
        if (isComp(exports.Equalizer, 'Equalizer')) {
            return builder_1.UI.Equalizer(restProps);
        }
        if (isComp(exports.Link, 'Link')) {
            return builder_1.UI.Link(restProps, ...parsedChildren);
        }
        if (isComp(exports.Gauge, 'Gauge')) {
            return builder_1.UI.Gauge(restProps.value ?? 0, restProps);
        }
        if (isComp(exports.Chart, 'Chart')) {
            return builder_1.UI.Chart(restProps.values ?? [], restProps);
        }
        if (isComp(exports.Toggle, 'Toggle') || isComp(exports.Switch, 'Switch') || isComp(exports.Checkbox, 'Checkbox')) {
            const label = restProps.label || (typeof children === 'string' ? children : '');
            const actionId = restProps.actionId || (restProps.key ? `toggle:${restProps.key}` : 'toggle:item');
            const style = isComp(exports.Switch, 'Switch') ? 'switch' : (isComp(exports.Checkbox, 'Checkbox') ? 'checkbox' : restProps.style);
            return builder_1.UI.Toggle(label, { ...restProps, actionId, style });
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
                return builder_1.UI.VStack(restProps, ...parsedChildren);
            case 'HStack':
                return builder_1.UI.HStack(restProps, ...parsedChildren);
            case 'ZStack':
                return builder_1.UI.ZStack(restProps, ...parsedChildren);
            case 'Text': {
                const textContent = flattenTextChildren(children) || String((0, builder_1.resolveBindingValue)(restProps.text) ?? '');
                return builder_1.UI.Text(textContent, restProps);
            }
            case 'Button':
                return builder_1.UI.Button({
                    ...restProps,
                    title: String((0, builder_1.resolveBindingValue)(restProps.title) || '') || flattenTextChildren(children),
                });
            case 'Badge':
                return builder_1.UI.Badge({
                    ...restProps,
                    text: String((0, builder_1.resolveBindingValue)(restProps.text) || '') || flattenTextChildren(children),
                });
            case 'Progress':
                return builder_1.UI.Progress(restProps.value ?? 0, restProps);
            case 'Image':
                return builder_1.UI.Image(restProps.url || restProps.base64 || restProps.systemName || '', restProps);
            case 'Spacer':
                return builder_1.UI.Spacer(restProps.minLength);
            case 'Divider':
                return builder_1.UI.Divider(restProps);
            case 'Toggle':
            case 'Switch':
            case 'Checkbox': {
                const label = restProps.label || (typeof children === 'string' ? children : '');
                const actionId = restProps.actionId || 'toggle:item';
                const style = type === 'Switch' ? 'switch' : (type === 'Checkbox' ? 'checkbox' : restProps.style);
                return builder_1.UI.Toggle(label, { ...restProps, actionId, style });
            }
            default:
                return null;
        }
    }
    return null;
}
//# sourceMappingURL=jsx.js.map