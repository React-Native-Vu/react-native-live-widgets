"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartHomeControl = void 0;
const DEVICE_ICONS = {
    light: { on: 'lightbulb.fill', off: 'lightbulb', color: '#F59E0B' },
    ac: { on: 'snowflake', off: 'wind', color: '#38BDF8' },
    lock: { on: 'lock.fill', off: 'lock.open.fill', color: '#10B981' },
    scene: { on: 'sparkles', off: 'moon.stars', color: '#A855F7' },
};
/**
 * 🏠 Smart Home Controls Builder:
 * Tạo cấu hình chuẩn cho iOS 18 Control Center (ControlWidget) & Android Quick Settings Tile
 * cho các thiết bị Nhà thông minh (Đèn, Điều hòa, Khóa cửa, Ngữ cảnh).
 */
exports.SmartHomeControl = {
    createToggle: (opts) => {
        const meta = DEVICE_ICONS[opts.deviceType] || DEVICE_ICONS.light;
        const subtitle = opts.detailText || (opts.isOn ? 'Đang bật' : 'Đã tắt');
        return {
            type: 'toggle',
            title: opts.name,
            subtitle,
            checkedSubtitle: opts.detailText || 'Đang bật',
            systemName: (opts.isOn ? meta.on : meta.off),
            tintColor: opts.tintColor || meta.color,
            actionId: `toggle:smarthome_${opts.deviceId}`,
            checked: opts.isOn,
        };
    },
    createSceneButton: (sceneId, name, subtitle = 'Kích hoạt ngữ cảnh') => {
        return {
            type: 'button',
            title: name,
            subtitle,
            systemName: 'sparkles',
            tintColor: '#A855F7',
            actionId: `smarthome:scene:${sceneId}`,
        };
    },
};
//# sourceMappingURL=smartHome.js.map