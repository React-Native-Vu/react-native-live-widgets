export type ActionHandler = (event: {
    actionId: string;
    activityId?: string;
    [key: string]: any;
}) => Promise<any> | any;
export declare const actionHandlers: Map<string, ActionHandler>;
/**
 * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
export declare function registerAction(actionId: string, handler: ActionHandler): () => void;
/**
 * Hủy đăng ký action handler.
 */
export declare function unregisterAction(actionId: string): void;
//# sourceMappingURL=dispatcher.d.ts.map