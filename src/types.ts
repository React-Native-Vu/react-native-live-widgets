/**
 * Schema cho cây giao diện linh hoạt (Declarative Layout Engine)
 * Tầng JS truyền cây này sang Native để render trên:
 * - Lock Screen & Dynamic Island (Live Activity)
 * - Home Screen Widgets (Màn hình chính Small / Medium / Large)
 * - Android Live Update & Ongoing Notification
 */

export type LayoutNodeType =
  | 'VStack'
  | 'HStack'
  | 'Text'
  | 'Timer'
  | 'Progress'
  | 'Image'
  | 'Spacer'
  | 'Button';

export interface BaseNode {
  type: LayoutNodeType;
}

export interface ContainerProps {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  spacing?: number;
  backgroundColor?: string;
  borderRadius?: number;
  alignment?: 'leading' | 'center' | 'trailing';
  justifyContent?: 'flexStart' | 'center' | 'flexEnd' | 'spaceBetween';
}

export interface VStackNode extends BaseNode {
  type: 'VStack';
  props?: ContainerProps;
  children: LayoutNode[];
}

export interface HStackNode extends BaseNode {
  type: 'HStack';
  props?: ContainerProps;
  children: LayoutNode[];
}

export interface TextNode extends BaseNode {
  type: 'Text';
  props: {
    text: string;
    color?: string;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    numberOfLines?: number;
  };
}

export interface TimerNode extends BaseNode {
  type: 'Timer';
  props: {
    /** Epoch timestamp tính bằng giây để đếm tới (hoặc đếm từ) */
    targetTimestamp: number;
    /** 'countdown': đếm ngược tới mốc; 'countup': đếm tiến từ mốc */
    mode?: 'countdown' | 'countup';
    color?: string;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    prefix?: string;
    suffix?: string;
  };
}

export interface ProgressNode extends BaseNode {
  type: 'Progress';
  props: {
    // ── 1. Nguồn dữ liệu tiến trình ─────────────────────────────
    /** Mốc bắt đầu (epoch giây) nếu dùng timer interval tự chạy */
    startTimestamp?: number;
    /** Mốc kết thúc (epoch giây) */
    targetTimestamp?: number;
    /** Giá trị cố định từ 0.0 đến 1.0 (nếu không dùng timer) */
    value?: number;

    // ── 2. Kiểu dáng hiển thị (Style & Shape) ───────────────────
    /** 'bar': thanh liền mạch | 'segmented': thanh nhiều chặng | 'circular': vòng tròn % */
    style?: 'bar' | 'segmented' | 'circular';
    /** true: thanh rút ngắn dần về 0 (như đếm ngược OTP/Flash sale) | false: thanh đầy dần lên 100% */
    countsDown?: boolean;
    /** Chiều cao / độ dày thanh (pixel). Mặc định 6 */
    height?: number;
    /** Bo góc thanh. Mặc định bo tròn hoàn toàn */
    borderRadius?: number;

    // ── 3. Màu sắc & Gradient ───────────────────────────────────
    /** Màu thanh khi lấp đầy (dạng '#RRGGBB') */
    tintColor?: string;
    /** Màu nền rãnh phía sau */
    trackColor?: string;
    /** Dải màu Gradient lấp đầy (ví dụ ['#00C6FF', '#0072FF']) */
    gradientColors?: string[];

    // ── 4. Cảnh báo đổi màu thông minh (Smart Warning) ──────────
    /** Số giây cuối trước khi hết hạn để tự đổi sang màu cảnh báo (vd 300 = còn 5 phút) */
    warningSeconds?: number;
    /** Màu cảnh báo khi bước vào giai đoạn warningSeconds (mặc định '#FFA500' cam hoặc đỏ) */
    warningTintColor?: string;

    // ── 5. Thanh nhiều chặng (Segmented Progress) ───────────────
    /** Tổng số chặng (ví dụ 4 bước: Đặt -> Nhận -> Nấu -> Giao) */
    segments?: number;
    /** Chặng hiện tại đang ở (từ 1 đến segments) */
    currentSegment?: number;
    /** Khoảng cách giữa các chặng (pixel) */
    segmentSpacing?: number;

    // ── 6. Tracker Icon (Vật di chuyển trên thanh) ───────────────
    /** Icon SF Symbol chạy ở đầu thanh tiến trình (ví dụ 'car.fill', 'figure.walk') */
    trackerSystemName?: string;
    /** Tên asset ảnh chạy ở đầu thanh tiến trình (ví dụ 'fasty_mascot') */
    trackerAssetName?: string;
    /** Kích thước của tracker icon (pixel). Mặc định 16 */
    trackerSize?: number;

    // ── 7. Nhãn phần trăm ───────────────────────────────────────
    /** Có hiển thị chữ phần trăm ở góc không (ví dụ "75%") */
    showPercentage?: boolean;
    percentageColor?: string;
  };
}

export interface ImageNode extends BaseNode {
  type: 'Image';
  props: {
    assetName?: string;
    systemName?: string;
    filePath?: string;
    width?: number;
    height?: number;
    tintColor?: string;
    borderRadius?: number;
  };
}

export interface SpacerNode extends BaseNode {
  type: 'Spacer';
  props?: {
    minLength?: number;
  };
}

export interface ButtonNode extends BaseNode {
  type: 'Button';
  props: {
    title: string;
    actionId: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
  };
}

export type LayoutNode =
  | VStackNode
  | HStackNode
  | TextNode
  | TimerNode
  | ProgressNode
  | ImageNode
  | SpacerNode
  | ButtonNode;

export interface DynamicIslandConfig {
  compactLeading: LayoutNode;
  compactTrailing: LayoutNode;
  minimal?: LayoutNode;
  expanded?: {
    leading?: LayoutNode;
    trailing?: LayoutNode;
    bottom?: LayoutNode;
    center?: LayoutNode;
  };
}

export interface PhaseConfig {
  id: string;
  triggerTimestamp: number;
  layoutOverride?: LayoutNode;
  alertTitle?: string;
  alertBody?: string;
}

export interface StartActivityOptions {
  activityId: string;
  lockScreen: LayoutNode;
  dynamicIsland?: DynamicIslandConfig;
  phases?: PhaseConfig[];
  staleTimestamp?: number;
  alertTitle?: string;
  alertBody?: string;
}

export interface UpdateActivityOptions {
  activityId: string;
  lockScreen?: LayoutNode;
  dynamicIsland?: DynamicIslandConfig;
  alertTitle?: string;
  alertBody?: string;
}

export interface WidgetLayoutConfig {
  small?: LayoutNode;
  medium?: LayoutNode;
  large?: LayoutNode;
}
