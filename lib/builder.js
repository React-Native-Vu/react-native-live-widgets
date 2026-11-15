"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
function isLayoutNode(item) {
    return item && typeof item === 'object' && typeof item.type === 'string';
}
function parseContainerArgs(first, rest) {
    if (!first) {
        return { props: undefined, children: [] };
    }
    if (Array.isArray(first)) {
        return { props: undefined, children: first };
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
    Text: (text, options) => ({
        type: 'Text',
        props: {
            text,
            ...options,
        },
    }),
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
    Button: (title, options) => ({
        type: 'Button',
        props: {
            title,
            ...options,
        },
    }),
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
};
//# sourceMappingURL=builder.js.map