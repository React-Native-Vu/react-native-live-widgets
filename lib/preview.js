import React, { useState } from 'react';
import { View, Text as RNText, Image as RNImage, TouchableOpacity, StyleSheet, } from 'react-native';
import { renderToWidget, extractPropsAndStyle } from './jsx';
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
    let rawTarget = null;
    if (children) {
        rawTarget = children;
    }
    else if (layout) {
        if (React.isValidElement(layout) || layout?.$$typeof) {
            rawTarget = layout;
        }
        else if (layout.type && typeof layout.type === 'string' && layout.props !== undefined) {
            rawTarget = layout;
        }
        else {
            const pageConfig = layout;
            rawTarget =
                pageConfig[activeSize] ||
                    pageConfig.medium ||
                    pageConfig.large ||
                    pageConfig.small ||
                    pageConfig.accessoryRectangular ||
                    null;
        }
    }
    if (rawTarget) {
        if (React.isValidElement(rawTarget) || rawTarget?.$$typeof || typeof rawTarget?.type === 'function') {
            rootNode = renderToWidget(rawTarget);
        }
        else {
            rootNode = rawTarget;
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
            ] }, rootNode ? (renderPreviewNode(rootNode, onAction, true, 'column')) : (React.createElement(View, { style: styles.emptyContainer },
            React.createElement(RNText, { style: styles.emptyText },
                "Ch\u01B0a c\u00F3 c\u1EA5u h\u00ECnh layout cho k\u00EDch th\u01B0\u1EDBc ",
                activeSize))))));
};
/** Alias tương thích */
export const VoltraWidgetPreview = WidgetPreview;
// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────
function renderPreviewNode(node, onAction, isRoot = false, parentDirection = 'column') {
    if (!node)
        return null;
    if (React.isValidElement(node) || node?.$$typeof || typeof node?.type === 'function') {
        const converted = renderToWidget(node);
        if (!converted)
            return null;
        return renderPreviewNode(converted, onAction, isRoot, parentDirection);
    }
    switch (node.type) {
        case 'VStack': {
            const vnode = node;
            const p = extractPropsAndStyle(vnode.props);
            const containerStyle = {
                flexDirection: 'column',
                padding: p.padding ?? (p.paddingHorizontal || p.paddingVertical ? undefined : 0),
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                rowGap: p.spacing ?? 0,
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing'
                        ? 'flex-end'
                        : 'flex-start',
                justifyContent: p.justifyContent === 'center'
                    ? 'center'
                    : p.justifyContent === 'spaceBetween'
                        ? 'space-between'
                        : p.justifyContent === 'spaceAround'
                            ? 'space-around'
                            : p.justifyContent === 'flexEnd'
                                ? 'flex-end'
                                : 'flex-start',
            };
            if (isRoot) {
                containerStyle.width = '100%';
                containerStyle.height = '100%';
                containerStyle.flex = 1;
            }
            else if (parentDirection === 'row') {
                if (p.flex !== undefined) {
                    containerStyle.flex = p.flex;
                }
            }
            else {
                containerStyle.alignSelf = 'stretch';
            }
            return (React.createElement(View, { style: containerStyle }, vnode.children?.map((child, idx) => (React.createElement(React.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, 'column'))))));
        }
        case 'HStack': {
            const hnode = node;
            const p = extractPropsAndStyle(hnode.props);
            const containerStyle = {
                flexDirection: 'row',
                padding: p.padding,
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                columnGap: p.spacing ?? 0,
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing'
                        ? 'flex-end'
                        : p.alignment === 'top'
                            ? 'flex-start'
                            : 'center',
                justifyContent: p.justifyContent === 'center'
                    ? 'center'
                    : p.justifyContent === 'spaceBetween'
                        ? 'space-between'
                        : p.justifyContent === 'spaceAround'
                            ? 'space-around'
                            : p.justifyContent === 'flexEnd'
                                ? 'flex-end'
                                : 'flex-start',
            };
            if (isRoot) {
                containerStyle.width = '100%';
                containerStyle.height = '100%';
            }
            else if (parentDirection === 'column') {
                containerStyle.alignSelf = 'stretch';
            }
            else if (p.flex !== undefined) {
                containerStyle.flex = p.flex;
            }
            return (React.createElement(View, { style: containerStyle }, hnode.children?.map((child, idx) => (React.createElement(React.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, 'row'))))));
        }
        case 'ZStack': {
            const znode = node;
            const p = extractPropsAndStyle(znode.props);
            return (React.createElement(View, { style: {
                    position: 'relative',
                    width: isRoot ? '100%' : undefined,
                    height: isRoot ? '100%' : undefined,
                    alignSelf: isRoot ? undefined : 'stretch',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                } }, znode.children?.map((child, idx) => (React.createElement(View, { key: idx, style: idx === 0
                    ? { width: '100%', height: '100%' }
                    : { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' } }, renderPreviewNode(child, onAction, false, parentDirection))))));
        }
        case 'Grid': {
            const gnode = node;
            const p = extractPropsAndStyle(gnode.props);
            const cols = p.columns ?? 2;
            return (React.createElement(View, { style: {
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: p.spacing ?? 6,
                    width: '100%',
                    alignSelf: 'stretch',
                } }, gnode.children?.map((child, idx) => (React.createElement(View, { key: idx, style: { flexBasis: `${Math.floor(100 / cols) - 3}%` } }, renderPreviewNode(child, onAction, false, 'column'))))));
        }
        case 'Text': {
            const tnode = node;
            const p = extractPropsAndStyle(tnode.props);
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
                textAlign: p.textAlign ?? 'left',
            };
            return (React.createElement(RNText, { numberOfLines: p.numberOfLines, style: [
                    textStyle,
                    parentDirection === 'row' ? { flexShrink: 1 } : undefined,
                ] }, p.text));
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
                alignSelf: p.fullWidth ? 'stretch' : 'auto',
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
                React.createElement(RNText, { numberOfLines: 1, style: textStyle }, p.title)));
        }
        case 'Badge': {
            const bnode = node;
            const p = bnode.props;
            return (React.createElement(View, { style: {
                    backgroundColor: parseDynamicColor(p.backgroundColor) || '#064E3B',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 6,
                    paddingHorizontal: p.paddingHorizontal ?? 6,
                    paddingVertical: p.paddingVertical ?? 2,
                    flexShrink: 0,
                    alignSelf: 'center',
                } },
                React.createElement(RNText, { numberOfLines: 1, style: {
                        color: parseDynamicColor(p.textColor) || '#6EE7B7',
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
                return (React.createElement(View, { style: { flexDirection: 'row', gap: 4, width: '100%', height, alignSelf: 'stretch' } }, Array.from({ length: segs }).map((_, idx) => (React.createElement(View, { key: idx, style: {
                        flex: 1,
                        height,
                        backgroundColor: idx < filled ? tint : track,
                        borderRadius: height / 2,
                    } })))));
            }
            return (React.createElement(View, { style: { width: '100%', height, backgroundColor: track, borderRadius: height / 2, alignSelf: 'stretch' } },
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
            return (React.createElement(RNText, { style: [
                    { color: parseDynamicColor(p.color) || '#2563EB', fontSize: p.fontSize ?? 14, fontWeight: 'bold' },
                    parentDirection === 'row' ? { flexShrink: 0 } : undefined,
                ] },
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
            const snode = node;
            const p = snode.props || {};
            const minLen = p?.minLength ?? 4;
            return (React.createElement(View, { style: parentDirection === 'row'
                    ? { minWidth: minLen, flex: 1 }
                    : { minHeight: minLen, flex: 1 } }));
        }
        case 'Divider': {
            const p = node.props || {};
            const color = parseDynamicColor(p.color) || '#334155';
            return (React.createElement(View, { style: parentDirection === 'row'
                    ? { width: 1, height: '100%', backgroundColor: color }
                    : { width: '100%', height: 1, backgroundColor: color, alignSelf: 'stretch' } }));
        }
        case 'Link': {
            const lnode = node;
            const p = lnode.props || {};
            return (React.createElement(TouchableOpacity, { activeOpacity: 0.7, onPress: () => {
                    if (p.url && onAction)
                        onAction(p.url);
                }, style: { flexDirection: 'row', alignItems: 'center' } }, lnode.children?.map((child, idx) => (React.createElement(React.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, parentDirection))))));
        }
        case 'Equalizer': {
            const enode = node;
            const p = enode.props || {};
            const tint = parseDynamicColor(p.color) || '#38BDF8';
            return (React.createElement(View, { style: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 16 } }, [12, 16, 8, 14].map((h, i) => (React.createElement(View, { key: i, style: { width: 3, height: h, backgroundColor: tint, borderRadius: 1.5 } })))));
        }
        case 'Gauge': {
            const gnode = node;
            const p = gnode.props || {};
            const val = Math.round((p.value ?? 0.75) * 100);
            const tint = parseDynamicColor(p.tintColor) || '#10B981';
            return (React.createElement(View, { style: { alignItems: 'center', justifyContent: 'center' } },
                React.createElement(RNText, { style: { color: tint, fontSize: 13, fontWeight: 'bold' } },
                    val,
                    "%")));
        }
        case 'Chart': {
            const cnode = node;
            const p = cnode.props || {};
            const values = Array.isArray(p.values) ? p.values : [20, 45, 60, 80, 50];
            const maxVal = Math.max(...values, 1);
            const tint = parseDynamicColor(p.color) || '#38BDF8';
            return (React.createElement(View, { style: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, width: '100%', alignSelf: 'stretch' } }, values.map((v, i) => (React.createElement(View, { key: i, style: {
                    flex: 1,
                    height: `${Math.max(15, (v / maxVal) * 100)}%`,
                    backgroundColor: tint,
                    borderRadius: 2,
                } })))));
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