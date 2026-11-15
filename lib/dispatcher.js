export const actionHandlers = new Map();
/**
 * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
export function registerAction(actionId, handler) {
    actionHandlers.set(actionId, handler);
    return () => {
        actionHandlers.delete(actionId);
    };
}
/**
 * Hủy đăng ký action handler.
 */
export function unregisterAction(actionId) {
    actionHandlers.delete(actionId);
}
//# sourceMappingURL=dispatcher.js.map