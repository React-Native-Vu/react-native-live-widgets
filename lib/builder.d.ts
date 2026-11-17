import { BadgeNode, ButtonNode, ChartNode, ContainerProps, ControlWidgetConfig, CustomNode, DataBindingField, DataBindingProxy, DividerNode, EqualizerNode, EqualizerProps, GaugeNode, GridNode, GridProps, HStackNode, ImageNode, LayoutNode, LinkNode, LinkProps, ProgressNode, SpacerNode, StyleProp, TextNode, TextStyle, TimerNode, ToggleNode, VStackNode, WidgetDataPipeOptions, ZStackNode, ZStackProps } from './types';
export declare function isDataBinding(value: any): value is DataBindingField<any>;
export declare function resolveBindingValue(value: any): any;
/**
 * Tạo đối tượng Data Binding có cấu trúc & gợi ý kiểu TypeScript để nhúng trực tiếp vào JSX/DSL Widget.
 */
export declare function createDataBinding<T extends Record<string, any> = Record<string, any>>(options?: {
    defaults?: Record<string, any>;
    prefix?: string;
}): DataBindingProxy<T>;
/**
 * Làm phẳng đệ quy JSON lồng nhau thành các đường dẫn dot-notation (`user.name`, `items.0.title`).
 */
export declare function flattenDataObject(obj: any, prefix?: string, out?: Record<string, string>): Record<string, string>;
/**
 * Thực thi các phép biến đổi Pipe trên chuỗi giá trị thô (đồng bộ 1:1 với Swift & Kotlin).
 */
export declare function evaluateTemplatePipe(rawValue: string | undefined, pipes: string[]): string;
/**
 * Thay thế toàn bộ token `{{path|pipe1|pipe2}}` trong chuỗi theo bản đồ biến (hỗ trợ cả JSON lồng nhau).
 */
export declare function resolveTemplateString(template: string, vars: Record<string, any>): string;
export declare function flattenStyle<T extends object>(...styles: StyleProp<T>[]): T | undefined;
export type AnyWidgetStyle = TextStyle | ContainerProps | Record<string, any>;
export type NamedStyles<T> = {
    [P in keyof T]: AnyWidgetStyle;
};
export declare const StyleSheet: {
    create: <T extends NamedStyles<T> | NamedStyles<any>>(styles: T & NamedStyles<any>) => T;
    flatten: typeof flattenStyle;
};
/**
 * Các hàm helper tạo node cây giao diện trực quan cho TypeScript/JavaScript
 */
export declare const UI: {
    StyleSheet: {
        create: <T extends NamedStyles<T> | NamedStyles<any>>(styles: T & NamedStyles<any>) => T;
        flatten: typeof flattenStyle;
    };
    VStack: (propsOrChildren?: StyleProp<ContainerProps> | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => VStackNode;
    HStack: (propsOrChildren?: StyleProp<ContainerProps> | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => HStackNode;
    Text: (text: string | DataBindingField<any>, ...styles: StyleProp<TextStyle>[]) => TextNode;
    Timer: (targetTimestamp: number, options?: {
        mode?: "countdown" | "countup";
        color?: string;
        fontSize?: number;
        fontWeight?: "regular" | "medium" | "semibold" | "bold";
        prefix?: string;
        suffix?: string;
    }) => TimerNode;
    Progress: (valueOrOptions: number | string | DataBindingField<any> | ProgressNode["props"], options?: Omit<ProgressNode["props"], "value">) => ProgressNode;
    Image: (urlOrOptions: string | DataBindingField<any> | ImageNode["props"], options?: Omit<ImageNode["props"], "url">) => ImageNode;
    Spacer: (minLength?: number) => SpacerNode;
    Button: (titleOrProps: string | DataBindingField<any> | ButtonNode["props"], options?: Omit<ButtonNode["props"], "title">) => ButtonNode;
    /**
     * Tạo nút bấm kèm logic hàm TypeScript trực tiếp.
     * Thư viện tự động sinh ActionId và kết nối bộ lắng nghe Native -> hàm async TypeScript của bạn!
     */
    ActionButton: (title: string, onPress: (payload?: any) => Promise<any> | any, options?: Omit<ButtonNode["props"], "title" | "actionId" | "onPress">) => ButtonNode;
    ZStack: (propsOrChildren?: ZStackProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => ZStackNode;
    Grid: (propsOrChildren?: GridProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => GridNode;
    Divider: (options?: DividerNode["props"]) => DividerNode;
    Gauge: (valueOrOptions: number | string | DataBindingField<any> | GaugeNode["props"], options?: Omit<GaugeNode["props"], "value">) => GaugeNode;
    Chart: (valuesOrOptions: number[] | ChartNode["props"], options?: Omit<ChartNode["props"], "values">) => ChartNode;
    Toggle: (labelOrOptions: string | ToggleNode["props"], options?: Omit<ToggleNode["props"], "label">) => ToggleNode;
    Badge: (textOrOptions: string | DataBindingField<any> | BadgeNode["props"], options?: Omit<BadgeNode["props"], "text">) => BadgeNode;
    Link: (props: LinkProps, ...children: LayoutNode[]) => LinkNode;
    /**
     * Khởi tạo một Component Native tùy chỉnh đã được đăng ký qua:
     * - iOS (Swift): `DynamicNodeRegistry.shared.register("MyComponent") { node in ... }`
     * - Android (Kotlin): `DynamicNodeRegistry.register("MyComponent", ...)`
     */
    Custom: (componentName: string, props?: Record<string, any>, ...children: LayoutNode[]) => CustomNode;
    /**
     * Component sóng nhạc chuyển động (Equalizer / Sound Visualizer):
     * Tự động chạy animation nhịp sóng nhạc mượt mà trên Dynamic Island và Lock Screen (iOS)
     * và hiển thị trực quan trên Android.
     */
    Equalizer: (options?: EqualizerProps) => EqualizerNode;
    /**
     * Cấu hình Control Button cho iOS 18+ Control Center / Action Button & Android Quick Settings Tile.
     */
    ControlButton: (options: Omit<ControlWidgetConfig, "type" | "actionId"> & {
        actionId?: string;
        onPress?: (payload?: any) => Promise<any> | any;
    }) => ControlWidgetConfig;
    /**
     * Cấu hình Control Toggle 2 trạng thái cho iOS 18+ Control Center & Android Quick Settings Tile.
     */
    ControlToggle: (options: Omit<ControlWidgetConfig, "type" | "actionId"> & {
        actionId?: string;
        onPress?: (payload?: any) => Promise<any> | any;
    }) => ControlWidgetConfig;
    /**
     * Tạo biểu thức Data Binding chuỗi token (`{{path|pipe1|pipe2}}`) dùng với Background Data Engine 2.0.
     */
    bind: (path: string, pipes?: WidgetDataPipeOptions) => string;
    /**
     * Tạo Proxy Data Binding có cấu trúc & gợi ý kiểu TypeScript (`data.user.name`, `data.attendance.progress.divide(100)`).
     */
    createDataBinding: typeof createDataBinding;
};
//# sourceMappingURL=builder.d.ts.map