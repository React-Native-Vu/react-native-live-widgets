import { useState, useEffect, useRef, useCallback } from 'react';
import { registerAction, registerActionHandler, } from './dispatcher';
import { LiveActivity, SharedStorage, Widget } from './index';
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
export function useWidgetAction(actionIdOrCallback, handler) {
    const savedHandler = useRef(undefined);
    useEffect(() => {
        savedHandler.current = typeof actionIdOrCallback === 'function' ? actionIdOrCallback : handler;
    });
    useEffect(() => {
        if (typeof actionIdOrCallback === 'function') {
            const unsubscribe = registerActionHandler((actionId, payload) => {
                if (typeof savedHandler.current === 'function') {
                    savedHandler.current(actionId, payload);
                }
            });
            return unsubscribe;
        }
        else if (typeof actionIdOrCallback === 'string') {
            const unsubscribe = registerAction(actionIdOrCallback, (event) => {
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
export function useLiveActivity(initialActivityId) {
    const [currentId, setCurrentId] = useState(initialActivityId || null);
    const [isActive, setIsActive] = useState(!!initialActivityId);
    const [pushTokens, setPushTokens] = useState(null);
    useEffect(() => {
        let mounted = true;
        if (currentId) {
            LiveActivity.getAllPushTokens(currentId)
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
    const start = useCallback(async (options) => {
        const ok = await LiveActivity.start(options);
        if (ok) {
            setCurrentId(options.activityId);
            setIsActive(true);
            try {
                const tokens = await LiveActivity.getAllPushTokens(options.activityId);
                setPushTokens(tokens);
            }
            catch (_) { }
            return options.activityId;
        }
        return null;
    }, []);
    const update = useCallback(async (options) => {
        if (!currentId)
            return false;
        return await LiveActivity.update({
            activityId: currentId,
            ...options,
        });
    }, [currentId]);
    const end = useCallback(async (options) => {
        if (!currentId)
            return false;
        const ok = await LiveActivity.end(currentId, options);
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
export function useWidgetState(key, initialValue, appGroup) {
    const [state, setState] = useState(initialValue);
    useEffect(() => {
        let mounted = true;
        SharedStorage.get(key, appGroup)
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
    const setWidgetState = useCallback(async (newValue) => {
        setState((prev) => {
            const resolved = typeof newValue === 'function' ? newValue(prev) : newValue;
            SharedStorage.set(key, resolved, appGroup)
                .then(() => {
                Widget.reloadAll().catch(() => { });
            })
                .catch(() => { });
            return resolved;
        });
    }, [key, appGroup]);
    const reload = useCallback(async () => {
        const val = await SharedStorage.get(key, appGroup);
        if (val !== null && val !== undefined) {
            setState(val);
        }
    }, [key, appGroup]);
    return [state, setWidgetState, reload];
}
//# sourceMappingURL=hooks.js.map