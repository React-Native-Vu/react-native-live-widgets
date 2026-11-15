export type ActionHandler = (event: {
  actionId: string;
  activityId?: string;
  [key: string]: any;
}) => Promise<any> | any;

export const actionHandlers = new Map<string, ActionHandler>();

/**
 * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
export function registerAction(actionId: string, handler: ActionHandler): () => void {
  actionHandlers.set(actionId, handler);
  return () => {
    actionHandlers.delete(actionId);
  };
}

/**
 * Hủy đăng ký action handler.
 */
export function unregisterAction(actionId: string): void {
  actionHandlers.delete(actionId);
}
