import { LayoutNode, WidgetSinglePageConfig, WidgetIR } from './types.js';
/**
 * 🌲 Trình biên dịch UI Intermediate Representation (IR).
 * Chuyển hóa cây DSL thành cấu trúc dữ liệu trung gian chuẩn gồm:
 * 1. Root LayoutNode (đã chuẩn hóa thuộc tính & định danh).
 * 2. Semantic Tree độc lập (Tách biệt hoàn toàn khỏi việc vẽ hình của Canvas).
 * 3. Render Plan (Renderer Planner phân loại Native RemoteViews vs Canvas Bitmap).
 * 4. State Bindings (Danh sách các liên kết tương tác & đồng bộ trạng thái).
 */
export declare function compileToIR(input: LayoutNode | WidgetSinglePageConfig): WidgetIR;
/**
 * 🔍 Tiện ích gỡ lỗi: In ra cây kiểm tra trực quan của Intermediate Representation.
 */
export declare function inspectIR(input: LayoutNode | WidgetSinglePageConfig): string;
//# sourceMappingURL=ir.d.ts.map