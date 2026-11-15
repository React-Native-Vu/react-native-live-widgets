"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionHandlers = void 0;
exports.registerAction = registerAction;
exports.unregisterAction = unregisterAction;
exports.actionHandlers = new Map();
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
 * Hủy đăng ký action handler.
 */
function unregisterAction(actionId) {
    exports.actionHandlers.delete(actionId);
}
//# sourceMappingURL=dispatcher.js.map