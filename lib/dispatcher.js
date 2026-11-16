export const actionHandlers = new Map();
export const globalActionHandlers = new Set();
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
 * Đăng ký hàm lắng nghe toàn bộ các sự kiện bấm nút từ Widget hoặc Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
export function registerActionHandler(handler) {
    globalActionHandlers.add(handler);
    return () => {
        globalActionHandlers.delete(handler);
    };
}
/**
 * Hủy đăng ký action handler.
 */
export function unregisterAction(actionId) {
    actionHandlers.delete(actionId);
}
//# sourceMappingURL=dispatcher.js.map