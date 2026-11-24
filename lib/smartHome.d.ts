import { ControlWidgetConfig } from './types';
export type SmartHomeDeviceType = 'light' | 'ac' | 'lock' | 'scene';
export interface SmartHomeControlOptions {
    deviceId: string;
    name: string;
    deviceType: SmartHomeDeviceType;
    isOn: boolean;
    detailText?: string;
    tintColor?: string;
}
/**
 * 🏠 Smart Home Controls Builder:
 * Tạo cấu hình chuẩn cho iOS 18 Control Center (ControlWidget) & Android Quick Settings Tile
 * cho các thiết bị Nhà thông minh (Đèn, Điều hòa, Khóa cửa, Ngữ cảnh).
 */
export declare const SmartHomeControl: {
    createToggle: (opts: SmartHomeControlOptions) => ControlWidgetConfig;
    createSceneButton: (sceneId: string, name: string, subtitle?: string) => ControlWidgetConfig;
};
//# sourceMappingURL=smartHome.d.ts.map