"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoltraWidgetPreview = exports.WidgetPreview = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const jsx_1 = require("./jsx");
const dispatcher_1 = require("./dispatcher");
const SIZE_DIMENSIONS = {
    small: { width: 158, height: 158, label: 'Small • 158×158' },
    medium: { width: 338, height: 158, label: 'Medium • 338×158' },
    large: { width: 338, height: 354, label: 'Large • 338×354' },
    extraLarge: { width: 338, height: 420, label: 'Extra Large • 338×420' },
    standBy: { width: 310, height: 158, label: 'StandBy • 310×158' },
    lockScreen: { width: 350, height: 80, label: 'Lock Screen • 350×80' },
    dynamicIsland: { width: 350, height: 160, label: 'Dynamic Island' },
};
function parseDynamicColor(c, mode = 'dark') {
    if (!c)
        return undefined;
    if (typeof c === 'string')
        return c;
    if (typeof c === 'object') {
        if (mode === 'tinted' && c.tinted)
            return c.tinted;
        if (mode === 'light' && c.light)
            return c.light;
        return c.dark || c.light || c.tinted;
    }
    return undefined;
}
function extractShadowStyle(p) {
    if (!p)
        return {};
    const shadowColor = parseDynamicColor(p.shadowColor);
    if (!shadowColor)
        return {};
    const rad = p.shadowRadius ?? 4;
    return {
        shadowColor,
        shadowOffset: p.shadowOffset
            ? { width: p.shadowOffset.x ?? 0, height: p.shadowOffset.y ?? 2 }
            : { width: 0, height: 2 },
        shadowOpacity: p.shadowOpacity ?? 0.35,
        shadowRadius: rad,
        elevation: Math.min(8, Math.max(1, Math.round(rad))),
    };
}
const WidgetPreview = ({ size: initialSize = 'medium', layout, children, onAction, showBadge = true, interactiveSizeSwitch = false, style, }) => {
    const [activeSize, setActiveSize] = (0, react_1.useState)(initialSize);
    const pageConfigObj = !children && layout && typeof layout === 'object' && layout.pages
        ? layout
        : null;
    const pageOrder = pageConfigObj
        ? Array.isArray(pageConfigObj.pageOrder) && pageConfigObj.pageOrder.length > 0
            ? pageConfigObj.pageOrder
            : Object.keys(pageConfigObj.pages)
        : [];
    const defaultPage = pageConfigObj
        ? pageConfigObj.initialPage || pageOrder[0] || ''
        : '';
    const [activePage, setActivePage] = (0, react_1.useState)(defaultPage);
    const [syncVars, setSyncVars] = (0, react_1.useState)(() => ({
        _lastSyncTime: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        id: '2026',
        title: 'Hoàn thành kế hoạch quý 4',
    }));
    (0, react_1.useEffect)(() => {
        if (defaultPage) {
            setActivePage((prev) => (pageConfigObj?.pages?.[prev] ? prev : defaultPage));
        }
    }, [defaultPage, pageConfigObj]);
    // Trích xuất LayoutNode từ props hoặc JSX children
    let rootNode = null;
    let rawTarget = null;
    const currentPageKey = pageConfigObj && pageConfigObj.pages
        ? pageConfigObj.pages[activePage]
            ? activePage
            : defaultPage
        : '';
    if (children) {
        rawTarget = children;
    }
    else if (layout) {
        if (react_1.default.isValidElement(layout) || layout?.$$typeof) {
            rawTarget = layout;
        }
        else if (layout.type && typeof layout.type === 'string' && layout.props !== undefined) {
            rawTarget = layout;
        }
        else {
            const pageConfig = pageConfigObj && currentPageKey
                ? pageConfigObj.pages[currentPageKey] || {}
                : layout;
            const primary = pageConfig?.[activeSize];
            if (primary) {
                rawTarget = primary;
            }
            else if (activeSize === 'extraLarge') {
                rawTarget = pageConfig?.large || pageConfig?.medium || pageConfig?.small || null;
            }
            else if (activeSize === 'standBy') {
                rawTarget = pageConfig?.small || pageConfig?.medium || pageConfig?.large || null;
            }
            else {
                rawTarget =
                    pageConfig?.medium ||
                        pageConfig?.large ||
                        pageConfig?.small ||
                        pageConfig?.accessoryRectangular ||
                        null;
            }
        }
    }
    const handlePreviewAction = (actionId) => {
        if (actionId.startsWith('page:') && pageConfigObj && pageOrder.length > 0) {
            const target = actionId.slice('page:'.length);
            if (target === 'next') {
                const idx = pageOrder.indexOf(currentPageKey);
                const nextPage = idx >= 0 ? pageOrder[(idx + 1) % pageOrder.length] : pageOrder[0];
                setActivePage(nextPage);
            }
            else if (target === 'prev') {
                const idx = pageOrder.indexOf(currentPageKey);
                const prevPage = idx >= 0 ? pageOrder[(idx - 1 + pageOrder.length) % pageOrder.length] : pageOrder[0];
                setActivePage(prevPage);
            }
            else if (pageConfigObj.pages[target]) {
                setActivePage(target);
            }
        }
        else if (actionId === 'refresh' || actionId.startsWith('refresh:')) {
            const nowTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
            const sampleNotes = [
                'Đồng bộ báo cáo tiến độ OKRs',
                'Kiểm tra chấm công ca hành chính',
                'Rà soát task Sprint tuần này',
                'Cập nhật số liệu Realtime API',
            ];
            const nextId = String(Math.floor(Math.random() * 90) + 10);
            setSyncVars({
                _lastSyncTime: nowTime,
                id: nextId,
                title: sampleNotes[Number(nextId) % sampleNotes.length],
            });
        }
        if (onAction) {
            onAction(actionId);
        }
    };
    if (rawTarget) {
        if (react_1.default.isValidElement(rawTarget) || rawTarget?.$$typeof || typeof rawTarget?.type === 'function') {
            rootNode = (0, jsx_1.renderToWidget)(rawTarget);
        }
        else {
            rootNode = rawTarget;
        }
    }
    const dim = SIZE_DIMENSIONS[activeSize || 'medium'] || SIZE_DIMENSIONS.medium;
    const switchSizes = ['small', 'medium', 'large'];
    const anyLayout = layout;
    if (initialSize === 'extraLarge' ||
        anyLayout?.extraLarge ||
        (currentPageKey && pageConfigObj?.pages?.[currentPageKey]?.extraLarge)) {
        switchSizes.push('extraLarge');
    }
    if (initialSize === 'standBy' ||
        anyLayout?.standBy ||
        (currentPageKey && pageConfigObj?.pages?.[currentPageKey]?.standBy)) {
        switchSizes.push('standBy');
    }
    return (react_1.default.createElement(react_native_1.View, { style: [styles.container, style] },
        interactiveSizeSwitch && (react_1.default.createElement(react_native_1.View, { style: styles.tabBar }, switchSizes.map((s) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: s, onPress: () => setActiveSize(s), style: [styles.tabItem, activeSize === s && styles.tabItemActive] },
            react_1.default.createElement(react_native_1.Text, { style: [styles.tabText, activeSize === s && styles.tabTextActive] }, s === 'extraLarge' ? 'XLARGE' : s.toUpperCase())))))),
        showBadge && (react_1.default.createElement(react_native_1.View, { style: styles.badgeRow },
            react_1.default.createElement(react_native_1.View, { style: styles.specBadge },
                react_1.default.createElement(react_native_1.Text, { style: styles.specBadgeText }, dim.label)))),
        react_1.default.createElement(react_native_1.View, { style: [
                styles.widgetFrame,
                {
                    width: dim.width,
                    height: dim.height,
                },
            ] }, rootNode ? (renderPreviewNode(rootNode, handlePreviewAction, true, 'column', syncVars)) : (react_1.default.createElement(react_native_1.View, { style: styles.emptyContainer },
            react_1.default.createElement(react_native_1.Text, { style: styles.emptyText },
                "Ch\u01B0a c\u00F3 c\u1EA5u h\u00ECnh layout cho k\u00EDch th\u01B0\u1EDBc ",
                activeSize))))));
};
exports.WidgetPreview = WidgetPreview;
/** Alias tương thích */
exports.VoltraWidgetPreview = exports.WidgetPreview;
// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────
const PreviewToggleItem = ({ node, onAction }) => {
    const p = node.props || {};
    const [isChecked, setIsChecked] = (0, react_1.useState)(!!p.checked || !!p.isChecked);
    const tint = parseDynamicColor(p.tintColor) || '#38BDF8';
    const isSwitch = p.style === 'switch';
    const handlePress = () => {
        const nextVal = !isChecked;
        setIsChecked(nextVal);
        if (p.actionId) {
            if (onAction) {
                onAction(p.actionId);
            }
            const registered = dispatcher_1.actionHandlers.get(p.actionId);
            if (registered) {
                try {
                    registered({ actionId: p.actionId, isChecked: nextVal });
                }
                catch (e) {
                    console.warn(`[WidgetPreview] Action '${p.actionId}' error:`, e);
                }
            }
            for (const globalHandler of dispatcher_1.globalActionHandlers) {
                try {
                    globalHandler(p.actionId, { isChecked: nextVal });
                }
                catch (e) {
                    console.warn(`[WidgetPreview] Global action handler error:`, e);
                }
            }
        }
    };
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { accessible: p.accessible !== false, accessibilityLabel: p.accessibilityLabel || p.label, accessibilityHint: p.accessibilityHint, accessibilityRole: "switch", accessibilityValue: { text: isChecked ? 'Đã chọn' : 'Chưa chọn' }, activeOpacity: 0.7, onPress: handlePress, style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 6,
            paddingHorizontal: 2,
            width: '100%',
            alignSelf: 'stretch',
        } },
        isSwitch ? (react_1.default.createElement(react_native_1.View, { style: {
                width: 34,
                height: 20,
                borderRadius: 10,
                backgroundColor: isChecked ? tint : '#475569',
                justifyContent: 'center',
                paddingHorizontal: 3,
            } },
            react_1.default.createElement(react_native_1.View, { style: {
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#FFFFFF',
                    alignSelf: isChecked ? 'flex-end' : 'flex-start',
                } }))) : (react_1.default.createElement(react_native_1.View, { style: {
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: isChecked ? tint : '#64748B',
                backgroundColor: isChecked ? tint : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
            } }, isChecked && (react_1.default.createElement(react_native_1.Text, { style: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' } }, "\u2713")))),
        react_1.default.createElement(react_native_1.Text, { style: {
                flex: 1,
                color: isChecked && p.strikethroughOnCheck
                    ? '#64748B'
                    : parseDynamicColor(p.textColor) || '#F8FAFC',
                fontSize: p.fontSize ?? 13,
                textDecorationLine: isChecked && p.strikethroughOnCheck ? 'line-through' : 'none',
            } }, p.label)));
};
const PreviewTimerText = ({ nodeProps: p, parentDirection }) => {
    const formatRemaining = () => {
        const target = Number(p.targetTimestamp ?? 0);
        if (!target)
            return '00:00';
        const diff = Math.max(0, Math.round(Math.abs(target - Date.now() / 1000)));
        const hrs = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
        return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    };
    const [display, setDisplay] = (0, react_1.useState)(formatRemaining);
    (0, react_1.useEffect)(() => {
        setDisplay(formatRemaining());
        const id = setInterval(() => {
            setDisplay(formatRemaining());
        }, 1000);
        return () => clearInterval(id);
    }, [p.targetTimestamp, p.mode]);
    return (react_1.default.createElement(react_native_1.Text, { style: [
            { color: parseDynamicColor(p.color) || '#2563EB', fontSize: p.fontSize ?? 14, fontWeight: 'bold' },
            parentDirection === 'row' ? { flexShrink: 0 } : undefined,
        ] },
        p.prefix || '',
        display,
        p.suffix || ''));
};
function renderPreviewNode(node, onAction, isRoot = false, parentDirection = 'column', syncVars) {
    if (!node)
        return null;
    if (react_1.default.isValidElement(node) || node?.$$typeof || typeof node?.type === 'function') {
        const converted = (0, jsx_1.renderToWidget)(node);
        if (!converted)
            return null;
        return renderPreviewNode(converted, onAction, isRoot, parentDirection, syncVars);
    }
    switch (node.type) {
        case 'VStack': {
            const vnode = node;
            const p = (0, jsx_1.extractPropsAndStyle)(vnode.props);
            const bg = p.gradient?.colors?.[0]
                ? parseDynamicColor(p.gradient.colors[0])
                : parseDynamicColor(p.backgroundColor) || 'transparent';
            const containerStyle = {
                flexDirection: 'column',
                padding: p.padding ?? (p.paddingHorizontal || p.paddingVertical ? undefined : 0),
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: bg,
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                borderStyle: p.borderStyle || 'solid',
                rowGap: p.spacing ?? 0,
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing' || p.alignment === 'end'
                        ? 'flex-end'
                        : 'flex-start',
                justifyContent: p.justifyContent === 'center'
                    ? 'center'
                    : p.justifyContent === 'spaceBetween'
                        ? 'space-between'
                        : p.justifyContent === 'spaceAround'
                            ? 'space-around'
                            : p.justifyContent === 'spaceEvenly'
                                ? 'space-evenly'
                                : p.justifyContent === 'flexEnd'
                                    ? 'flex-end'
                                    : 'flex-start',
                ...extractShadowStyle(p),
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
            return (react_1.default.createElement(react_native_1.View, { style: containerStyle }, vnode.children?.map((child, idx) => (react_1.default.createElement(react_1.default.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, 'column', syncVars))))));
        }
        case 'HStack': {
            const hnode = node;
            const p = (0, jsx_1.extractPropsAndStyle)(hnode.props);
            const isRtl = p.direction === 'rtl' || p.isRTL;
            const bg = p.gradient?.colors?.[0]
                ? parseDynamicColor(p.gradient.colors[0])
                : parseDynamicColor(p.backgroundColor) || 'transparent';
            const containerStyle = {
                flexDirection: isRtl ? 'row-reverse' : 'row',
                padding: p.padding,
                paddingHorizontal: p.paddingHorizontal,
                paddingVertical: p.paddingVertical,
                backgroundColor: bg,
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                borderStyle: p.borderStyle || 'solid',
                columnGap: p.spacing ?? 0,
                alignItems: p.alignment === 'center'
                    ? 'center'
                    : p.alignment === 'trailing' || p.alignment === 'bottom'
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
                            : p.justifyContent === 'spaceEvenly'
                                ? 'space-evenly'
                                : p.justifyContent === 'flexEnd'
                                    ? 'flex-end'
                                    : 'flex-start',
                ...extractShadowStyle(p),
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
            return (react_1.default.createElement(react_native_1.View, { style: containerStyle }, hnode.children?.map((child, idx) => (react_1.default.createElement(react_1.default.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, 'row', syncVars))))));
        }
        case 'ZStack': {
            const znode = node;
            const p = (0, jsx_1.extractPropsAndStyle)(znode.props);
            return (react_1.default.createElement(react_native_1.View, { style: {
                    position: 'relative',
                    width: isRoot ? '100%' : undefined,
                    height: isRoot ? '100%' : undefined,
                    alignSelf: isRoot ? undefined : 'stretch',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                } }, znode.children?.map((child, idx) => (react_1.default.createElement(react_native_1.View, { key: idx, style: idx === 0
                    ? { width: '100%', height: '100%' }
                    : { ...react_native_1.StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' } }, renderPreviewNode(child, onAction, false, parentDirection, syncVars))))));
        }
        case 'Grid': {
            const gnode = node;
            const p = (0, jsx_1.extractPropsAndStyle)(gnode.props);
            const cols = p.columns ?? 2;
            return (react_1.default.createElement(react_native_1.View, { style: {
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: p.spacing ?? 6,
                    width: '100%',
                    alignSelf: 'stretch',
                } }, gnode.children?.map((child, idx) => (react_1.default.createElement(react_native_1.View, { key: idx, style: { flexBasis: `${Math.floor(100 / cols) - 3}%` } }, renderPreviewNode(child, onAction, false, 'column', syncVars))))));
        }
        case 'Text': {
            const tnode = node;
            const p = (0, jsx_1.extractPropsAndStyle)(tnode.props);
            const isRtl = p.direction === 'rtl' || p.isRTL;
            const shadowColor = parseDynamicColor(p.shadowColor);
            const rawText = String(p.text ?? '');
            const resolvedText = syncVars
                ? rawText
                    .replace(/\{\{_lastSyncTime\}\}/g, syncVars._lastSyncTime)
                    .replace(/\{\{id\}\}/g, syncVars.id)
                    .replace(/\{\{title\}\}/g, syncVars.title)
                : rawText;
            const isRedacted = Boolean(p.redacted);
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
                fontFamily: p.fontDesign === 'monospaced' ? 'monospace' : undefined,
                textAlign: p.textAlign ?? (isRtl ? 'right' : 'left'),
                lineHeight: p.lineHeight,
                letterSpacing: p.letterSpacing,
                opacity: isRedacted ? 0.45 : undefined,
                textShadowColor: shadowColor,
                textShadowOffset: p.shadowOffset
                    ? { width: p.shadowOffset.x ?? 0, height: p.shadowOffset.y ?? 1 }
                    : undefined,
                textShadowRadius: p.shadowRadius,
            };
            return (react_1.default.createElement(react_native_1.Text, { accessible: p.accessible !== false, accessibilityLabel: p.accessibilityLabel || resolvedText, accessibilityHint: p.accessibilityHint, accessibilityRole: p.accessibilityRole, numberOfLines: p.numberOfLines, style: [
                    textStyle,
                    parentDirection === 'row' ? { flexShrink: 1 } : undefined,
                ] }, isRedacted ? '••••••••' : resolvedText));
        }
        case 'Button': {
            const bnode = node;
            const p = bnode.props;
            const bg = p.gradient?.colors?.[0]
                ? parseDynamicColor(p.gradient.colors[0])
                : parseDynamicColor(p.backgroundColor) || '#2563EB';
            const btnStyle = {
                backgroundColor: bg,
                borderRadius: p.borderRadius ?? p.cornerRadius ?? 8,
                borderWidth: p.borderWidth,
                borderColor: parseDynamicColor(p.borderColor),
                borderStyle: p.borderStyle || 'solid',
                paddingHorizontal: p.paddingHorizontal ?? p.padding ?? 12,
                paddingVertical: p.paddingVertical ?? p.padding ?? 6,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: p.fullWidth ? 'stretch' : 'auto',
                ...(p.fullWidth ? (parentDirection === 'row' ? { flex: 1 } : { width: '100%' }) : {}),
                ...extractShadowStyle(p),
            };
            const textStyle = {
                color: parseDynamicColor(p.textColor) || '#FFFFFF',
                fontSize: p.fontSize ?? 12,
                fontWeight: p.fontWeight ?? '600',
                fontFamily: p.fontDesign === 'monospaced' ? 'monospace' : undefined,
            };
            return (react_1.default.createElement(react_native_1.TouchableOpacity, { accessible: p.accessible !== false, accessibilityLabel: p.accessibilityLabel || p.title, accessibilityHint: p.accessibilityHint, accessibilityRole: "button", activeOpacity: 0.7, onPress: () => {
                    if (p.actionId) {
                        if (onAction) {
                            onAction(p.actionId);
                        }
                        const registered = dispatcher_1.actionHandlers.get(p.actionId);
                        if (registered) {
                            try {
                                registered({ actionId: p.actionId });
                            }
                            catch (e) {
                                console.warn(`[WidgetPreview] Action '${p.actionId}' error:`, e);
                            }
                        }
                        for (const globalHandler of dispatcher_1.globalActionHandlers) {
                            try {
                                globalHandler(p.actionId);
                            }
                            catch (e) {
                                console.warn(`[WidgetPreview] Global action handler error:`, e);
                            }
                        }
                    }
                }, style: btnStyle },
                react_1.default.createElement(react_native_1.Text, { numberOfLines: 1, style: textStyle }, p.title)));
        }
        case 'Badge': {
            const bnode = node;
            const p = bnode.props;
            return (react_1.default.createElement(react_native_1.View, { style: {
                    backgroundColor: parseDynamicColor(p.backgroundColor) || '#064E3B',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 6,
                    paddingHorizontal: p.paddingHorizontal ?? 6,
                    paddingVertical: p.paddingVertical ?? 2,
                    flexShrink: 0,
                    alignSelf: 'center',
                } },
                react_1.default.createElement(react_native_1.Text, { numberOfLines: 1, style: {
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
                return (react_1.default.createElement(react_native_1.View, { style: { flexDirection: 'row', gap: 4, width: '100%', height, alignSelf: 'stretch' } }, Array.from({ length: segs }).map((_, idx) => (react_1.default.createElement(react_native_1.View, { key: idx, style: {
                        flex: 1,
                        height,
                        backgroundColor: idx < filled ? tint : track,
                        borderRadius: height / 2,
                    } })))));
            }
            return (react_1.default.createElement(react_native_1.View, { style: { width: '100%', height, backgroundColor: track, borderRadius: height / 2, alignSelf: 'stretch' } },
                react_1.default.createElement(react_native_1.View, { style: {
                        width: `${val * 100}%`,
                        height,
                        backgroundColor: tint,
                        borderRadius: height / 2,
                    } })));
        }
        case 'Timer': {
            const tnode = node;
            const p = tnode.props || {};
            return react_1.default.createElement(PreviewTimerText, { nodeProps: p, parentDirection: parentDirection });
        }
        case 'Image': {
            const inode = node;
            const p = inode.props || {};
            const width = p.width ?? 32;
            const height = p.height ?? 32;
            const uri = p.url || (p.base64 ? `data:image/png;base64,${p.base64}` : null);
            if (uri) {
                return (react_1.default.createElement(react_native_1.Image, { source: { uri }, style: {
                        width,
                        height,
                        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
                    } }));
            }
            return (react_1.default.createElement(react_native_1.View, { style: {
                    width,
                    height,
                    backgroundColor: '#334155',
                    borderRadius: p.borderRadius ?? p.cornerRadius ?? 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                } },
                react_1.default.createElement(react_native_1.Text, { style: { color: '#94A3B8', fontSize: 10 } }, "IMG")));
        }
        case 'Spacer': {
            const snode = node;
            const p = snode.props || {};
            const minLen = p?.minLength ?? 4;
            return (react_1.default.createElement(react_native_1.View, { style: parentDirection === 'row'
                    ? { minWidth: minLen, flex: 1 }
                    : { minHeight: minLen, flex: 1 } }));
        }
        case 'Divider': {
            const p = node.props || {};
            const color = parseDynamicColor(p.color) || '#334155';
            return (react_1.default.createElement(react_native_1.View, { style: parentDirection === 'row'
                    ? { width: 1, height: '100%', backgroundColor: color }
                    : { width: '100%', height: 1, backgroundColor: color, alignSelf: 'stretch' } }));
        }
        case 'Link': {
            const lnode = node;
            const p = lnode.props || {};
            return (react_1.default.createElement(react_native_1.TouchableOpacity, { activeOpacity: 0.7, onPress: () => {
                    if (p.url && onAction)
                        onAction(p.url);
                }, style: { flexDirection: 'row', alignItems: 'center' } }, lnode.children?.map((child, idx) => (react_1.default.createElement(react_1.default.Fragment, { key: idx }, renderPreviewNode(child, onAction, false, parentDirection, syncVars))))));
        }
        case 'Equalizer': {
            const enode = node;
            const p = enode.props || {};
            const tint = parseDynamicColor(p.color) || '#38BDF8';
            return (react_1.default.createElement(react_native_1.View, { style: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 16 } }, [12, 16, 8, 14].map((h, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: { width: 3, height: h, backgroundColor: tint, borderRadius: 1.5 } })))));
        }
        case 'Gauge': {
            const gnode = node;
            const p = gnode.props || {};
            const val = Math.round((p.value ?? 0.75) * 100);
            const tint = parseDynamicColor(p.tintColor) || '#10B981';
            return (react_1.default.createElement(react_native_1.View, { style: { alignItems: 'center', justifyContent: 'center' } },
                react_1.default.createElement(react_native_1.Text, { style: { color: tint, fontSize: 13, fontWeight: 'bold' } },
                    val,
                    "%")));
        }
        case 'Chart': {
            const cnode = node;
            const p = cnode.props || {};
            const values = Array.isArray(p.values) ? p.values : [20, 45, 60, 80, 50];
            const maxVal = Math.max(...values, 1);
            const tint = parseDynamicColor(p.color) || '#38BDF8';
            return (react_1.default.createElement(react_native_1.View, { style: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, width: '100%', alignSelf: 'stretch' } }, values.map((v, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: {
                    flex: 1,
                    height: `${Math.max(15, (v / maxVal) * 100)}%`,
                    backgroundColor: tint,
                    borderRadius: 2,
                } })))));
        }
        case 'Toggle': {
            return (react_1.default.createElement(PreviewToggleItem, { key: `toggle-${node.id || node.props?.actionId || Math.random()}`, node: node, onAction: onAction }));
        }
        default:
            return null;
    }
}
const styles = react_native_1.StyleSheet.create({
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