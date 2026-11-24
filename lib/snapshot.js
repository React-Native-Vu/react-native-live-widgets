"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLayoutToSVG = renderLayoutToSVG;
exports.createWidgetSnapshot = createWidgetSnapshot;
exports.compareWidgetSnapshots = compareWidgetSnapshots;
const ir_1 = require("./ir");
const SIZE_DIMENSIONS = {
    small: { width: 158, height: 158 },
    medium: { width: 338, height: 158 },
    large: { width: 338, height: 354 },
    lockScreen: { width: 350, height: 80 },
    dynamicIsland: { width: 350, height: 160 },
};
function fnv1aHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function resolveColorForTheme(color, theme, fallback) {
    if (!color)
        return fallback;
    if (typeof color === 'string')
        return color;
    if (typeof color === 'object') {
        if (theme === 'tinted' && color.tinted)
            return color.tinted;
        if (theme === 'dark' && color.dark)
            return color.dark;
        if (color.light)
            return color.light;
    }
    return fallback;
}
/**
 * 🎨 Kết xuất cây IR sang vector SVG chuẩn xác để làm Deterministic Snapshot Testing (Light/Dark/Tinted).
 */
function renderLayoutToSVG(layout, size = 'medium', theme = 'dark', direction = 'ltr') {
    const ir = (0, ir_1.compileToIR)(layout, { rtl: direction === 'rtl' });
    const { width, height } = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.medium;
    const rootProps = ir.root?.props || {};
    const defaultBg = theme === 'light' ? '#FFFFFF' : theme === 'tinted' ? '#1E293B' : '#0F172A';
    const defaultFg = theme === 'light' ? '#0F172A' : '#F8FAFC';
    const bg = resolveColorForTheme(rootProps.backgroundColor, theme, defaultBg);
    const elements = [];
    elements.push(`<rect x="0" y="0" width="${width}" height="${height}" rx="22" fill="${escapeXml(bg)}" stroke="${theme === 'light' ? '#E2E8F0' : '#334155'}" stroke-width="1" />`);
    let cursorY = 28;
    const xAnchor = direction === 'rtl' ? width - 16 : 16;
    const textAnchor = direction === 'rtl' ? 'end' : 'start';
    for (const node of ir.semanticTree) {
        if (cursorY > height - 14)
            break;
        if (node.role === 'button') {
            const btnX = direction === 'rtl' ? width - 136 : 16;
            elements.push(`<rect x="${btnX}" y="${cursorY - 14}" width="120" height="24" rx="8" fill="${theme === 'tinted' ? '#38BDF8' : '#2563EB'}" />`);
            elements.push(`<text x="${btnX + 60}" y="${cursorY + 2}" font-family="sans-serif" font-size="11" font-weight="600" fill="#FFFFFF" text-anchor="middle">${escapeXml(node.label)}</text>`);
            cursorY += 30;
        }
        else if (node.role === 'progressbar') {
            elements.push(`<rect x="16" y="${cursorY - 8}" width="${width - 32}" height="8" rx="4" fill="#334155" />`);
            elements.push(`<rect x="16" y="${cursorY - 8}" width="${Math.round((width - 32) * 0.7)}" height="8" rx="4" fill="#38BDF8" />`);
            cursorY += 20;
        }
        else {
            const fontSize = node.isHeading ? 14 : 11;
            const fontWeight = node.isHeading ? '700' : '400';
            const labelText = node.value !== undefined ? `${node.label}: ${node.value}` : node.label;
            elements.push(`<text x="${xAnchor}" y="${cursorY}" font-family="sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${defaultFg}" text-anchor="${textAnchor}">${escapeXml(labelText)}</text>`);
            cursorY += node.isHeading ? 22 : 18;
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-theme="${theme}" data-dir="${direction}">\n  ${elements.join('\n  ')}\n</svg>`;
}
/**
 * 📸 Tạo Widget Snapshot đa kích thước & đa giao diện (Light / Dark / Tinted / RTL).
 */
function createWidgetSnapshot(layout, options) {
    const sizes = options?.sizes || ['small', 'medium'];
    const themes = options?.themes || ['light', 'dark', 'tinted'];
    const directions = options?.directions || ['ltr'];
    const variants = {};
    for (const size of sizes) {
        for (const theme of themes) {
            for (const direction of directions) {
                const key = `${size}:${theme}:${direction}`;
                const ir = (0, ir_1.compileToIR)(layout, { rtl: direction === 'rtl' });
                const { width, height } = SIZE_DIMENSIONS[size];
                const svg = renderLayoutToSVG(layout, size, theme, direction);
                const structuralPayload = JSON.stringify({
                    root: ir.root,
                    semanticTree: ir.semanticTree,
                    renderStrategy: ir.renderPlan.overallStrategy,
                });
                variants[key] = {
                    key,
                    size,
                    theme,
                    direction,
                    width,
                    height,
                    structuralHash: fnv1aHash(structuralPayload),
                    svgHash: fnv1aHash(svg),
                    svg,
                    nodeCount: ir.renderPlan.nativeNodeCount + ir.renderPlan.canvasNodeCount,
                    semanticNodeCount: ir.semanticTree.length,
                    semanticSummary: ir.semanticSummary,
                };
            }
        }
    }
    return {
        version: '1.0',
        createdAt: Date.now(),
        variants,
    };
}
/**
 * 🔬 So sánh 2 Widget Snapshots để phát hiện regression giao diện & ngữ nghĩa giữa các phiên bản.
 */
function compareWidgetSnapshots(baseline, current) {
    const baseKeys = new Set(Object.keys(baseline.variants));
    const currKeys = new Set(Object.keys(current.variants));
    const addedVariants = [...currKeys].filter((k) => !baseKeys.has(k));
    const removedVariants = [...baseKeys].filter((k) => !currKeys.has(k));
    const changedVariants = [];
    for (const key of currKeys) {
        if (!baseKeys.has(key))
            continue;
        const b = baseline.variants[key];
        const c = current.variants[key];
        const structuralChanged = b.structuralHash !== c.structuralHash;
        const svgChanged = b.svgHash !== c.svgHash;
        const semanticChanged = b.semanticSummary !== c.semanticSummary;
        if (structuralChanged || svgChanged || semanticChanged) {
            const reasons = [];
            if (structuralChanged)
                reasons.push(`IR hash ${b.structuralHash} -> ${c.structuralHash}`);
            if (svgChanged)
                reasons.push(`SVG hash ${b.svgHash} -> ${c.svgHash}`);
            if (semanticChanged)
                reasons.push(`A11y summary changed`);
            changedVariants.push({
                key,
                structuralChanged,
                svgChanged,
                semanticChanged,
                details: reasons.join(' | '),
            });
        }
    }
    return {
        passed: addedVariants.length === 0 && removedVariants.length === 0 && changedVariants.length === 0,
        addedVariants,
        removedVariants,
        changedVariants,
    };
}
//# sourceMappingURL=snapshot.js.map