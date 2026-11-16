import React from 'react';
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
export declare const WidgetPreview: React.FC<WidgetPreviewProps>;
/** Alias tương thích */
export declare const VoltraWidgetPreview: React.FC<WidgetPreviewProps>;
//# sourceMappingURL=preview.d.ts.map