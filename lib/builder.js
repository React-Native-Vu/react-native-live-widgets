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
function parseContainerArgs(first, rest) {
    if (!first) {
        return { props: undefined, children: [] };
    }
    if (Array.isArray(first)) {
        if (first.length > 0 && isLayoutNode(first[0])) {
            return { props: undefined, children: first };
        }
        const flattened = flattenStyle(first);
        return { props: flattened, children: rest || [] };
    }
    if (isLayoutNode(first)) {
        return { props: undefined, children: [first, ...(rest || [])] };
    }
    return { props: first, children: rest || [] };
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
            props: {
                text,
                ...(merged || {}),
            },
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
    Image: (urlOrOptions, options) => {
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
    Spacer: (minLength) => ({
        type: 'Spacer',
        props: { minLength },
    }),
    Button: (titleOrProps, options) => {
        if (typeof titleOrProps === 'object' && titleOrProps !== null) {
            if (titleOrProps.onPress && !titleOrProps.actionId) {
                autoActionCounter += 1;
                titleOrProps.actionId = `act_${Date.now()}_${autoActionCounter}`;
                (0, dispatcher_1.registerAction)(titleOrProps.actionId, titleOrProps.onPress);
            }
            else if (titleOrProps.onPress && titleOrProps.actionId) {
                (0, dispatcher_1.registerAction)(titleOrProps.actionId, titleOrProps.onPress);
            }
            return {
                type: 'Button',
                props: titleOrProps,
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
            props: {
                title: titleOrProps,
                ...options,
                actionId: finalActionId,
            },
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
};
//# sourceMappingURL=builder.js.map