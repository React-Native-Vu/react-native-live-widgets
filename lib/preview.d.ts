import { ViewStyle } from 'react-native';
import { LayoutNode, WidgetSinglePageConfig } from './types';
export type WidgetPreviewSize = 'small' | 'medium' | 'large' | 'lockScreen' | 'dynamicIsland';
export interface WidgetPreviewProps {
    /**
     * Kích thước tiện ích cần xem trước:
     * - 'small' (158 × 158 dp)
     * - 'medium' (338 × 158 dp)
     * - 'large' (338 × 354 dp)
     * - 'lockScreen' (350 × 80 dp)
     * - 'dynamicIsland' (350 × 160 dp)
     * Mặc định là 'medium'.
     */
    size?: WidgetPreviewSize;
    /** Cây LayoutNode hoặc đối tượng chứa { small, medium, large } */
    layout?: LayoutNode | WidgetSinglePageConfig;
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