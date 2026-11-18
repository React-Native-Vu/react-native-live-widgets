import { ActionHandler, GlobalActionHandler } from './dispatcher';
import { ActiveActivityInfo, LiveActivityLifecycleState, LiveActivityPushTokens, StartActivityOptions, UpdateActivityOptions, EndActivityOptions } from './types';
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
export declare function useWidgetAction(actionIdOrCallback: string | GlobalActionHandler, handler?: ActionHandler): void;
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
export declare function useLiveActivity(initialActivityId?: string): UseLiveActivityResult;
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
export declare function useWidgetState<T>(key: string, initialValue: T, appGroup?: string): [T, (newValue: T | ((prev: T) => T)) => Promise<void>, () => Promise<void>];
//# sourceMappingURL=hooks.d.ts.map