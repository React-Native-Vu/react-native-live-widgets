/**
 * Schema cho cây giao diện linh hoạt (Declarative Layout Engine)
 * Tầng JS truyền cây này sang Native để render trên:
 * - Lock Screen & Dynamic Island (Live Activity)
 * - Home Screen Widgets (Màn hình chính Small / Medium / Large)
 * - Android Live Update & Ongoing Notification
 */
export type LayoutNodeType = 'VStack' | 'HStack' | 'ZStack' | 'Grid' | 'Divider' | 'Text' | 'Timer' | 'Progress' | 'Gauge' | 'Chart' | 'Image' | 'Spacer' | 'Button' | 'Toggle' | 'Badge' | 'Link' | 'Equalizer' | 'Custom';
/**
 * Định dạng màu hỗ trợ chuỗi Hex đơn (ví dụ '#0F172A')
 * hoặc Object Dynamic Color tự đổi theo chế độ Sáng / Tối (Dark Mode) của hệ điều hành.
 */
export type DynamicColor = string | {
    light: string;
    dark: string;
};
export interface BaseNode {
    type: LayoutNodeType;
}
export interface ContainerProps {
    padding?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
    spacing?: number;
    backgroundColor?: DynamicColor;
    borderRadius?: number;
    borderColor?: DynamicColor;
    borderWidth?: number;
    alignment?: 'leading' | 'center' | 'trailing' | string;
    justifyContent?: 'flexStart' | 'center' | 'flexEnd' | 'spaceBetween' | string;
    /** Tự động ẩn hoặc làm mờ nội dung khi thiết bị đang khóa màn hình (Bảo mật chuẩn Apple) */
    privacySensitive?: boolean;
    /** Chủ động che nội dung thành vệt khối mờ Placeholder (Skeleton Redaction) */
    redacted?: boolean;
}
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'light' | (string & {}) | string;
export interface TextStyle {
    color?: DynamicColor;
    fontSize?: number;
    fontWeight?: FontWeight;
    numberOfLines?: number;
    strikethroughWhenToggled?: string;
    /** Tự động làm mờ hoặc ẩn chữ khi màn hình khóa (iOS Privacy Redacted) */
    privacySensitive?: boolean;
    /** Chủ động che nội dung thành vệt khối mờ Placeholder (Skeleton Redaction) */
    redacted?: boolean;
    /** Hiệu ứng cuộn lật số mượt mà kiểu Odometer (iOS 16+ numericText animation) khi số liệu thay đổi */
    numericAnimation?: boolean;
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
    props: {
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
    props: {
        /** Mốc bắt đầu (epoch giây) nếu dùng timer interval tự chạy */
        startTimestamp?: number;
        /** Mốc kết thúc (epoch giây) */
        targetTimestamp?: number;
        /** Giá trị cố định từ 0.0 đến 1.0 (nếu không dùng timer) */
        value?: number;
        /** 'bar': thanh liền mạch | 'segmented': thanh nhiều chặng | 'circular': vòng tròn % */
        style?: 'bar' | 'segmented' | 'circular';
        /** true: thanh rút ngắn dần về 0 (như đếm ngược OTP/Flash sale) | false: thanh đầy dần lên 100% */
        countsDown?: boolean;
        /** Chiều cao / độ dày thanh (pixel). Mặc định 6 */
        height?: number;
        /** Bo góc thanh. Mặc định bo tròn hoàn toàn */
        borderRadius?: number;
        /** Màu thanh khi lấp đầy (dạng '#RRGGBB' hoặc { light, dark }) */
        tintColor?: DynamicColor;
        /** Màu nền rãnh phía sau */
        trackColor?: DynamicColor;
        /** Dải màu Gradient lấp đầy (ví dụ ['#00C6FF', '#0072FF']) */
        gradientColors?: string[];
        /** Số giây cuối trước khi hết hạn để tự đổi sang màu cảnh báo (vd 300 = còn 5 phút) */
        warningSeconds?: number;
        /** Màu cảnh báo khi bước vào giai đoạn warningSeconds (mặc định '#FFA500' cam hoặc đỏ) */
        warningTintColor?: DynamicColor;
        /** Tổng số chặng (ví dụ 4 bước: Đặt -> Nhận -> Nấu -> Giao) */
        segments?: number;
        /** Chặng hiện tại đang ở (từ 1 đến segments) */
        currentSegment?: number;
        /** Khoảng cách giữa các chặng (pixel) */
        segmentSpacing?: number;
        /** Icon SF Symbol chạy ở đầu thanh tiến trình (ví dụ 'car.fill', 'figure.walk') */
        trackerSystemName?: string;
        /** Tên asset ảnh chạy ở đầu thanh tiến trình (ví dụ 'fasty_mascot') */
        trackerAssetName?: string;
        /** Kích thước của tracker icon (pixel). Mặc định 16 */
        trackerSize?: number;
        /** Có hiển thị chữ phần trăm ở góc không (ví dụ "75%") */
        showPercentage?: boolean;
        percentageColor?: DynamicColor;
    };
}
export interface ImageNode extends BaseNode {
    type: 'Image';
    props: {
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
    props: {
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
        textColor?: DynamicColor;
        fontSize?: number;
        fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
        padding?: number;
        paddingHorizontal?: number;
        paddingVertical?: number;
        borderRadius?: number;
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
    zAlignment?: 'center' | 'topLeading' | 'top' | 'topTrailing' | 'leading' | 'trailing' | 'bottomLeading' | 'bottom' | 'bottomTrailing';
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
    props: {
        /** Giá trị tiến độ từ 0.0 đến 1.0 */
        value: number;
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
    props: {
        /** Mã định danh toggle (tự động gắn tiền tố 'toggle:' nếu chưa có) */
        actionId: string;
        label: string;
        subtitle?: string;
        /** 'checkbox' (ô tích) | 'switch' (công tắc gạt) */
        style?: 'checkbox' | 'switch';
        checked?: boolean;
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
export type LayoutNode = VStackNode | HStackNode | ZStackNode | GridNode | DividerNode | TextNode | TimerNode | ProgressNode | GaugeNode | ChartNode | ImageNode | SpacerNode | ButtonNode | ToggleNode | BadgeNode | LinkNode | EqualizerNode | CustomNode;
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
    staleTimestamp?: number;
    alertTitle?: string;
    alertBody?: string;
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
    /** Màn hình khóa iOS 16+: Tiện ích hình chữ nhật bo góc dưới đồng hồ */
    accessoryRectangular?: LayoutNode;
    /** Màn hình khóa iOS 16+: Tiện ích ô tròn nhỏ dưới đồng hồ (Gauge / Circular Progress / Icon) */
    accessoryCircular?: LayoutNode;
    /** Màn hình khóa iOS 16+: Tiện ích 1 dòng chữ nhỏ trên đồng hồ */
    accessoryInline?: LayoutNode;
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
export interface WidgetRemoteConfig {
    /** URL API mà Widget Extension sẽ tự gọi ngầm (kể cả khi người dùng đã kill App chính) */
    url: string;
    /** HTTP Method (mặc định 'GET') */
    method?: 'GET' | 'POST';
    /** Headers xác thực (ví dụ { Authorization: 'Bearer ...' }) */
    headers?: Record<string, string>;
    /** Chu kỳ tự động gọi lại API tính bằng phút (mặc định 15 phút) */
    refreshIntervalMinutes?: number;
}
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
    pushToken?: string;
}
//# sourceMappingURL=types.d.ts.map