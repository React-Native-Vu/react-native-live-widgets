import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActionHandler,
  GlobalActionHandler,
  registerAction,
  registerActionHandler,
} from './dispatcher';
import { LiveActivity, SharedStorage, Widget } from './index';
import {
  LiveActivityPushTokens,
  StartActivityOptions,
  UpdateActivityOptions,
  EndActivityOptions,
} from './types';

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
export function useWidgetAction(
  actionIdOrCallback: string | GlobalActionHandler,
  handler?: ActionHandler
): void {
  const savedHandler = useRef<ActionHandler | GlobalActionHandler | undefined>(undefined);

  useEffect(() => {
    savedHandler.current = typeof actionIdOrCallback === 'function' ? actionIdOrCallback : handler;
  });

  useEffect(() => {
    if (typeof actionIdOrCallback === 'function') {
      const unsubscribe = registerActionHandler((actionId, payload) => {
        if (typeof savedHandler.current === 'function') {
          (savedHandler.current as GlobalActionHandler)(actionId, payload);
        }
      });
      return unsubscribe;
    } else if (typeof actionIdOrCallback === 'string') {
      const unsubscribe = registerAction(actionIdOrCallback, (event) => {
        if (typeof savedHandler.current === 'function') {
          (savedHandler.current as ActionHandler)(event);
        }
      });
      return unsubscribe;
    }
  }, [actionIdOrCallback]);
}

export interface UseLiveActivityResult {
  /** ID định danh phiên Live Activity hiện tại */
  activityId: string | null;
  /** Trạng thái phiên có đang hoạt động hay không */
  isActive: boolean;
  /** Token cập nhật tiện ích (iOS activityUpdateToken hoặc devicePushToken) */
  pushToken: string | null;
  /** Toàn bộ bộ 3 loại Push Token (deviceToken, pushToStart, activityUpdateToken) */
  pushTokens: LiveActivityPushTokens | null;
  /** Bắt đầu một Live Activity mới */
  start: (options: StartActivityOptions) => Promise<string | null>;
  /** Cập nhật nội dung Live Activity hiện tại */
  update: (options: Omit<UpdateActivityOptions, 'activityId'>) => Promise<boolean>;
  /** Kết thúc Live Activity hiện tại */
  end: (options?: EndActivityOptions) => Promise<boolean>;
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
export function useLiveActivity(initialActivityId?: string): UseLiveActivityResult {
  const [currentId, setCurrentId] = useState<string | null>(initialActivityId || null);
  const [isActive, setIsActive] = useState<boolean>(!!initialActivityId);
  const [pushTokens, setPushTokens] = useState<LiveActivityPushTokens | null>(null);

  useEffect(() => {
    let mounted = true;
    if (currentId) {
      LiveActivity.getAllPushTokens(currentId)
        .then((tokens: LiveActivityPushTokens) => {
          if (mounted && tokens) {
            setPushTokens(tokens);
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [currentId]);

  const start = useCallback(
    async (options: StartActivityOptions): Promise<string | null> => {
      const ok = await LiveActivity.start(options);
      if (ok) {
        setCurrentId(options.activityId);
        setIsActive(true);
        try {
          const tokens = await LiveActivity.getAllPushTokens(options.activityId);
          setPushTokens(tokens);
        } catch (_) {}
        return options.activityId;
      }
      return null;
    },
    []
  );

  const update = useCallback(
    async (options: Omit<UpdateActivityOptions, 'activityId'>): Promise<boolean> => {
      if (!currentId) return false;
      return await LiveActivity.update({
        activityId: currentId,
        ...options,
      });
    },
    [currentId]
  );

  const end = useCallback(
    async (options?: EndActivityOptions): Promise<boolean> => {
      if (!currentId) return false;
      const ok = await LiveActivity.end(currentId, options);
      if (ok) {
        setIsActive(false);
      }
      return ok;
    },
    [currentId]
  );

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
export function useWidgetState<T>(
  key: string,
  initialValue: T,
  appGroup?: string
): [T, (newValue: T | ((prev: T) => T)) => Promise<void>, () => Promise<void>] {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    let mounted = true;
    SharedStorage.get<T>(key, appGroup)
      .then((val: T | null) => {
        if (mounted && val !== null && val !== undefined) {
          setState(val);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [key, appGroup]);

  const setWidgetState = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      setState((prev: T) => {
        const resolved =
          typeof newValue === 'function' ? (newValue as (p: T) => T)(prev) : newValue;
        SharedStorage.set(key, resolved, appGroup)
          .then(() => {
            Widget.reloadAll().catch(() => {});
          })
          .catch(() => {});
        return resolved;
      });
    },
    [key, appGroup]
  );

  const reload = useCallback(async () => {
    const val = await SharedStorage.get<T>(key, appGroup);
    if (val !== null && val !== undefined) {
      setState(val);
    }
  }, [key, appGroup]);

  return [state, setWidgetState, reload];
}
