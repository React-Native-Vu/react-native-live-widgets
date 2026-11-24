import { LayoutNode, WidgetSinglePageConfig } from './types';
export interface ListRepeaterOptions<T> {
    items: T[];
    renderItem: (item: T, index: number) => LayoutNode;
    /** Giới hạn số dòng tối đa để bảo vệ RAM WidgetKit / Android RemoteViews (mặc định 6) */
    maxItems?: number;
    spacing?: number;
    emptyFallback?: LayoutNode;
}
export interface TimelineItem {
    time: string;
    title: string;
    subtitle?: string;
    status: 'done' | 'active' | 'upcoming';
}
export interface DonutSegment {
    value: number;
    color: string;
    label?: string;
}
/**
 * 📋 UI.List / Repeater: Render danh sách dữ liệu động có giới hạn RAM an toàn + emptyFallback.
 */
export declare function createListNode<T>(options: ListRepeaterOptions<T>): LayoutNode;
/**
 * 🗓️ UI.Timeline: Render lịch trình / ca làm việc / mốc tiến độ dạng trục dọc chuẩn.
 */
export declare function createTimelineNode(items: TimelineItem[], maxItems?: number): LayoutNode;
/**
 * 🍩 UI.DonutChart: Biểu đồ vòng đa phân đoạn kèm tổng & nhãn trung tâm.
 */
export declare function createDonutChartNode(options: {
    segments: DonutSegment[];
    size?: number;
    centerLabel?: string;
    accessibilityLabel?: string;
}): LayoutNode;
/**
 * 📈 UI.Sparkline: Biểu đồ xu hướng mini tối ưu cho KPI / doanh thu / nhịp tim.
 */
export declare function createSparklineNode(options: {
    data: number[];
    color?: string;
    height?: number;
    accessibilityLabel?: string;
}): LayoutNode;
/**
 * 🔀 UI.When (Conditional Layout): Hiển thị nhánh UI theo điều kiện gọn gàng.
 */
export declare function whenNode(condition: any, thenNode: LayoutNode, elseNode?: LayoutNode): LayoutNode;
/**
 * 📱 UI.Responsive: Định nghĩa layout tối ưu riêng cho từng kích thước Widget Family.
 */
export declare function responsiveLayout(config: WidgetSinglePageConfig): WidgetSinglePageConfig;
/**
 * 🌍 LocaleFormatter: Bộ định dạng ngày tháng, tiền tệ, số lượng đa ngôn ngữ chuẩn Intl.
 */
export declare const LocaleFormatter: {
    formatCurrency: (amount: number, currency?: string, locale?: string) => string;
    formatNumber: (value: number, locale?: string, maxDecimals?: number) => string;
    formatDate: (date: Date | number | string, locale?: string, options?: Intl.DateTimeFormatOptions) => string;
    formatRelativeTime: (diffSeconds: number, locale?: string) => string;
};
//# sourceMappingURL=ecosystem.d.ts.map