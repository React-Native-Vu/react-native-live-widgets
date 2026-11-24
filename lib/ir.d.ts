import { LayoutNode, WidgetSinglePageConfig, WidgetIR } from './types';
/**
 * 🌲 Trình biên dịch UI Intermediate Representation (IR).
 * Chuyển hóa cây DSL thành cấu trúc dữ liệu trung gian chuẩn gồm:
 * 1. Root LayoutNode (đã chuẩn hóa thuộc tính & định danh).
 * 2. Semantic Tree độc lập (Tách biệt hoàn toàn khỏi việc vẽ hình của Canvas).
 *    Bao gồm: Focus Order, Grouping, State Description, Adjustable Actions, Live Region, RTL.
 * 3. Render Plan (Renderer Planner phân loại Native RemoteViews vs Canvas Bitmap).
 * 4. State Bindings (Danh sách các liên kết tương tác & đồng bộ trạng thái).
 */
export declare function compileToIR(input: LayoutNode | WidgetSinglePageConfig, options?: {
    rtl?: boolean;
}): WidgetIR;
/**
 * 🔍 Tiện ích gỡ lỗi: In ra cây kiểm tra trực quan của Intermediate Representation.
 */
export declare function inspectIR(input: LayoutNode | WidgetSinglePageConfig): string;
/**
 * ♿ Accessibility Test Inspector:
 * Công cụ kiểm tra Cây Trợ Năng (Native Accessibility Node Tree) thực tế từ UI IR.
 * Hiển thị rõ thứ tự Focus Order, Grouping, State Description, Adjustable Actions, Live Region và RTL.
 */
export declare function inspectAccessibilityTree(input: LayoutNode | WidgetSinglePageConfig, options?: {
    rtl?: boolean;
}): string;
//# sourceMappingURL=ir.d.ts.map