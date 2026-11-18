import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActionHandler,
  GlobalActionHandler,
  registerAction,
  registerActionHandler,
} from './dispatcher';
import { LiveActivity, SharedStorage, Widget } from './index';
import {
  ActiveActivityInfo,
  LiveActivityLifecycleState,
  LiveActivityPushTokens,
  LiveActivityStateEvent,
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
  /** Trạng thái vòng đời chi tiết ('active', 'started_by_push', 'stale', 'expired', 'ended', 'dismissed') */
  lifecycleState: LiveActivityLifecycleState | null;
  /** Cờ báo Live Activity hiện tại đã chuyển sang trạng thái cũ (Stale) hay chưa */
  isStale: boolean;
  /** Danh sách tất cả các Live Activity đang chạy đồng thời trên thiết bị */
  activities: ActiveActivityInfo[];
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
  /** Làm mới danh sách các Live Activity đang hoạt động */
  refreshActivities: () => Promise<ActiveActivityInfo[]>;
  /** Dọn dẹp tự động các Live Activity đã quá hạn scheduledEndTimestamp */
  cleanupExpired: () => Promise<string[]>;
}

/**
 * 🎣 React Hook quản lý vòng đời trọn vẹn của một Live Activity / Android Ongoing Notification.
 * Tương thích Fast Refresh, tự động lắng nghe Stale/Expired/Push-to-Start và quản lý nhiều phiên đồng thời.
 *
 * ```typescript
 * const { activityId, isActive, isStale, activities, start, update, end } = useLiveActivity();
 * ```
 */
export function useLiveActivity(initialActivityId?: string): UseLiveActivityResult {
  const [currentId, setCurrentId] = useState<string | null>(initialActivityId || null);
  const [isActive, setIsActive] = useState<boolean>(!!initialActivityId);
  const [lifecycleState, setLifecycleState] = useState<LiveActivityLifecycleState | null>(
    initialActivityId ? 'active' : null
  );
  const [isStale, setIsStale] = useState<boolean>(false);
  const [activities, setActivities] = useState<ActiveActivityInfo[]>([]);
  const [pushTokens, setPushTokens] = useState<LiveActivityPushTokens | null>(null);

  const refreshActivities = useCallback(async (): Promise<ActiveActivityInfo[]> => {
    try {
      const list = await LiveActivity.getActiveActivities();
      setActivities(list);
      if (currentId) {
        const matched = list.find((a) => a.activityId === currentId);
        if (matched) {
          const active = matched.activityState !== 'ended' && matched.activityState !== 'dismissed' && matched.activityState !== 'expired';
          setIsActive(active);
          setIsStale(Boolean(matched.isStale));
          if (matched.activityState) {
            setLifecycleState(matched.activityState as LiveActivityLifecycleState);
          }
        }
      }
      return list;
    } catch {
      return [];
    }
  }, [currentId]);

  useEffect(() => {
    let mounted = true;
    refreshActivities();

    if (currentId) {
      LiveActivity.getAllPushTokens(currentId)
        .then((tokens: LiveActivityPushTokens) => {
          if (mounted && tokens) {
            setPushTokens(tokens);
          }
        })
        .catch(() => {});
    }

    const unsubState = LiveActivity.onStateChange((ev: LiveActivityStateEvent) => {
      if (!mounted) return;
      refreshActivities();
      if (!currentId || ev.activityId === currentId || ev.state === 'started_by_push') {
        if (ev.state === 'started_by_push' && !currentId) {
          setCurrentId(ev.activityId);
        }
        if (ev.activityId === currentId || !currentId) {
          setLifecycleState(ev.state);
          setIsStale(ev.state === 'stale');
          setIsActive(ev.state === 'active' || ev.state === 'started_by_push' || ev.state === 'stale');
        }
      }
    });

    return () => {
      mounted = false;
      unsubState();
    };
  }, [currentId, refreshActivities]);

  const start = useCallback(
    async (options: StartActivityOptions): Promise<string | null> => {
      const ok = await LiveActivity.start(options);
      if (ok) {
        setCurrentId(options.activityId);
        setIsActive(true);
        setIsStale(false);
        setLifecycleState('active');
        try {
          const tokens = await LiveActivity.getAllPushTokens(options.activityId);
          setPushTokens(tokens);
          const list = await LiveActivity.getActiveActivities();
          setActivities(list);
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
      const ok = await LiveActivity.update({
        activityId: currentId,
        ...options,
      });
      if (ok) {
        setIsStale(false);
        setLifecycleState('active');
        refreshActivities();
      }
      return ok;
    },
    [currentId, refreshActivities]
  );

  const end = useCallback(
    async (options?: EndActivityOptions): Promise<boolean> => {
      if (!currentId) return false;
      const ok = await LiveActivity.end(currentId, options);
      if (ok) {
        setIsActive(false);
        setIsStale(false);
        setLifecycleState('ended');
        refreshActivities();
      }
      return ok;
    },
    [currentId, refreshActivities]
  );

  const cleanupExpired = useCallback(async (): Promise<string[]> => {
    const cleaned = await LiveActivity.cleanupExpired();
    await refreshActivities();
    return cleaned;
  }, [refreshActivities]);

  return {
    activityId: currentId,
    isActive,
    lifecycleState,
    isStale,
    activities,
    pushToken: pushTokens?.activityUpdateToken || pushTokens?.devicePushToken || null,
    pushTokens,
    start,
    update,
    end,
    refreshActivities,
    cleanupExpired,
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
