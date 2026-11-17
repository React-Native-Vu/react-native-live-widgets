"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWidgetAction = useWidgetAction;
exports.useLiveActivity = useLiveActivity;
exports.useWidgetState = useWidgetState;
const react_1 = require("react");
const dispatcher_1 = require("./dispatcher");
const index_1 = require("./index");
/**
 * 🎣 React Hook an toàn tuyệt đối với Fast Refresh / Hot Reloading để lắng nghe
 * tương tác nút bấm trên Home Screen Widget hoặc Live Activity.
 * Tự động đăng ký khi mount và hủy dọn dẹp (cleanup) khi Component unmount.
 *
 * Cách dùng 1 (Lắng nghe 1 actionId cụ thể):
 * ```typescript
 * useWidgetAction('counter:inc', (event) => {
 *   setCount((prev) => prev + 1);
 * });
 * ```
 *
 * Cách dùng 2 (Lắng nghe toàn cục mọi sự kiện nút bấm):
 * ```typescript
 * useWidgetAction((actionId, payload) => {
 *   console.log('Action received:', actionId, payload);
 * });
 * ```
 */
function useWidgetAction(actionIdOrCallback, handler) {
    const savedHandler = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        savedHandler.current = typeof actionIdOrCallback === 'function' ? actionIdOrCallback : handler;
    });
    (0, react_1.useEffect)(() => {
        if (typeof actionIdOrCallback === 'function') {
            const unsubscribe = (0, dispatcher_1.registerActionHandler)((actionId, payload) => {
                if (typeof savedHandler.current === 'function') {
                    savedHandler.current(actionId, payload);
                }
            });
            return unsubscribe;
        }
        else if (typeof actionIdOrCallback === 'string') {
            const unsubscribe = (0, dispatcher_1.registerAction)(actionIdOrCallback, (event) => {
                if (typeof savedHandler.current === 'function') {
                    savedHandler.current(event);
                }
            });
            return unsubscribe;
        }
    }, [actionIdOrCallback]);
}
/**
 * 🎣 React Hook quản lý vòng đời trọn vẹn của một Live Activity / Android Ongoing Notification.
 * Tương thích Fast Refresh và tự động dọn dẹp state khi component unmount.
 *
 * ```typescript
 * const { activityId, isActive, start, update, end } = useLiveActivity();
 *
 * // Bắt đầu khi bấm nút
 * await start({
 *   activityId: 'order_123',
 *   lockScreen: UI.VStack(...)
 * });
 * ```
 */
function useLiveActivity(initialActivityId) {
    const [currentId, setCurrentId] = (0, react_1.useState)(initialActivityId || null);
    const [isActive, setIsActive] = (0, react_1.useState)(!!initialActivityId);
    const [pushTokens, setPushTokens] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        if (currentId) {
            index_1.LiveActivity.getAllPushTokens(currentId)
                .then((tokens) => {
                if (mounted && tokens) {
                    setPushTokens(tokens);
                }
            })
                .catch(() => { });
        }
        return () => {
            mounted = false;
        };
    }, [currentId]);
    const start = (0, react_1.useCallback)(async (options) => {
        const ok = await index_1.LiveActivity.start(options);
        if (ok) {
            setCurrentId(options.activityId);
            setIsActive(true);
            try {
                const tokens = await index_1.LiveActivity.getAllPushTokens(options.activityId);
                setPushTokens(tokens);
            }
            catch (_) { }
            return options.activityId;
        }
        return null;
    }, []);
    const update = (0, react_1.useCallback)(async (options) => {
        if (!currentId)
            return false;
        return await index_1.LiveActivity.update({
            activityId: currentId,
            ...options,
        });
    }, [currentId]);
    const end = (0, react_1.useCallback)(async (options) => {
        if (!currentId)
            return false;
        const ok = await index_1.LiveActivity.end(currentId, options);
        if (ok) {
            setIsActive(false);
        }
        return ok;
    }, [currentId]);
    return {
        activityId: currentId,
        isActive,
        pushToken: pushTokens?.activityUpdateToken || pushTokens?.devicePushToken || null,
        pushTokens,
        start,
        update,
        end,
    };
}
/**
 * 🎣 React Hook liên kết state ứng dụng với Shared Storage của Home Screen Widget.
 * Mỗi khi gọi `setWidgetState(...)`, widget sẽ tự động được hệ điều hành vẽ lại ngay lập tức.
 *
 * ```typescript
 * const [counter, setCounter] = useWidgetState('counter_key', 0);
 *
 * // Cập nhật state + tự động yêu cầu Widget reload:
 * setCounter(prev => prev + 1);
 * ```
 */
function useWidgetState(key, initialValue, appGroup) {
    const [state, setState] = (0, react_1.useState)(initialValue);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        index_1.SharedStorage.get(key, appGroup)
            .then((val) => {
            if (mounted && val !== null && val !== undefined) {
                setState(val);
            }
        })
            .catch(() => { });
        return () => {
            mounted = false;
        };
    }, [key, appGroup]);
    const setWidgetState = (0, react_1.useCallback)(async (newValue) => {
        setState((prev) => {
            const resolved = typeof newValue === 'function' ? newValue(prev) : newValue;
            index_1.SharedStorage.set(key, resolved, appGroup)
                .then(() => {
                index_1.Widget.reloadAll().catch(() => { });
            })
                .catch(() => { });
            return resolved;
        });
    }, [key, appGroup]);
    const reload = (0, react_1.useCallback)(async () => {
        const val = await index_1.SharedStorage.get(key, appGroup);
        if (val !== null && val !== undefined) {
            setState(val);
        }
    }, [key, appGroup]);
    return [state, setWidgetState, reload];
}
//# sourceMappingURL=hooks.js.map