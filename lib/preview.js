import React, { useState } from 'react';
import { View, Text as RNText, Image as RNImage, TouchableOpacity, StyleSheet, } from 'react-native';
import { renderToWidget } from './jsx';
const SIZE_DIMENSIONS = {
    small: { width: 158, height: 158, label: 'Small • 158×158' },
    medium: { width: 338, height: 158, label: 'Medium • 338×158' },
    large: { width: 338, height: 354, label: 'Large • 338×354' },
    lockScreen: { width: 350, height: 80, label: 'Lock Screen • 350×80' },
    dynamicIsland: { width: 350, height: 160, label: 'Dynamic Island' },
};
function parseDynamicColor(c) {
    if (!c)
        return undefined;
    if (typeof c === 'string')
        return c;
    if (typeof c === 'object')
        return c.dark || c.light;
    return undefined;
}
/**
 * 📱 Bộ Component xem trước tiện ích trực tiếp trong ứng dụng React Native (In-App Widget Preview).
 * Cho phép lập trình viên và người dùng trải nghiệm giao diện & bấm thử tương tác của Widget
 * ngay trong màn hình App mà không cần ra ngoài Home Screen.
 *
 * Cách dùng 1 (Truyền layout prop):
 * ```tsx
 * <WidgetPreview size="medium" layout={myLayout} onAction={(act) => alert(act)} />
 * ```
 *
 * Cách dùng 2 (Truyền JSX children trực tiếp):
 * ```tsx
 * <WidgetPreview size="medium">
 *   <VStack padding={16} backgroundColor="#0F172A" borderRadius={16}>
 *     <HStack justifyContent="spaceBetween">
 *       <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Vào ca sáng</Text>
 *       <Badge text="07:54" backgroundColor="#064E3B" textColor="#6EE7B7" />
 *     </HStack>
 *     <Button title="Làm mới" actionId="refresh" />
 *   </VStack>
 * </WidgetPreview>
 * ```
 */
export const WidgetPreview = ({ size: initialSize = 'medium', layout, children, onAction, showBadge = true, interactiveSizeSwitch = false, style, }) => {
    const [activeSize, setActiveSize] = useState(initialSize);
    // Trích xuất LayoutNode từ props hoặc JSX children
    let rootNode = null;
    if (children) {
        rootNode = renderToWidget(children);
    }
    else if (layout) {
        if (layout.type) {
            rootNode = layout;
        }
        else {
            const pageConfig = layout;
            rootNode =
                pageConfig[activeSize] ||
                    pageConfig.medium ||
                    pageConfig.large ||
                    pageConfig.small ||
                    pageConfig.accessoryRectangular ||
                    null;
        }
    }
    const dim = SIZE_DIMENSIONS[activeSize];
    return (React.createElement(View, { style: [styles.container, style] },
        interactiveSizeSwitch && (React.createElement(View, { style: styles.tabBar }, ['small', 'medium', 'large'].map((s) => (React.createElement(TouchableOpacity, { key: s, onPress: () => setActiveSize(s), style: [styles.tabItem, activeSize === s && styles.tabItemActive] },
            React.createElement(RNText, { style: [styles.tabText, activeSize === s && styles.tabTextActive] }, s.toUpperCase())))))),
        showBadge && (React.createElement(View, { style: styles.badgeRow },
            React.createElement(View, { style: styles.specBadge },
                React.createElement(RNText, { style: styles.specBadgeText }, dim.label)))),
        React.createElement(View, { style: [
                styles.widgetFrame,
                {
                    width: dim.width,
                    height: dim.height,
                },
            ] }, rootNode ? (renderPreviewNode(rootNode, onAction)) : (React.createElement(View, { style: styles.emptyContainer },
            React.createElement(RNText, { style: styles.emptyText }, "Ch\u01B0a c\u00F3 c\u1EA5u h\u00ECnh layout cho size n\u00E0y"))))));
};
/** Alias tương thích */
export const VoltraWidgetPreview = WidgetPreview;
// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────
function renderPreviewNode(node, onAction) {
    if (!node)
        return null;
    switch (node.type) {
        case 'VStack': {
            const vnode = node;
            const p = vnode.props || {};
            const containerStyle = {
                flexDirection: 'column',
                padding: p.padding ?? (p.paddingHorizontal || p.paddingVertical ? undefined : 0),
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing'
                        ? 'flex-end'
                        : 'flex-start',
                justifyContent: p.justifyContent === 'center'
                    ? 'center'
                    : p.justifyContent === 'spaceBetween'
                        ? 'space-between'
                        : p.justifyContent === 'flexEnd'
                            ? 'flex-end'
                            : 'flex-start',
                width: '100%',
                height: '100%',
            };
            return (React.createElement(View, { style: containerStyle }, vnode.children?.map((child, idx) => (React.createElement(React.Fragment, { key: idx }, renderPreviewNode(child, onAction))))));
        }
        case 'HStack': {
            const hnode = node;
            const p = hnode.props || {};
            const containerStyle = {
                flexDirection: 'row',
                padding: p.padding,
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing'
                        ? 'flex-end'
                        : 'flex-start',
                justifyContent: p.justifyContent === 'center'
                    ? 'center'
                    : p.justifyContent === 'spaceBetween'
                        ? 'space-between'
                        : p.justifyContent === 'flexEnd'
                            ? 'flex-end'
                            : 'flex-start',
                width: '100%',
            };
            return (React.createElement(View, { style: containerStyle }, hnode.children?.map((child, idx) => (React.createElement(React.Fragment, { key: idx }, renderPreviewNode(child, onAction))))));
        }
        case 'Text': {
            const tnode = node;
            const p = tnode.props || {};
            const textStyle = {
                color: parseDynamicColor(p.color) || '#FFFFFF',
                fontSize: p.fontSize ?? 14,
                fontWeight: p.fontWeight === 'bold' || p.fontWeight === 'heavy'
                    ? 'bold'
                    : p.fontWeight === 'semibold'
                        ? '600'
                        : p.fontWeight === 'medium'
                            ? '500'
                            : 'normal',
            };
            return (React.createElement(RNText, { numberOfLines: p.numberOfLines, style: textStyle }, p.text));
        }
        case 'Button': {
            const bnode = node;
            const p = bnode.props;
            const btnStyle = {
                backgroundColor: parseDynamicColor(p.backgroundColor) || '#2563EB',
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 8,
                paddingHorizontal: p.paddingHorizontal ?? p.padding ?? 12,
                paddingVertical: p.paddingVertical ?? p.padding ?? 6,
                alignItems: 'center',
                justifyContent: 'center',
                width: p.fullWidth ? '100%' : undefined,
            };
            const textStyle = {
                color: parseDynamicColor(p.textColor) || '#FFFFFF',
                fontSize: p.fontSize ?? 12,
                fontWeight: p.fontWeight ?? '600',
            };
            return (React.createElement(TouchableOpacity, { activeOpacity: 0.7, onPress: () => {
                    if (p.actionId && onAction) {
                        onAction(p.actionId);
                    }
                }, style: btnStyle },
                React.createElement(RNText, { style: textStyle }, p.title)));
        }
        case 'Badge': {
            const bnode = node;
            const p = bnode.props;
            return (React.createElement(View, { style: {
                    backgroundColor: p.backgroundColor || '#064E3B',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 6,
                    paddingHorizontal: p.paddingHorizontal ?? 6,
                    paddingVertical: p.paddingVertical ?? 2,
                } },
                React.createElement(RNText, { style: {
                        color: p.textColor || '#6EE7B7',
                        fontSize: p.fontSize ?? 10,
                        fontWeight: '600',
                    } }, p.text)));
        }
        case 'Progress': {
            const pnode = node;
            const p = pnode.props || {};
            const val = Math.max(0, Math.min(1, p.value ?? 0.5));
            const height = p.height ?? 6;
            const tint = parseDynamicColor(p.tintColor) || '#2563EB';
            const track = parseDynamicColor(p.trackColor) || '#334155';
            if (p.style === 'segmented' && (p.segments ?? 4) > 1) {
                const segs = p.segments ?? 4;
                const filled = Math.round(val * segs);
                return (React.createElement(View, { style: { flexDirection: 'row', gap: 4, width: '100%', height } }, Array.from({ length: segs }).map((_, idx) => (React.createElement(View, { key: idx, style: {
                        flex: 1,
                        height,
                        backgroundColor: idx < filled ? tint : track,
                        borderRadius: height / 2,
                    } })))));
            }
            return (React.createElement(View, { style: { width: '100%', height, backgroundColor: track, borderRadius: height / 2 } },
                React.createElement(View, { style: {
                        width: `${val * 100}%`,
                        height,
                        backgroundColor: tint,
                        borderRadius: height / 2,
                    } })));
        }
        case 'Timer': {
            const tnode = node;
            const p = tnode.props || {};
            return (React.createElement(RNText, { style: { color: p.color || '#2563EB', fontSize: p.fontSize ?? 14, fontWeight: 'bold' } },
                p.prefix || '',
                "1:29:55",
                p.suffix || ''));
        }
        case 'Image': {
            const inode = node;
            const p = inode.props || {};
            const width = p.width ?? 32;
            const height = p.height ?? 32;
            const uri = p.url || (p.base64 ? `data:image/png;base64,${p.base64}` : null);
            if (uri) {
                return (React.createElement(RNImage, { source: { uri }, style: {
                        width,
                        height,
                        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                    } }));
            }
            return (React.createElement(View, { style: {
                    width,
                    height,
                    backgroundColor: '#334155',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                } },
                React.createElement(RNText, { style: { color: '#94A3B8', fontSize: 10 } }, "IMG")));
        }
        case 'Spacer': {
            return React.createElement(View, { style: { flex: 1 } });
        }
        case 'Divider': {
            return React.createElement(View, { style: { width: '100%', height: 1, backgroundColor: '#334155' } });
        }
        default:
            return null;
    }
}
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 12,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 3,
        marginBottom: 8,
    },
    tabItem: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tabItemActive: {
        backgroundColor: '#2563EB',
    },
    tabText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: 'bold',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    badgeRow: {
        marginBottom: 6,
    },
    specBadge: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    specBadgeText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
    },
    widgetFrame: {
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    emptyText: {
        color: '#64748B',
        fontSize: 12,
        textAlign: 'center',
    },
});
//# sourceMappingURL=preview.js.map