import { ButtonNode, ContainerProps, HStackNode, ImageNode, LayoutNode, ProgressNode, SpacerNode, TextNode, TimerNode, VStackNode } from './types';
/**
 * Các hàm helper tạo node cây giao diện trực quan cho TypeScript/JavaScript
 */
export declare const UI: {
    VStack: (propsOrChildren?: ContainerProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => VStackNode;
    HStack: (propsOrChildren?: ContainerProps | LayoutNode | LayoutNode[], ...children: LayoutNode[]) => HStackNode;
    Text: (text: string, options?: {
        color?: string;
        fontSize?: number;
        fontWeight?: "regular" | "medium" | "semibold" | "bold";
        numberOfLines?: number;
    }) => TextNode;
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
};
//# sourceMappingURL=builder.d.ts.map