import { ViewStyle } from 'react-native';
import { ControlWidgetConfig, LayoutNode, WidgetSinglePageConfig } from './types';
export type WidgetPreviewSize = 'small' | 'medium' | 'large' | 'extraLarge' | 'standBy' | 'lockScreen' | 'dynamicIsland' | 'control';
export interface WidgetPreviewProps {
    /**
     * Kích thước tiện ích cần xem trước:
     * - 'small' (158 × 158 dp)
     * - 'medium' (338 × 158 dp)
     * - 'large' (338 × 354 dp)
     * - 'extraLarge' (338 × 420 dp)
     * - 'standBy' (310 × 158 dp)
     * - 'lockScreen' (350 × 80 dp)
     * - 'dynamicIsland' (350 × 160 dp)
     * - 'control' (170 × 76 dp — iOS 18 Control Center / Android Quick Settings Tile)
     * Mặc định là 'medium' (hoặc 'control' nếu truyền controlConfig).
     */
    size?: WidgetPreviewSize;
    /** Cây LayoutNode hoặc đối tượng chứa { small, medium, large, extraLarge, standBy } */
    layout?: LayoutNode | WidgetSinglePageConfig;
    /** Cấu hình Control Widget dùng để xem trước Control Center / Quick Settings Tile */
    controlConfig?: ControlWidgetConfig;
    /** Cú pháp JSX trực tiếp truyền vào bên trong thẻ `<WidgetPreview>` */
    children?: React.ReactNode;
    /** Bắt sự kiện khi người dùng bấm vào các nút tương tác trên Widget xem trước */
    onAction?: (actionId: string) => void;
    /** Hiển thị nhãn kích thước chuẩn ở góc (mặc định true) */
    showBadge?: boolean;
    /** Cho phép bấm thanh tab nhỏ ở trên để chuyển nhanh qua lại giữa các kích thước (mặc định false) */
    interactiveSizeSwitch?: boolean;
    /** Style tùy biến cho wrapper bên ngoài */
    style?: ViewStyle;
}
export declare const WidgetPreview: React.FC<WidgetPreviewProps>;
/** Alias tương thích */
export declare const VoltraWidgetPreview: React.FC<WidgetPreviewProps>;
//# sourceMappingURL=preview.d.ts.map