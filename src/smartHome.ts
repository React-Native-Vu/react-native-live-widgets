import { ControlWidgetConfig } from './types';

export type SmartHomeDeviceType = 'light' | 'ac' | 'lock' | 'scene';

export interface SmartHomeControlOptions {
  deviceId: string;
  name: string;
  deviceType: SmartHomeDeviceType;
  isOn: boolean;
  detailText?: string; // e.g. "24°C", "80%", "Locked"
  tintColor?: string;
}

const DEVICE_ICONS: Record<SmartHomeDeviceType, { on: string; off: string; color: string }> = {
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
export const SmartHomeControl = {
  createToggle: (opts: SmartHomeControlOptions): ControlWidgetConfig => {
    const meta = DEVICE_ICONS[opts.deviceType] || DEVICE_ICONS.light;
    const subtitle = opts.detailText || (opts.isOn ? 'Đang bật' : 'Đã tắt');
    return {
      type: 'toggle',
      title: opts.name,
      subtitle,
      checkedSubtitle: opts.detailText || 'Đang bật',
      systemName: (opts.isOn ? meta.on : meta.off) as any,
      tintColor: opts.tintColor || meta.color,
      actionId: `toggle:smarthome_${opts.deviceId}`,
      checked: opts.isOn,
    };
  },

  createSceneButton: (sceneId: string, name: string, subtitle = 'Kích hoạt ngữ cảnh'): ControlWidgetConfig => {
    return {
      type: 'button',
      title: name,
      subtitle,
      systemName: 'sparkles' as any,
      tintColor: '#A855F7',
      actionId: `smarthome:scene:${sceneId}`,
    };
  },
};
