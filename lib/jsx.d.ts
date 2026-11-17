import { LayoutNode, ButtonNode, BadgeNode, ProgressNode, TimerNode, ImageNode, DividerNode, GaugeNode, ChartNode, ToggleNode, ContainerProps, TextStyle, ZStackProps, GridProps, LinkProps, EqualizerProps, StyleProp } from './types';
export declare function extractPropsAndStyle<T extends object>(props: any): any;
export interface VStackProps extends ContainerProps {
    children?: React.ReactNode;
    style?: StyleProp<ContainerProps>;
}
export declare const VStack: React.FC<VStackProps>;
export interface HStackProps extends ContainerProps {
    children?: React.ReactNode;
    style?: StyleProp<ContainerProps>;
}
export declare const HStack: React.FC<HStackProps>;
export interface ZStackJSXProps extends ZStackProps {
    children?: React.ReactNode;
    style?: StyleProp<ZStackProps>;
}
export declare const ZStack: React.FC<ZStackJSXProps>;
export interface GridJSXProps extends GridProps {
    children?: React.ReactNode;
    style?: StyleProp<GridProps>;
}
export declare const Grid: React.FC<GridJSXProps>;
export interface TextJSXProps extends TextStyle {
    children?: React.ReactNode;
    text?: string;
    style?: StyleProp<TextStyle>;
}
export declare const Text: React.FC<TextJSXProps>;
export type ButtonJSXProps = ButtonNode['props'] & {
    children?: React.ReactNode;
    style?: StyleProp<ButtonNode['props']>;
};
export declare const Button: React.FC<ButtonJSXProps>;
export type BadgeJSXProps = BadgeNode['props'] & {
    children?: React.ReactNode;
    style?: StyleProp<BadgeNode['props']>;
};
export declare const Badge: React.FC<BadgeJSXProps>;
export type ProgressJSXProps = ProgressNode['props'] & {
    style?: StyleProp<ProgressNode['props']>;
};
export declare const Progress: React.FC<ProgressJSXProps>;
export type TimerJSXProps = TimerNode['props'] & {
    style?: StyleProp<TimerNode['props']>;
};
export declare const Timer: React.FC<TimerJSXProps>;
export type ImageJSXProps = ImageNode['props'] & {
    style?: StyleProp<ImageNode['props']>;
};
export declare const Image: React.FC<ImageJSXProps>;
export declare const Spacer: React.FC<{
    minLength?: number;
}>;
export declare const Divider: React.FC<DividerNode['props']>;
export interface LinkJSXProps extends LinkProps {
    children?: React.ReactNode;
    style?: StyleProp<LinkProps>;
}
export declare const Link: React.FC<LinkJSXProps>;
export declare const Equalizer: React.FC<EqualizerProps>;
export declare const Gauge: React.FC<GaugeNode['props']>;
export declare const Chart: React.FC<ChartNode['props']>;
export type ToggleJSXProps = Partial<ToggleNode['props']> & {
    children?: React.ReactNode;
    actionId?: string;
    key?: string;
};
export declare const Toggle: React.FC<ToggleJSXProps>;
export declare const Switch: React.FC<ToggleJSXProps>;
export declare const Checkbox: React.FC<ToggleJSXProps>;
/**
 * Chuyển đổi một cây JSX/TSX thành cấu trúc cây LayoutNode chuẩn của thư viện.
 *
 * ```tsx
 * const layout = renderToWidget(
 *   <VStack padding={16} backgroundColor="#0F172A" borderRadius={16}>
 *     <HStack justifyContent="spaceBetween">
 *       <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Vào ca sáng</Text>
 *       <Badge text="07:54 (Hợp lệ)" backgroundColor="#064E3B" textColor="#6EE7B7" />
 *     </HStack>
 *     <Button title="Làm mới" actionId="refresh" />
 *   </VStack>
 * );
 * ```
 */
export declare function renderToWidget(element: any): LayoutNode | null;
//# sourceMappingURL=jsx.d.ts.map