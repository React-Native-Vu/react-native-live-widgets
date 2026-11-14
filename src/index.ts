import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  LiveActivityPushTokens,
  StartActivityOptions,
  UpdateActivityOptions,
  WidgetLayoutConfig,
  WidgetRemoteConfig,
} from './types';

const { LiveActivityModule } = NativeModules;

if (!LiveActivityModule && __DEV__) {
  console.warn(
    '[react-native-live-widgets] Native module not found. ' +
      'Please ensure you have run "npx react-native-live-widgets init" and re-compiled your app.'
  );
}

const liveActivityEmitter = LiveActivityModule
  ? new NativeEventEmitter(LiveActivityModule)
  : null;

const DEVICE_TOKEN_CHANGED_EVENT = 'DevicePushTokenChanged';
const TOKEN_CHANGED_EVENT = 'LiveActivityTokenChanged';
const UPDATE_TOKEN_CHANGED_EVENT = 'LiveActivityUpdateTokenChanged';
const ACTION_CLICKED_EVENT = 'LiveActivityActionClicked';

// ─── 1. LIVE ACTIVITY & LIVE UPDATE ──────────────────────────────────────────

export const LiveActivity = {
  /**
   * Khởi động một Live Activity (iOS) hoặc Live Update / Ongoing Notification (Android).
   */
  start: async (options: StartActivityOptions): Promise<boolean> => {
    if (!LiveActivityModule?.start) return false;
    try {
      const payload = JSON.stringify(options);
      return await LiveActivityModule.start(options.activityId, payload);
    } catch (error) {
      console.warn('[react-native-live-widgets] start error:', error);
      return false;
    }
  },

  /**
   * Cập nhật nội dung Live Activity hiện tại.
   */
  update: async (options: UpdateActivityOptions): Promise<boolean> => {
    if (!LiveActivityModule?.update) return false;
    try {
      const payload = JSON.stringify(options);
      return await LiveActivityModule.update(options.activityId, payload);
    } catch (error) {
      console.warn('[react-native-live-widgets] update error:', error);
      return false;
    }
  },

  /**
   * Kết thúc một Live Activity cụ thể theo activityId.
   */
  end: async (activityId: string): Promise<boolean> => {
    if (!LiveActivityModule?.end) return false;
    try {
      return await LiveActivityModule.end(activityId);
    } catch (error) {
      console.warn('[react-native-live-widgets] end error:', error);
      return false;
    }
  },

  /**
   * Tắt tất cả Live Activity / Live Update của ứng dụng.
   */
  endAll: async (): Promise<boolean> => {
    if (!LiveActivityModule?.endAll) return false;
    try {
      return await LiveActivityModule.endAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] endAll error:', error);
      return false;
    }
  },

  /**
   * Đăng ký và lấy APNs Device Token của thiết bị (64-hex chars trên iOS).
   */
  getDevicePushToken: async (): Promise<string | undefined> => {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.getDevicePushToken) {
      return undefined;
    }
    try {
      const token = await LiveActivityModule.getDevicePushToken();
      return token || undefined;
    } catch {
      return undefined;
    }
  },

  /**
   * Lấy APNs Push-to-Start token (iOS 17.2+) để backend kích hoạt mở mới Live Activity từ xa.
   */
  getPushToStartToken: async (): Promise<string | undefined> => {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.getPushToStartToken) {
      return undefined;
    }
    try {
      const token = await LiveActivityModule.getPushToStartToken();
      return token || undefined;
    } catch {
      return undefined;
    }
  },

  /**
   * Lấy APNs Update Token của một phiên Live Activity đang chạy (theo activityId)
   * để backend gửi APNs cập nhật ("event": "update") hoặc kết thúc ("event": "end").
   */
  getActivityPushToken: async (activityId: string): Promise<string | undefined> => {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.getActivityPushToken) {
      return undefined;
    }
    try {
      const token = await LiveActivityModule.getActivityPushToken(activityId);
      return token || undefined;
    } catch {
      return undefined;
    }
  },

  /**
   * Lấy trọn bộ cả 3 loại APNs Token trong 1 lần gọi:
   * - `devicePushToken`: Token APNs của máy
   * - `pushToStartToken`: Token APNs mở mới Live Activity từ xa (iOS 17.2+)
   * - `activityUpdateToken`: Token APNs cập nhật phiên Live Activity đang chạy
   */
  getAllPushTokens: async (activityId?: string): Promise<LiveActivityPushTokens> => {
    const empty: LiveActivityPushTokens = {
      devicePushToken: null,
      pushToStartToken: null,
      activityUpdateToken: null,
      allActivityUpdateTokens: {},
    };
    if (Platform.OS !== 'ios' || !LiveActivityModule?.getAllPushTokens) {
      return empty;
    }
    try {
      const res = await LiveActivityModule.getAllPushTokens(activityId || '');
      return {
        devicePushToken: res?.devicePushToken || null,
        pushToStartToken: res?.pushToStartToken || null,
        activityUpdateToken: res?.activityUpdateToken || null,
        allActivityUpdateTokens: res?.allActivityUpdateTokens || {},
      };
    } catch {
      return empty;
    }
  },

  /**
   * Lắng nghe khi iOS cấp mới hoặc thay đổi Device APNs Token của máy.
   */
  onDevicePushTokenChange: (listener: (token: string) => void): (() => void) => {
    if (Platform.OS !== 'ios' || !liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(DEVICE_TOKEN_CHANGED_EVENT, listener);
    return () => sub.remove();
  },

  /**
   * Lắng nghe khi iOS cấp hoặc xoay Push-to-Start Token mới.
   */
  onPushToStartTokenChange: (listener: (token: string) => void): (() => void) => {
    if (Platform.OS !== 'ios' || !liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(TOKEN_CHANGED_EVENT, listener);
    return () => sub.remove();
  },

  /**
   * Lắng nghe khi iOS cấp hoặc xoay APNs Update Token cho một Live Activity cụ thể.
   * Trả về `{ activityId, token }` để gửi ngay lên Backend.
   */
  onActivityUpdateTokenChange: (
    listener: (event: { activityId: string; token: string }) => void
  ): (() => void) => {
    if (Platform.OS !== 'ios' || !liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(UPDATE_TOKEN_CHANGED_EVENT, listener);
    return () => sub.remove();
  },

  /**
   * Lắng nghe khi người dùng bấm vào một Action Button.
   */
  onActionClicked: (listener: (actionId: string, activityId: string) => void): (() => void) => {
    if (!liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(ACTION_CLICKED_EVENT, (event: any) => {
      listener(event.actionId, event.activityId);
    });
    return () => sub.remove();
  },

  /**
   * Android 16+: Kiểm tra quyền Promoted Ongoing Notifications.
   */
  canPostPromoted: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !LiveActivityModule?.canPostPromoted) {
      return false;
    }
    return await LiveActivityModule.canPostPromoted();
  },
};

// ─── 2. HOME SCREEN WIDGETS ──────────────────────────────────────────────────

export const Widget = {
  /**
   * Yêu cầu hệ điều hành iOS và Android vẽ lại toàn bộ Home Screen Widgets ngay lập tức.
   */
  reloadAll: async (): Promise<boolean> => {
    if (!LiveActivityModule?.reloadAllWidgets) return false;
    try {
      return await LiveActivityModule.reloadAllWidgets();
    } catch (error) {
      console.warn('[react-native-live-widgets] reloadAll error:', error);
      return false;
    }
  },

  /**
   * Yêu cầu vẽ lại một Widget cụ thể theo kind (chỉ áp dụng iOS).
   */
  reload: async (kind: string): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !LiveActivityModule?.reloadWidget) return false;
    try {
      return await LiveActivityModule.reloadWidget(kind);
    } catch (error) {
      console.warn('[react-native-live-widgets] reload error:', error);
      return false;
    }
  },

  /**
   * Thiết lập layout động cho Home Screen Widget (hỗ trợ small, medium, large).
   * Tự động lưu vào Shared Storage và yêu cầu vẽ lại.
   */
  setLayout: async (
    widgetKey: string,
    layoutConfig: WidgetLayoutConfig,
    appGroup?: string
  ): Promise<boolean> => {
    try {
      const saved = await SharedStorage.set(`widget_layout_${widgetKey}`, layoutConfig, appGroup);
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setLayout error:', error);
      return false;
    }
  },

  /**
   * Cấu hình Endpoint API để bản thân Widget Extension tự chạy ngầm lấy dữ liệu mới
   * theo chu kỳ (`getTimeline`) hoặc khi bấm nút `actionId: 'refresh'` trên mặt Widget,
   * kể cả khi người dùng đã vuốt tắt (Kill) hoàn toàn ứng dụng chính!
   */
  setRemoteConfig: async (
    widgetKey: string,
    remoteConfig: WidgetRemoteConfig,
    appGroup?: string
  ): Promise<boolean> => {
    try {
      const saved = await SharedStorage.set(
        `widget_remote_config_${widgetKey}`,
        remoteConfig,
        appGroup
      );
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setRemoteConfig error:', error);
      return false;
    }
  },
};

// ─── 3. SHARED STORAGE (App Groups & SharedPreferences) ─────────────────────

export const SharedStorage = {
  /**
   * Lưu dữ liệu vào App Group (iOS) hoặc SharedPreferences (Android) để Widget đọc.
   */
  set: async (key: string, value: any, appGroup?: string): Promise<boolean> => {
    if (!LiveActivityModule?.setSharedItem) return false;
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      return await LiveActivityModule.setSharedItem(key, stringValue, appGroup || '');
    } catch (error) {
      console.warn('[react-native-live-widgets] SharedStorage.set error:', error);
      return false;
    }
  },

  /**
   * Đọc dữ liệu từ App Group hoặc SharedPreferences.
   */
  get: async <T = any>(key: string, appGroup?: string): Promise<T | null> => {
    if (!LiveActivityModule?.getSharedItem) return null;
    try {
      const raw = await LiveActivityModule.getSharedItem(key, appGroup || '');
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch (error) {
      console.warn('[react-native-live-widgets] SharedStorage.get error:', error);
      return null;
    }
  },

  /**
   * Xóa 1 giá trị theo key.
   */
  remove: async (key: string, appGroup?: string): Promise<boolean> => {
    if (!LiveActivityModule?.removeSharedItem) return false;
    try {
      return await LiveActivityModule.removeSharedItem(key, appGroup || '');
    } catch (error) {
      console.warn('[react-native-live-widgets] SharedStorage.remove error:', error);
      return false;
    }
  },

  /**
   * Xóa sạch toàn bộ dữ liệu trong App Group.
   */
  clear: async (appGroup?: string): Promise<boolean> => {
    if (!LiveActivityModule?.clearSharedItems) return false;
    try {
      return await LiveActivityModule.clearSharedItems(appGroup || '');
    } catch (error) {
      console.warn('[react-native-live-widgets] SharedStorage.clear error:', error);
      return false;
    }
  },
};

export * from './types';
export * from './builder';
