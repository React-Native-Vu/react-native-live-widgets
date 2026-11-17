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
  | 'ZStack'
  | 'Grid'
  | 'Divider'
  | 'Text'
  | 'Timer'
  | 'Progress'
  | 'Gauge'
  | 'Chart'
  | 'Image'
  | 'Spacer'
  | 'Button'
  | 'Toggle'
  | 'Badge'
  | 'Link'
  | 'Equalizer'
  | 'Custom';

/**
 * Định dạng màu hỗ trợ:
 * - Chuỗi Hex đơn (ví dụ '#0F172A', '#38BDF8AA')
 * - Object Dynamic Color tự đổi theo chế độ Sáng / Tối (Light / Dark Mode)
 * - Chế độ Tinted / Accented trên iOS 18+ và Material You Android.
 */
export type DynamicColor =
  | string
  | {
      light: string;
      dark: string;
      /** Màu hiển thị ở chế độ Tinted Home Screen trên iOS 18+ hoặc Material You Dynamic Theming Android */
      tinted?: string;
    };

export type BorderStyle = 'solid' | 'dashed' | 'dotted';

/** Cấu hình đổ bóng (Shadow Modifier) cho Card, Button và Container */
export interface ShadowProps {
  /** Màu bóng đổ (hỗ trợ DynamicColor) */
  shadowColor?: DynamicColor;
  /** Bán kính mờ của bóng đổ (dp/pt) */
  shadowRadius?: number;
  /** Độ mờ đục từ 0.0 (trong suốt) đến 1.0 (đậm đặc) */
  shadowOpacity?: number;
  /** Độ dời vị trí bóng đổ theo trục X và Y */
  shadowOffset?: { x: number; y: number };
}

/** Cấu hình dải màu chuyển sắc (Gradient Modifier) */
export interface GradientProps {
  /** Kiểu chuyển sắc: 'linear' (đường thẳng - mặc định) hoặc 'radial' (tâm tròn) */
  type?: 'linear' | 'radial';
  /** Danh sách các màu chuyển tiếp (hỗ trợ DynamicColor cho từng chặng) */
  colors: DynamicColor[];
  /** Điểm bắt đầu theo toạ độ tỉ lệ từ 0.0 đến 1.0 (mặc định { x: 0, y: 0 } top-left) */
  startPoint?: { x: number; y: number };
  /** Điểm kết thúc theo toạ độ tỉ lệ từ 0.0 đến 1.0 (mặc định { x: 1, y: 1 } bottom-right) */
  endPoint?: { x: number; y: number };
  /** Góc gradient theo độ (ví dụ 45, 90, 180) */
  angle?: number;
}

export type TypographyStyle =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'subheadline'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption1'
  | 'caption2';

export type FontDesign = 'default' | 'monospaced' | 'rounded' | 'serif';

/**
 * ♿ Vai trò ngữ nghĩa cho Trợ năng (Accessibility Semantic Role).
 * Giúp các công cụ đọc màn hình (TalkBack trên Android, VoiceOver trên iOS, Screen Readers)
 * phát âm chính xác bản chất của phần tử thay vì coi tất cả là hình ảnh raster.
 */
export type AccessibilityRole =
  | 'none'
  | 'button'
  | 'header'
  | 'text'
  | 'image'
  | 'progressbar'
  | 'timer'
  | 'switch'
  | 'checkbox'
  | 'summary'
  | 'alert';

/**
 * ♿ Thuộc tính Trợ năng (Accessibility & Semantics Layer).
 * Tách biệt hoàn toàn tầng ngữ nghĩa khỏi tầng vẽ đồ họa (Canvas/SwiftUI),
 * cho phép TalkBack và VoiceOver tiếp cận dữ liệu chính xác ngay cả khi render bằng Canvas.
 */
export interface AccessibilityProps {
  /** Cho phép công cụ trợ năng (TalkBack/VoiceOver) tiếp cận thành phần này (mặc định true; đặt false cho các icon/hình trang trí decorative) */
  accessible?: boolean;
  /** Mô tả âm thanh phát âm cho người dùng khi TalkBack/VoiceOver lướt tới phần tử */
  accessibilityLabel?: string;
  /** Hướng dẫn hành động bổ sung (ví dụ: "Chạm hai lần để xác nhận chấm công") */
  accessibilityHint?: string;
  /** Vai trò ngữ nghĩa của phần tử (header, button, progressbar, ...) */
  accessibilityRole?: AccessibilityRole;
  /** Giá trị trạng thái đọc lên (ví dụ: "86%", "Đang vận chuyển", "Đã bật") */
  accessibilityValue?: string | number;
}

export interface BaseNode {
  type: LayoutNodeType;
}

export interface ContainerProps extends ShadowProps, AccessibilityProps {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  spacing?: number;
  /** Khoảng cách giữa các phần tử con (Alias chuẩn React Native Style cho spacing) */
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  backgroundColor?: DynamicColor;
  /** Gradient màu nền (tự động graceful fallback sang backgroundColor nếu platform không hỗ trợ) */
  gradient?: GradientProps;
  borderRadius?: number;
  /** Alias bo góc theo cú pháp SwiftUI (tự động ánh xạ sang borderRadius) */
  cornerRadius?: number;
  borderColor?: DynamicColor;
  borderWidth?: number;
  borderStyle?: BorderStyle;
  alignment?:
    | 'leading'
    | 'center'
    | 'trailing'
    | 'top'
    | 'bottom'
    | 'firstTextBaseline'
    | 'lastTextBaseline'
    | string;
  justifyContent?:
    | 'flexStart'
    | 'center'
    | 'flexEnd'
    | 'spaceBetween'
    | 'spaceAround'
    | 'spaceEvenly'
    | string;
  /** Chiều viết văn bản (Hỗ trợ quốc tế hoá RTL cho tiếng Ả Rập, Do Thái) */
  direction?: 'ltr' | 'rtl' | 'auto';
  /** Cờ bật RTL chủ động cho khối container này */
  isRTL?: boolean;
  /** Tự động ẩn hoặc làm mờ nội dung khi thiết bị đang khóa màn hình (Bảo mật chuẩn Apple) */
  privacySensitive?: boolean;
  /** Chủ động che nội dung thành vệt khối mờ Placeholder (Skeleton Redaction) */
  redacted?: boolean;
}

export type FontWeight =
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'light'
  | (string & {})
  | string;

export interface TextStyle extends ShadowProps, AccessibilityProps {
  color?: DynamicColor;
  fontSize?: number;
  fontWeight?: FontWeight;
  /** Hệ thống phân cấp cỡ chữ chuẩn Apple Human Interface Guidelines / Material Design */
  typography?: TypographyStyle;
  /** Kiểu dáng họ font chữ hệ thống */
  fontDesign?: FontDesign;
  /** Tự động co giãn cỡ chữ theo cài đặt Trợ năng (Accessibility Dynamic Type) của hệ điều hành (mặc định true) */
  dynamicType?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'leading' | 'trailing' | 'auto';
  lineHeight?: number;
  letterSpacing?: number;
  numberOfLines?: number;
  strikethroughWhenToggled?: string;
  /** Tự động làm mờ hoặc ẩn chữ khi màn hình khóa (iOS Privacy Redacted) */
  privacySensitive?: boolean;
  /** Chủ động che nội dung thành vệt khối mờ Placeholder (Skeleton Redaction) */
  redacted?: boolean;
  /** Hiệu ứng cuộn lật số mượt mà kiểu Odometer (iOS 16+ numericText animation) khi số liệu thay đổi */
  numericAnimation?: boolean;
  /** Cho phép text tự đổi màu theo chế độ StandBy / Tinted iOS 17+ / iOS 18 */
  widgetAccentable?: boolean;
}

export type StyleProp<T> = T | null | undefined | false | StyleProp<T>[];

export interface TextNodeProps extends TextStyle {
  text: string;
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
  props: TextNodeProps;
}

export interface TimerNode extends BaseNode {
  type: 'Timer';
  props: AccessibilityProps & {
    /** Epoch timestamp tính bằng giây để đếm tới (hoặc đếm từ) */
    targetTimestamp: number;
    /** 'countdown': đếm ngược tới mốc; 'countup': đếm tiến từ mốc */
    mode?: 'countdown' | 'countup';
    color?: DynamicColor;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    prefix?: string;
    suffix?: string;
  };
}

export interface ProgressNode extends BaseNode {
  type: 'Progress';
  props: AccessibilityProps & {
    // ── 1. Nguồn dữ liệu tiến trình ─────────────────────────────
    /** Mốc bắt đầu (epoch giây) nếu dùng timer interval tự chạy */
    startTimestamp?: number;
    /** Mốc kết thúc (epoch giây) */
    targetTimestamp?: number;
    /** Giá trị cố định từ 0.0 đến 1.0 hoặc biểu thức binding (vd '{{attendance.progress|divide:100}}') */
    value?: number | string | DataBindingField<any>;

    // ── 2. Kiểu dáng hiển thị (Style & Shape) ───────────────────
    /** 'bar': thanh liền mạch | 'segmented': thanh nhiều chặng | 'circular': vòng tròn % */
    style?: 'bar' | 'segmented' | 'circular';
    /** true: thanh rút ngắn dần về 0 (như đếm ngược OTP/Flash sale) | false: thanh đầy dần lên 100% */
    countsDown?: boolean;
    /** Chiều cao / độ dày thanh (pixel). Mặc định 6 */
    height?: number;
    /** Bo góc thanh. Mặc định bo tròn hoàn toàn */
    borderRadius?: number;
    cornerRadius?: number;

    // ── 3. Màu sắc & Gradient ───────────────────────────────────
    /** Màu thanh khi lấp đầy (dạng '#RRGGBB' hoặc { light, dark }) */
    tintColor?: DynamicColor;
    /** Màu nền rãnh phía sau */
    trackColor?: DynamicColor;
    /** Dải màu Gradient lấp đầy (ví dụ ['#00C6FF', '#0072FF']) */
    gradientColors?: string[];

    // ── 4. Cảnh báo đổi màu thông minh (Smart Warning) ──────────
    /** Số giây cuối trước khi hết hạn để tự đổi sang màu cảnh báo (vd 300 = còn 5 phút) */
    warningSeconds?: number;
    /** Màu cảnh báo khi bước vào giai đoạn warningSeconds (mặc định '#FFA500' cam hoặc đỏ) */
    warningTintColor?: DynamicColor;

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
    percentageColor?: DynamicColor;
    /** Cho phép thanh tiến trình đổi màu theo StandBy / Tinted iOS 17+ / iOS 18 */
    widgetAccentable?: boolean;
  };
}

export interface ImageNode extends BaseNode {
  type: 'Image';
  props: AccessibilityProps & {
    /** URL ảnh từ mạng (https://...) - Tự động tải, nén tối ưu RAM và cache vào App Group cho Widget & Live Activity */
    url?: string;
    /** Chuỗi ảnh Base64 (có thể kèm tiền tố data:image/png;base64,... hoặc chuỗi raw base64) */
    base64?: string;
    /** Tên ảnh trong Xcode Assets.xcassets hoặc Android drawable */
    assetName?: string;
    /** Tên icon hệ thống SF Symbols trên iOS (ví dụ 'person.crop.circle.fill', 'flame.fill', 'cart.fill') */
    systemName?: string;
    /** Đường dẫn file cục bộ trong máy */
    filePath?: string;
    /** Icon SF Symbol dự phòng khi ảnh mạng chưa tải xong hoặc lỗi */
    fallbackSystemName?: string;
    width?: number;
    height?: number;
    /** 'fill': phủ kín khung ảnh (crop) | 'fit': vừa khung ảnh */
    contentMode?: 'fit' | 'fill';
    tintColor?: DynamicColor;
    backgroundColor?: DynamicColor;
    padding?: number;
    /** Bo góc ảnh (đặt bằng width / 2 để tạo ảnh Avatar tròn) */
    borderRadius?: number;
    cornerRadius?: number;
    /** Độ dày viền quanh ảnh (ví dụ viền Avatar) */
    borderWidth?: number;
    /** Màu viền quanh ảnh */
    borderColor?: DynamicColor;
    /** Hiệu ứng hoạt họa cho SF Symbol trên iOS 17+ (bounce, pulse, variableColor) */
    symbolEffect?: 'bounce' | 'pulse' | 'variableColor' | 'scale';
    /** Cho phép icon tự động đổi màu tương thích chế độ StandBy / Tinted của iOS 17+ / iOS 18 */
    widgetAccentable?: boolean;
    /** Tự động ẩn hoặc làm mờ ảnh khi màn hình khóa */
    privacySensitive?: boolean;
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
  props: ShadowProps & AccessibilityProps & {
    title: string;
    /**
     * Mã hành động chạy ngầm ngay trên Widget (iOS 17+ AppIntent, không mở App):
     * - 'page:<pageId>': Chuyển sang trang/tab cụ thể (vd 'page:todo', 'page:okr')
     * - 'page:next' | 'page:prev': Lật sang trang kế tiếp / trang trước
     * - 'toggle:<itemKey>': Tick / bỏ tick hoàn thành 1 mục ngay trên mặt Widget
     */
    actionId?: string;
    /** Hàm xử lý logic TypeScript chạy khi người dùng bấm nút ngoài Widget */
    onPress?: (payload?: any) => Promise<any> | any;
    /** Mở App và điều hướng tới URL Deep Link cụ thể */
    deepLink?: string;
    backgroundColor?: DynamicColor;
    /** Gradient màu nền nút bấm */
    gradient?: GradientProps;
    textColor?: DynamicColor;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    typography?: TypographyStyle;
    fontDesign?: FontDesign;
    padding?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
    borderRadius?: number;
    cornerRadius?: number;
    borderColor?: DynamicColor;
    borderWidth?: number;
    borderStyle?: BorderStyle;
    fullWidth?: boolean;
    /** Tiêu đề hiển thị khi nút ở trạng thái đã tick (dùng với actionId 'toggle:<key>') */
    checkedTitle?: string;
    /** Màu nền khi nút đã được tick */
    checkedBackgroundColor?: DynamicColor;
    /** Màu chữ khi nút đã được tick */
    checkedTextColor?: DynamicColor;
  };
}

export interface ZStackProps extends ContainerProps {
  zAlignment?:
    | 'center'
    | 'topLeading'
    | 'top'
    | 'topTrailing'
    | 'leading'
    | 'trailing'
    | 'bottomLeading'
    | 'bottom'
    | 'bottomTrailing';
}

export interface ZStackNode extends BaseNode {
  type: 'ZStack';
  props?: ZStackProps;
  children: LayoutNode[];
}

export interface GridProps extends ContainerProps {
  /** Số cột của lưới (mặc định 2) */
  columns?: number;
  /** Khoảng cách ngang giữa các cột (mặc định 8) */
  columnSpacing?: number;
  /** Khoảng cách dọc giữa các hàng (mặc định 8) */
  rowSpacing?: number;
}

export interface GridNode extends BaseNode {
  type: 'Grid';
  props?: GridProps;
  children: LayoutNode[];
}

export interface DividerNode extends BaseNode {
  type: 'Divider';
  props?: {
    color?: DynamicColor;
    thickness?: number;
    direction?: 'horizontal' | 'vertical';
    dashed?: boolean;
    marginVertical?: number;
    marginHorizontal?: number;
  };
}

export interface GaugeNode extends BaseNode {
  type: 'Gauge';
  props: AccessibilityProps & {
    /** Giá trị tiến độ từ 0.0 đến 1.0 hoặc biểu thức binding */
    value: number | string | DataBindingField<any>;
    /** Chuỗi hiển thị chính giữa đồng hồ (vd "85%", "120 km/h", "420") */
    valueText?: string;
    /** Nhãn phụ bên dưới đồng hồ (vd "KPI", "Kcal", "AQI") */
    label?: string;
    /** Nhãn cực tiểu (góc trái dưới, vd "0") */
    minLabel?: string;
    /** Nhãn cực đại (góc phải dưới, vd "100") */
    maxLabel?: string;
    tintColor?: string;
    trackColor?: string;
    textColor?: string;
    labelColor?: string;
    /** Kích thước đường kính đồng hồ (mặc định 64) */
    size?: number;
    /** Độ dày nét vẽ cung đồng hồ (mặc định 7) */
    strokeWidth?: number;
    /** Tự động ẩn hoặc làm mờ đồng hồ khi màn hình khóa */
    privacySensitive?: boolean;
    /** Cho phép đồng hồ đổi màu theo StandBy / Tinted iOS 17+ / iOS 18 */
    widgetAccentable?: boolean;
  };
}

export interface ChartNode extends BaseNode {
  type: 'Chart';
  props: {
    /** Kiểu biểu đồ: 'bar' (cột) | 'line' (đường xu hướng Sparkline) */
    style?: 'bar' | 'line';
    /** Mảng dữ liệu số (ví dụ [45, 72, 60, 95, 80, 110, 92]) */
    values: number[];
    /** Nhãn trục ngang tương ứng (ví dụ ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) */
    labels?: string[];
    tintColor?: string;
    secondaryColor?: string;
    labelColor?: string;
    /** Chiều cao vùng vẽ biểu đồ (mặc định 56) */
    height?: number;
    /** Có hiển thị chấm tròn tại các đỉnh của biểu đồ đường không */
    showDots?: boolean;
    /** Tự động ẩn hoặc làm mờ biểu đồ khi màn hình khóa */
    privacySensitive?: boolean;
  };
}

export interface ToggleNode extends BaseNode {
  type: 'Toggle';
  props: AccessibilityProps & {
    /** Mã định danh toggle (tự động gắn tiền tố 'toggle:' nếu chưa có) */
    actionId: string;
    label: string;
    subtitle?: string;
    /** 'checkbox' (ô tích) | 'switch' (công tắc gạt) */
    style?: 'checkbox' | 'switch';
    checked?: boolean;
    isChecked?: boolean;
    tintColor?: string;
    textColor?: string;
    checkedTextColor?: string;
    fontSize?: number;
    strikethroughOnCheck?: boolean;
  };
}

export interface BadgeNode extends BaseNode {
  type: 'Badge';
  props: {
    text: string;
    systemName?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
    borderRadius?: number;
    cornerRadius?: number;
  };
}

export interface LinkProps extends ContainerProps {
  /** URL Deep Link mở màn hình cụ thể trong App (vd 'fastdo://orders/9920') */
  deepLink?: string;
  /** Hoặc chạy Action ngầm trên Widget ('page:...', 'toggle:...', 'refresh') */
  actionId?: string;
}

export interface LinkNode extends BaseNode {
  type: 'Link';
  props: LinkProps;
  children: LayoutNode[];
}

export interface EqualizerProps {
  /** Trạng thái đang phát nhạc hay tạm dừng (mặc định: true) */
  isPlaying?: boolean;
  /** Số lượng thanh sóng nhạc (mặc định: 4, từ 3 đến 8) */
  barCount?: number;
  /** Màu sắc của thanh sóng nhạc (mặc định: '#10B981' - xanh Spotify / Apple Music) */
  tintColor?: string;
  /** Chiều cao tối đa của thanh sóng (mặc định: 16) */
  height?: number;
  /** Độ rộng của mỗi thanh (mặc định: 3) */
  barWidth?: number;
  /** Khoảng cách giữa các thanh (mặc định: 2) */
  spacing?: number;
  /**
   * Frame sóng nhạc (số nguyên tăng dần). iOS không cho Live Activity / Widget tự chạy animation lặp,
   * nên app cần cập nhật `phase` định kỳ (vd. mỗi ~1s khi đang phát) — renderer sẽ animate chuyển tiếp
   * độ cao các thanh giữa 2 frame. Bỏ trống = hiển thị icon sóng tĩnh.
   */
  phase?: number;
  /** Mức âm lượng thực tế từng thanh (0..1). Nếu truyền, ưu tiên hơn `phase`. */
  levels?: number[];
}

export interface EqualizerNode extends BaseNode {
  type: 'Equalizer';
  props?: EqualizerProps;
}

export interface CustomNode extends BaseNode {
  type: 'Custom';
  props: {
    /** Tên định danh Component đã đăng ký trong DynamicNodeRegistry (Swift / Kotlin) */
    componentName: string;
    [key: string]: any;
  };
  children?: LayoutNode[];
}

export type LayoutNode =
  | VStackNode
  | HStackNode
  | ZStackNode
  | GridNode
  | DividerNode
  | TextNode
  | TimerNode
  | ProgressNode
  | GaugeNode
  | ChartNode
  | ImageNode
  | SpacerNode
  | ButtonNode
  | ToggleNode
  | BadgeNode
  | LinkNode
  | EqualizerNode
  | CustomNode;

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

export interface AlertConfig {
  title: string;
  body: string;
  sound?: 'default' | string;
}

export type LiveActivityLifecycleState =
  | 'active'
  | 'started_by_push'
  | 'stale'
  | 'expired'
  | 'ended'
  | 'dismissed';

export interface LiveActivityStateEvent {
  activityId: string;
  systemActivityId?: string;
  state: LiveActivityLifecycleState;
  timestamp: number;
  pushToken?: string;
}

export interface StartActivityOptions {
  activityId: string;
  lockScreen: LayoutNode;
  dynamicIsland?: DynamicIslandConfig;
  phases?: PhaseConfig[];
  /** Epoch timestamp (giây hoặc ms) mà từ thời điểm đó Activity bị coi là cũ (Stale) */
  staleTimestamp?: number;
  /** Giao diện Lock Screen dự phòng hiển thị khi Activity chuyển sang trạng thái Stale */
  staleLockScreen?: LayoutNode;
  /** Giao diện Dynamic Island dự phòng hiển thị khi Activity chuyển sang trạng thái Stale */
  staleDynamicIsland?: DynamicIslandConfig;
  /** Điểm ưu tiên hiển thị trên Lock Screen & Dynamic Island khi có nhiều Live Activity (0.0 -> 100.0) */
  relevanceScore?: number;
  /** Cấu hình cảnh báo chuông / banner khi khởi chạy hoặc cập nhật */
  alertConfig?: AlertConfig;
  alertTitle?: string;
  alertBody?: string;
  /** Epoch timestamp (giây hoặc ms) tự động kết thúc Activity khi đến hạn */
  scheduledEndTimestamp?: number;
  /** Hoặc số giây tự động kết thúc tính từ lúc gọi start() */
  autoEndAfterSeconds?: number;
  /** Giao diện Lock Screen tổng kết tự động hiển thị khi Activity hết hạn (Scheduled End) */
  expiredLockScreen?: LayoutNode;
  /** Chính sách dọn dẹp sau khi hết hạn tự động */
  expiredDismissalPolicy?: 'immediate' | 'default' | 'afterDate';
}

export interface UpdateActivityOptions {
  activityId: string;
  lockScreen?: LayoutNode;
  dynamicIsland?: DynamicIslandConfig;
  staleTimestamp?: number;
  staleLockScreen?: LayoutNode;
  staleDynamicIsland?: DynamicIslandConfig;
  relevanceScore?: number;
  alertConfig?: AlertConfig;
  alertTitle?: string;
  alertBody?: string;
  scheduledEndTimestamp?: number;
  autoEndAfterSeconds?: number;
  expiredLockScreen?: LayoutNode;
  expiredDismissalPolicy?: 'immediate' | 'default' | 'afterDate';
}

export interface EndActivityOptions {
  /**
   * Chính sách kết thúc Live Activity trên hệ thống:
   * - 'immediate': Biến mất ngay lập tức (mặc định)
   * - 'default': Giữ lại thẻ hoàn thành trên màn hình khóa tối đa 4 tiếng (như Grab/Shopee)
   * - 'afterDate': Giữ lại trong số giây xác định rồi tự động ẩn
   */
  dismissalPolicy?: 'immediate' | 'default' | 'afterDate';
  /** Số giây giữ lại trên Lock Screen (dùng khi dismissalPolicy = 'afterDate', mặc định 900 = 15 phút) */
  dismissalAfterSeconds?: number;
  /** Layout Lock Screen tổng kết cuối cùng hiển thị trước khi phiên Live Activity đóng */
  finalLockScreen?: LayoutNode;
  /** Layout Dynamic Island tổng kết cuối cùng trước khi phiên Live Activity đóng */
  finalDynamicIsland?: DynamicIslandConfig;
}

export interface WidgetSinglePageConfig {
  small?: LayoutNode;
  medium?: LayoutNode;
  large?: LayoutNode;
  /** Tiện ích cỡ cực đại cho iPadOS / Tablet (systemExtraLarge) & Android 4x4+ */
  extraLarge?: LayoutNode;
  /** Chế độ iOS 17+ StandBy Mode (hiển thị chữ/số lớn khi đặt ngang sạc pin đầu giường) */
  standBy?: LayoutNode;
  /** Màn hình khóa iOS 16+: Tiện ích hình chữ nhật bo góc dưới đồng hồ */
  accessoryRectangular?: LayoutNode;
  /** Màn hình khóa iOS 16+: Tiện ích ô tròn nhỏ dưới đồng hồ (Gauge / Circular Progress / Icon) */
  accessoryCircular?: LayoutNode;
  /** Màn hình khóa iOS 16+: Tiện ích 1 dòng chữ nhỏ trên đồng hồ */
  accessoryInline?: LayoutNode;
}

/** Cấu hình Control Widget (iOS 18+ Control Center / Action Button & Android Quick Settings Tile) */
export interface ControlWidgetConfig {
  type?: 'button' | 'toggle';
  title: string;
  subtitle?: string;
  checkedTitle?: string;
  checkedSubtitle?: string;
  systemName?: string;
  tintColor?: string;
  checked?: boolean;
  actionId: string;
  deepLink?: string;
}

export interface WidgetLayoutConfig extends WidgetSinglePageConfig {
  /**
   * Danh sách các trang/tab của Widget để chuyển qua lại ngay trên mặt Widget (không mở App).
   * Ví dụ: { shift: { small, medium, large }, todo: { small, medium, large } }
   */
  pages?: Record<string, WidgetSinglePageConfig>;
  /** Thứ tự các trang khi bấm nút 'page:next' hoặc 'page:prev' */
  pageOrder?: string[];
  /** Trang hiển thị mặc định ban đầu */
  initialPage?: string;
  /**
   * URL Deep Link khi người dùng chạm vào bất kỳ đâu trên mặt Widget (mở App đến màn hình đích).
   * Rất quan trọng cho Small Widget vì iOS chỉ cho phép 1 liên kết cho toàn bộ widget nhỏ.
   */
  rootDeepLink?: string;
  /**
   * Cấu hình màu nền container hoặc gradient (chuẩn iOS 17 StandBy Mode & macOS Desktop).
   */
  containerBackground?: {
    backgroundColor?: DynamicColor;
    gradientColors?: string[];
  };
}

export interface WidgetTimelineEntry {
  /** Epoch timestamp (giây hoặc mili-giây) hoặc chuỗi ISO thời điểm chuyển sang layout này */
  date: number | string;
  /** Cấu hình layout tại mốc thời gian tương ứng */
  layout: WidgetLayoutConfig;
}

export interface WidgetTimelineConfig {
  /** Danh sách các mốc thời gian và layout tương ứng */
  entries: WidgetTimelineEntry[];
  /**
   * Chính sách làm mới khi chạy hết Timeline:
   * - 'atEnd': Tự động yêu cầu timeline mới khi hết danh sách (mặc định)
   * - 'never': Không tự động làm mới thêm nữa
   * - 'afterDate': Yêu cầu làm mới sau một mốc thời gian xác định
   */
  policy?: 'atEnd' | 'never' | 'afterDate';
  /** Timestamp (epoch giây hoặc ms) tiếp tục nạp timeline mới khi policy = 'afterDate' */
  afterDate?: number | string;
}

export interface WidgetConfigOption {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
}

export interface WidgetDataSchema {
  /** Danh sách các key bắt buộc phải có trong dữ liệu sau khi flatten (vd ['user.name', 'attendance.progress']) */
  requiredKeys?: string[];
  /** Kiểm tra kiểu giá trị cơ bản của các key */
  types?: Record<string, 'string' | 'number' | 'boolean'>;
  /** Giá trị mặc định bù vào nếu key bị thiếu hoặc null */
  defaults?: Record<string, string | number | boolean>;
}

export interface WidgetAuthRefreshConfig {
  /** Endpoint cấp lại Access Token khi request chính gặp HTTP 401 */
  url: string;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  /** Đường dẫn JSON lấy token mới từ phản hồi (mặc định 'accessToken' hoặc 'token') */
  tokenPath?: string;
  /** Tên header gắn token mới (mặc định 'Authorization') */
  headerName?: string;
  /** Tiền tố giá trị header (mặc định 'Bearer ') */
  headerPrefix?: string;
}

export interface WidgetRemoteSourceConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  timeoutMs?: number;
  enableETag?: boolean;
}

export interface WidgetRemoteConfig {
  /** URL API chính mà Widget Extension sẽ tự gọi ngầm (kể cả khi App chính đã bị kill) */
  url?: string;
  /** HTTP Method (mặc định 'GET') */
  method?: 'GET' | 'POST' | 'PUT';
  /** Payload gửi kèm cho POST / PUT */
  body?: string | Record<string, any>;
  /** Headers xác thực (ví dụ { Authorization: 'Bearer ...' }) */
  headers?: Record<string, string>;
  /** Thời gian chờ phản hồi mạng tính bằng mili-giây (mặc định 8000ms) */
  timeoutMs?: number;
  /** Thời gian sống của cache (giây) để tránh gọi API liên tục khi OS reload timeline */
  cacheTtlSeconds?: number;
  /** Bật Conditional Request qua header If-None-Match / If-Modified-Since & HTTP 304 */
  enableETag?: boolean;
  /** Số lần thử lại tối đa khi lỗi mạng hoặc HTTP 5xx (mặc định 0, exponential backoff) */
  maxRetries?: number;
  /** Độ trễ gốc (ms) cho lần retry đầu tiên (mặc định 500ms) */
  retryDelayMs?: number;
  /** Gọi đồng thời nhiều nguồn API, biến được gộp theo tiền tố `<sourceKey>.<path>` */
  sources?: Record<string, WidgetRemoteSourceConfig>;
  /** Ánh xạ tên biến đích: { targetKey: 'source.path|pipe' } */
  mapping?: Record<string, string>;
  /** Kiểm định dữ liệu trước khi cập nhật biến hiển thị trên Widget */
  schema?: WidgetDataSchema;
  /** Cấu hình tự động làm mới token nếu API trả HTTP 401 */
  authRefresh?: WidgetAuthRefreshConfig;
  /** Layout hiển thị dự phòng khi đồng bộ lỗi (hoặc dùng biến `{{_syncStatus}}`, `{{_syncError}}`, `{{_httpStatus}}`) */
  errorFallback?: LayoutNode;
  /**
   * Mốc thời gian đề xuất sớm nhất (phút) cho OS tải lại timeline.
   * Lưu ý: iOS WidgetKit dùng ngân sách động (~40–70 lần/ngày) và Android có Doze Mode,
   * nên đây không phải cam kết đồng bộ chính xác từng phút khi app đóng.
   */
  refreshIntervalMinutes?: number;
  /** Alias ngắn gọn cho refreshIntervalMinutes */
  intervalMinutes?: number;
}

// ─── 13B. STRUCTURED DATA BINDING ────────────────────────────────────────────

export interface WidgetDataPipeOptions {
  default?: string | number | boolean;
  divide?: number;
  multiply?: number;
  add?: number;
  round?: number;
  upper?: boolean;
  lower?: boolean;
  currency?: string;
  percent?: number;
  ifTruthy?: [string | number, (string | number)?];
}

export interface DataBindingMethods<V = any> {
  readonly __isDataBinding: true;
  readonly __bindingPath: string;
  readonly __bindingPipes: string[];
  toToken(): string;
  toString(): string;
  valueOf(): string;
  toJSON(): string;
  default(fallback: string | number | boolean): DataBindingField<V>;
  divide(divisor: number): DataBindingField<number>;
  multiply(factor: number): DataBindingField<number>;
  add(offset: number): DataBindingField<number>;
  round(decimals?: number): DataBindingField<number>;
  upper(): DataBindingField<string>;
  lower(): DataBindingField<string>;
  currency(symbol?: string): DataBindingField<string>;
  percent(decimals?: number): DataBindingField<string>;
  ifTruthy(thenValue: string | number, elseValue?: string | number): DataBindingField<string>;
}

export type DataBindingField<T = any> = DataBindingMethods<T> &
  (T extends Array<infer U>
    ? { readonly [index: number]: DataBindingField<U> }
    : T extends object
    ? { readonly [K in keyof T]-?: DataBindingField<T[K]> }
    : unknown);

export type DataBindingProxy<T = Record<string, any>> = DataBindingField<T>;

export interface LiveActivityPushTokens {
  /** Token APNs của thiết bị (Device Token 64-hex chars) dùng cho Push Notification / Silent Push */
  devicePushToken: string | null;
  /** Token APNs Push-to-Start (iOS 17.2+) để Backend kích hoạt mở mới Live Activity từ xa */
  pushToStartToken: string | null;
  /** Token APNs Update của phiên Live Activity hiện tại để Backend đẩy bản cập nhật / kết thúc */
  activityUpdateToken: string | null;
  /** Map toàn bộ { [activityId]: updateToken } đang hoạt động */
  allActivityUpdateTokens: Record<string, string>;
}

export interface ActiveActivityInfo {
  activityId: string;
  systemActivityId?: string;
  activityState?: 'active' | 'stale' | 'ended' | 'dismissed' | 'expired' | string;
  isStale?: boolean;
  relevanceScore?: number;
  staleTimestamp?: number;
  scheduledEndTimestamp?: number;
  pushToken?: string;
}

/**
 * 📊 Bảng tra cứu năng lực nền tảng (Platform Capability & Fallback Matrix).
 * Cho phép ứng dụng kiểm tra tính năng được hỗ trợ thực tế trên thiết bị đang chạy
 * thay vì phỏng đoán, đảm bảo UI hoạt động ổn định và graceful fallback mượt mà.
 */
export interface WidgetCapabilities {
  /** Nền tảng hệ điều hành ('ios' hoặc 'android') */
  platform: 'ios' | 'android';
  /** Phiên bản OS (ví dụ '18.1', '17.2', '14.0' Android API 34) */
  osVersion: string | number;
  /** Hỗ trợ Live Activities trên Lock Screen (iOS 16.1+ / Android 8.0+ Ongoing Notification) */
  supportsLiveActivities: boolean;
  /** Hỗ trợ Dynamic Island (iPhone 14 Pro, 15, 16 series) */
  supportsDynamicIsland: boolean;
  /** Hỗ trợ Android 16+ Live Update thông báo kiểu tiến trình ProgressStyle */
  supportsAndroidLiveUpdates: boolean;
  /** Hỗ trợ ghim tiện ích Home Screen Widgets (iOS 14+ / Android 8.0+) */
  supportsHomeWidgets: boolean;
  /** Hỗ trợ tương tác bấm nút chạy ngầm không mở app (iOS 17+ AppIntent / Android PendingIntent) */
  supportsInteractiveIntents: boolean;
  /** Hỗ trợ dải màu chuyển tiếp Linear / Radial Gradient */
  supportsGradients: boolean;
  /** Hỗ trợ bóng đổ Elevation / Shadow layer */
  supportsShadows: boolean;
  /** Hỗ trợ viền nét đứt Dashed / Dotted Stroke */
  supportsDashedBorders: boolean;
  /** Hỗ trợ tự động co giãn cỡ chữ theo Trợ năng (Accessibility Dynamic Type) */
  supportsDynamicType: boolean;
  /** Hỗ trợ bố cục quốc tế hoá từ phải sang trái (RTL: Arabic, Hebrew, ...) */
  supportsRTL: boolean;
  /** Hỗ trợ chế độ màu Tinted / Accented Widgets (iOS 18+ / Android Material You) */
  supportsTintedMode: boolean;
  /** Hỗ trợ hiệu ứng Odometer số lật (iOS 16+ numericText) */
  supportsNumericAnimation: boolean;
  /** Hỗ trợ lớp Trợ năng phân cấp (Accessibility Fallback Layer: VoiceOver & TalkBack contentDescription) */
  supportsAccessibility: boolean;
}

// ─── 14. UI INTERMEDIATE REPRESENTATION (IR) & SEMANTIC TREE (Phase 2) ────────

/**
 * Mục tiêu kết xuất của bộ điều phối Renderer Planner.
 * - 'native_remote_view': Kết xuất thành RemoteViews native (TextView, Button, ProgressBar).
 * - 'canvas_bitmap': Kết xuất qua Canvas 2D Bitmap (Gauge 240°, Equalizer, đồ họa phức tạp).
 * - 'composite': Vùng chứa phức hợp kết hợp cả Native Views và Canvas sub-views.
 */
export type RenderPlanTarget = 'native_remote_view' | 'canvas_bitmap' | 'composite';

/**
 * Kế hoạch kết xuất cho từng Node trong cây UI.
 */
export interface NodeRenderPlan {
  id: string;
  type: LayoutNodeType;
  target: RenderPlanTarget;
  reason: string;
  hasNativeEquivalent: boolean;
  requiresCanvas: boolean;
  childrenTargets?: RenderPlanTarget[];
}

/**
 * ♿ Nút ngữ nghĩa độc lập (Semantic Node) tách biệt hoàn toàn khỏi Renderer.
 */
export interface SemanticNode {
  id: string;
  path: string;
  type: LayoutNodeType;
  role: AccessibilityRole;
  label: string;
  hint?: string;
  value?: string | number;
  interactive: boolean;
  actionId?: string;
  deepLink?: string;
  isDecorative?: boolean;
}

/**
 * Liên kết trạng thái hai chiều giữa UI và Native Store / JavaScript.
 */
export interface StateBinding {
  id: string;
  actionId: string;
  bindingType: 'toggle' | 'page' | 'custom';
  targetKey?: string;
  initialValue?: any;
}

/**
 * 🌲 UI Intermediate Representation (Cây đại diện trung gian IR).
 * Chuẩn hóa toàn bộ cấu trúc UI, Semantic Tree, Kế hoạch kết xuất (Render Plan)
 * và Liên kết trạng thái (State Bindings) trước khi chuyển giao cho Renderer nền tảng.
 */
export interface WidgetIR {
  version: '2.0';
  timestamp: number;
  root: LayoutNode;
  semanticTree: SemanticNode[];
  semanticSummary: string;
  renderPlan: {
    overallStrategy: 'native_first_hybrid' | 'canvas_fallback';
    nativeNodeCount: number;
    canvasNodeCount: number;
    nodes: Record<string, NodeRenderPlan>;
  };
  stateBindings: StateBinding[];
}
