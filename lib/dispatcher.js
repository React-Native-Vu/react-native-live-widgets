"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalActionHandlers = exports.actionHandlers = void 0;
exports.registerAction = registerAction;
exports.registerActionHandler = registerActionHandler;
exports.unregisterAction = unregisterAction;
exports.actionHandlers = new Map();
exports.globalActionHandlers = new Set();
/**
 * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
function registerAction(actionId, handler) {
    exports.actionHandlers.set(actionId, handler);
    return () => {
        exports.actionHandlers.delete(actionId);
    };
}
/**
 * Đăng ký hàm lắng nghe toàn bộ các sự kiện bấm nút từ Widget hoặc Live Activity.
 * Trả về hàm hủy đăng ký (unsubscribe).
 */
function registerActionHandler(handler) {
    exports.globalActionHandlers.add(handler);
    return () => {
        exports.globalActionHandlers.delete(handler);
    };
}
/**
 * Hủy đăng ký action handler.
 */
function unregisterAction(actionId) {
    exports.actionHandlers.delete(actionId);
}
//# sourceMappingURL=dispatcher.js.map