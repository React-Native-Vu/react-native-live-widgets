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
};
//# sourceMappingURL=builder.js.map