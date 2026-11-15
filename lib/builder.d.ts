import { BadgeNode, ButtonNode, ChartNode, ContainerProps, CustomNode, DividerNode, GaugeNode, GridNode, GridProps, HStackNode, ImageNode, LayoutNode, LinkNode, LinkProps, ProgressNode, SpacerNode, StyleProp, TextNode, TextStyle, TimerNode, ToggleNode, VStackNode, ZStackNode, ZStackProps } from './types';
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
    Text: (text: string, ...styles: StyleProp<TextStyle>[]) => TextNode;
    Timer: (targetTimestamp: number, options?: {
        mode?: "countdown" | "countup";
        color?: string;
        fontSize?: number;
        fontWeight?: "regular" | "medium" | "semibold" | "bold";
        prefix?: string;
        suffix?: string;
    }) => TimerNode;
    Progress: (valueOrOptions: number | ProgressNode["props"], options?: Omit<ProgressNode["props"], "value">) => ProgressNode;
    Image: (urlOrOptions: string | ImageNode["props"], options?: Omit<ImageNode["props"], "url">) => ImageNode;
    Spacer: (minLength?: number) => SpacerNode;
    Button: (title: string, options?: Omit<ButtonNode["props"], "title">) => ButtonNode;
    ZStack: (propsOrChildren?: ZStackProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => ZStackNode;
    Grid: (propsOrChildren?: GridProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => GridNode;
    Divider: (options?: DividerNode["props"]) => DividerNode;
    Gauge: (valueOrOptions: number | GaugeNode["props"], options?: Omit<GaugeNode["props"], "value">) => GaugeNode;
    Chart: (valuesOrOptions: number[] | ChartNode["props"], options?: Omit<ChartNode["props"], "values">) => ChartNode;
    Toggle: (labelOrOptions: string | ToggleNode["props"], options?: Omit<ToggleNode["props"], "label">) => ToggleNode;
    Badge: (textOrOptions: string | BadgeNode["props"], options?: Omit<BadgeNode["props"], "text">) => BadgeNode;
    Link: (props: LinkProps, ...children: LayoutNode[]) => LinkNode;
    /**
     * Khởi tạo một Component Native tùy chỉnh đã được đăng ký qua:
     * - iOS (Swift): `DynamicNodeRegistry.shared.register("MyComponent") { node in ... }`
     * - Android (Kotlin): `DynamicNodeRegistry.register("MyComponent", ...)`
     */
    Custom: (componentName: string, props?: Record<string, any>, ...children: LayoutNode[]) => CustomNode;
};
//# sourceMappingURL=builder.d.ts.map