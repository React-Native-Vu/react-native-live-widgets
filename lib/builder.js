"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = exports.StyleSheet = void 0;
exports.flattenStyle = flattenStyle;
const dispatcher_1 = require("./dispatcher");
let autoActionCounter = 0;
function flattenStyle(...styles) {
    let merged = undefined;
    function walk(item) {
        if (!item)
            return;
        if (Array.isArray(item)) {
            for (const sub of item)
                walk(sub);
        }
        else if (typeof item === 'object') {
            if (!merged)
                merged = {};
            Object.assign(merged, item);
        }
    }
    for (const s of styles) {
        walk(s);
    }
    return merged;
}
exports.StyleSheet = {
    create: (styles) => styles,
    flatten: flattenStyle,
};
function isLayoutNode(item) {
    return item && typeof item === 'object' && typeof item.type === 'string';
}
const TYPOGRAPHY_DEFAULTS = {
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
function normalizeProps(props) {
    if (!props)
        return undefined;
    const p = { ...props };
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
        if (p.fontSize === undefined)
            p.fontSize = typo.fontSize;
        if (p.fontWeight === undefined)
            p.fontWeight = typo.fontWeight;
    }
    // Trợ năng / Accessibility Semantics Fallback (Phase 1):
    if (p.accessible === undefined) {
        if (p.text !== undefined || p.title !== undefined || p.actionId !== undefined) {
            p.accessible = true;
        }
    }
    if (p.accessibilityLabel === undefined) {
        if (p.text !== undefined)
            p.accessibilityLabel = String(p.text);
        else if (p.title !== undefined)
            p.accessibilityLabel = String(p.title);
    }
    if (p.accessibilityRole === undefined) {
        if (p.title !== undefined || p.actionId !== undefined) {
            p.accessibilityRole = 'button';
        }
        else if (p.typography && (p.typography.startsWith('title') || p.typography === 'largeTitle' || p.typography === 'headline')) {
            p.accessibilityRole = 'header';
        }
    }
    return p;
}
function parseContainerArgs(first, rest) {
    if (!first) {
        return { props: undefined, children: [] };
    }
    if (Array.isArray(first)) {
        if (first.length > 0 && isLayoutNode(first[0])) {
            return { props: undefined, children: first };
        }
        const flattened = flattenStyle(first);
        return { props: normalizeProps(flattened), children: rest || [] };
    }
    if (isLayoutNode(first)) {
        return { props: undefined, children: [first, ...(rest || [])] };
    }
    return { props: normalizeProps(first), children: rest || [] };
}
/**
 * Các hàm helper tạo node cây giao diện trực quan cho TypeScript/JavaScript
 */
exports.UI = {
    StyleSheet: exports.StyleSheet,
    VStack: (propsOrChildren, ...children) => {
        const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
        return {
            type: 'VStack',
            props,
            children: parsedChildren,
        };
    },
    HStack: (propsOrChildren, ...children) => {
        const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
        return {
            type: 'HStack',
            props,
            children: parsedChildren,
        };
    },
    Text: (text, ...styles) => {
        const merged = flattenStyle(...styles);
        return {
            type: 'Text',
            props: normalizeProps({
                text,
                ...(merged || {}),
            }),
        };
    },
    Timer: (targetTimestamp, options) => ({
        type: 'Timer',
        props: {
            targetTimestamp,
            mode: options?.mode ?? 'countdown',
            ...options,
        },
    }),
    Progress: (valueOrOptions, options) => {
        if (typeof valueOrOptions === 'number') {
            return {
                type: 'Progress',
                props: normalizeProps({
                    value: valueOrOptions,
                    ...options,
                }),
            };
        }
        return {
            type: 'Progress',
            props: normalizeProps(valueOrOptions),
        };
    },
    Image: (urlOrOptions, options) => {
        if (typeof urlOrOptions === 'string') {
            const isHttp = urlOrOptions.startsWith('http://') || urlOrOptions.startsWith('https://');
            const isBase64 = urlOrOptions.startsWith('data:image/');
            return {
                type: 'Image',
                props: normalizeProps({
                    ...(isHttp
                        ? { url: urlOrOptions }
                        : isBase64
                            ? { base64: urlOrOptions }
                            : { systemName: urlOrOptions }),
                    ...options,
                }),
            };
        }
        return {
            type: 'Image',
            props: normalizeProps(urlOrOptions),
        };
    },
    Spacer: (minLength) => ({
        type: 'Spacer',
        props: { minLength },
    }),
    Button: (titleOrProps, options) => {
        if (typeof titleOrProps === 'object' && titleOrProps !== null) {
            const normalized = normalizeProps(titleOrProps);
            if (normalized.onPress && !normalized.actionId) {
                autoActionCounter += 1;
                normalized.actionId = `act_${Date.now()}_${autoActionCounter}`;
                (0, dispatcher_1.registerAction)(normalized.actionId, normalized.onPress);
            }
            else if (normalized.onPress && normalized.actionId) {
                (0, dispatcher_1.registerAction)(normalized.actionId, normalized.onPress);
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
            (0, dispatcher_1.registerAction)(finalActionId, options.onPress);
        }
        return {
            type: 'Button',
            props: normalizeProps({
                title: titleOrProps,
                ...options,
                actionId: finalActionId,
            }),
        };
    },
    /**
     * Tạo nút bấm kèm logic hàm TypeScript trực tiếp.
     * Thư viện tự động sinh ActionId và kết nối bộ lắng nghe Native -> hàm async TypeScript của bạn!
     */
    ActionButton: (title, onPress, options) => {
        autoActionCounter += 1;
        const actionId = `act_${Date.now()}_${autoActionCounter}`;
        (0, dispatcher_1.registerAction)(actionId, onPress);
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
    ZStack: (propsOrChildren, ...children) => {
        const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
        return {
            type: 'ZStack',
            props: props,
            children: parsedChildren,
        };
    },
    Grid: (propsOrChildren, ...children) => {
        const { props, children: parsedChildren } = parseContainerArgs(propsOrChildren, children);
        return {
            type: 'Grid',
            props: props,
            children: parsedChildren,
        };
    },
    Divider: (options) => ({
        type: 'Divider',
        props: options,
    }),
    Gauge: (valueOrOptions, options) => {
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
    Chart: (valuesOrOptions, options) => {
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
    Toggle: (labelOrOptions, options) => {
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
    Badge: (textOrOptions, options) => {
        if (typeof textOrOptions === 'string') {
            return {
                type: 'Badge',
                props: normalizeProps({
                    text: textOrOptions,
                    ...options,
                }),
            };
        }
        return {
            type: 'Badge',
            props: normalizeProps(textOrOptions),
        };
    },
    Link: (props, ...children) => ({
        type: 'Link',
        props,
        children,
    }),
    /**
     * Khởi tạo một Component Native tùy chỉnh đã được đăng ký qua:
     * - iOS (Swift): `DynamicNodeRegistry.shared.register("MyComponent") { node in ... }`
     * - Android (Kotlin): `DynamicNodeRegistry.register("MyComponent", ...)`
     */
    Custom: (componentName, props, ...children) => ({
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
    Equalizer: (options) => ({
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
    ControlButton: (options) => buildControlConfig('button', options),
    /**
     * Cấu hình Control Toggle 2 trạng thái cho iOS 18+ Control Center & Android Quick Settings Tile.
     */
    ControlToggle: (options) => buildControlConfig('toggle', options),
};
function buildControlConfig(type, options) {
    const { onPress, actionId, ...rest } = options;
    let resolvedActionId = actionId;
    if (!resolvedActionId) {
        autoActionCounter += 1;
        resolvedActionId =
            type === 'toggle'
                ? `toggle:control_${Date.now()}_${autoActionCounter}`
                : `control_${Date.now()}_${autoActionCounter}`;
    }
    else if (type === 'toggle' && !resolvedActionId.startsWith('toggle:')) {
        resolvedActionId = `toggle:${resolvedActionId}`;
    }
    if (onPress) {
        (0, dispatcher_1.registerAction)(resolvedActionId, onPress);
    }
    return {
        ...rest,
        type,
        actionId: resolvedActionId,
    };
}
//# sourceMappingURL=builder.js.map