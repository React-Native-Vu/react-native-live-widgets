import React from 'react';
import { AppRegistry, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  ActiveActivityInfo,
  ControlWidgetConfig,
  EndActivityOptions,
  LiveActivityPushTokens,
  LiveActivityStateEvent,
  StartActivityOptions,
  UpdateActivityOptions,
  WidgetCapabilities,
  WidgetConfigOption,
  WidgetLayoutConfig,
  WidgetRemoteConfig,
  WidgetTimelineConfig,
  WidgetIR,
} from './types';
import { compileToIR, inspectIR, inspectAccessibilityTree } from './ir';
import {
  setEngineStorageBackend,
  enqueuePendingAction,
  getPendingActions,
  recoverPendingActions,
  syncPendingActions,
  clearPendingActions,
  registerStateSchema,
  readVersionedState,
  updateStateAtomic,
  computeDataDiff,
  evaluateCacheStatus,
} from './actionQueue';
import { UI, createDataBinding, flattenDataObject, resolveTemplateString } from './builder';

declare const __DEV__: boolean | undefined;

const { LiveActivityModule } = NativeModules;

if (!LiveActivityModule && typeof __DEV__ !== 'undefined' && __DEV__) {
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
const STATE_CHANGED_EVENT = 'LiveActivityStateChanged';

import {
  ActionHandler,
  GlobalActionHandler,
  actionHandlers,
  globalActionHandlers,
  registerAction,
  registerActionHandler,
  unregisterAction,
} from './dispatcher';
export type { ActionHandler, GlobalActionHandler };
export { registerAction, registerActionHandler, unregisterAction };
export type {
  WidgetCapabilities,
  GradientProps,
  ShadowProps,
  BorderStyle,
  TypographyStyle,
  FontDesign,
} from './types';
export * from './jsx';
export * from './preview';
import { renderToWidget } from './jsx';

// Tự động lắng nghe action event từ Native để dispatch tới các hàm TypeScript đã đăng ký
if (liveActivityEmitter) {
  liveActivityEmitter.addListener(ACTION_CLICKED_EVENT, async (event: any) => {
    const actionId = event?.actionId || '';
    const activityId = event?.activityId || '';
    const payload = { ...(event || {}), actionId, activityId };
    const handler = actionHandlers.get(actionId);
    if (handler) {
      try {
        await handler(payload);
      } catch (e) {
        console.warn(`[react-native-live-widgets] Error executing action '${actionId}':`, e);
      }
    }
    for (const globalHandler of globalActionHandlers) {
      try {
        await globalHandler(actionId, payload);
      } catch (e) {
        console.warn(`[react-native-live-widgets] Error in global action handler for '${actionId}':`, e);
      }
    }
  });
}

function convertIfJsx(node: any): any {
  if (!node) return node;
  if (React.isValidElement(node) || (node as any)?.$$typeof || typeof (node as any)?.type === 'function') {
    return renderToWidget(node);
  }
  return node;
}

function normalizeDynamicIsland(island: any): any {
  if (!island || typeof island !== 'object') return island;
  const normalized: any = { ...island };
  if (normalized.compactLeading) normalized.compactLeading = convertIfJsx(normalized.compactLeading);
  if (normalized.compactTrailing) normalized.compactTrailing = convertIfJsx(normalized.compactTrailing);
  if (normalized.minimal) normalized.minimal = convertIfJsx(normalized.minimal);
  if (normalized.expanded && typeof normalized.expanded === 'object') {
    normalized.expanded = {
      ...normalized.expanded,
      leading: convertIfJsx(normalized.expanded.leading),
      trailing: convertIfJsx(normalized.expanded.trailing),
      center: convertIfJsx(normalized.expanded.center),
      bottom: convertIfJsx(normalized.expanded.bottom),
    };
  }
  return normalized;
}

function normalizeActivityPayload(options: any): any {
  const opts: any = { ...options };
  if (opts.lockScreen) opts.lockScreen = convertIfJsx(opts.lockScreen);
  if (opts.staleLockScreen) opts.staleLockScreen = convertIfJsx(opts.staleLockScreen);
  if (opts.expiredLockScreen) opts.expiredLockScreen = convertIfJsx(opts.expiredLockScreen);
  if (opts.dynamicIsland) opts.dynamicIsland = normalizeDynamicIsland(opts.dynamicIsland);
  if (opts.staleDynamicIsland) opts.staleDynamicIsland = normalizeDynamicIsland(opts.staleDynamicIsland);

  if (opts.alertConfig && typeof opts.alertConfig === 'object') {
    if (opts.alertConfig.title && !opts.alertTitle) opts.alertTitle = opts.alertConfig.title;
    if (opts.alertConfig.body && !opts.alertBody) opts.alertBody = opts.alertConfig.body;
    if (opts.alertConfig.sound && !opts.alertSound) opts.alertSound = opts.alertConfig.sound;
  }

  if (typeof opts.autoEndAfterSeconds === 'number' && opts.autoEndAfterSeconds > 0 && !opts.scheduledEndTimestamp) {
    opts.scheduledEndTimestamp = Date.now() / 1000.0 + opts.autoEndAfterSeconds;
  }
  return opts;
}

function normalizeSinglePageConfig(cfg: any): any {
  if (!cfg || typeof cfg !== 'object') return cfg;
  return {
    ...cfg,
    small: convertIfJsx(cfg.small),
    medium: convertIfJsx(cfg.medium),
    large: convertIfJsx(cfg.large),
    extraLarge: convertIfJsx(cfg.extraLarge),
    standBy: convertIfJsx(cfg.standBy),
    accessoryRectangular: convertIfJsx(cfg.accessoryRectangular),
    accessoryCircular: convertIfJsx(cfg.accessoryCircular),
    accessoryInline: convertIfJsx(cfg.accessoryInline),
  };
}

function normalizeWidgetLayoutConfig(layoutConfig: any): any {
  let finalLayout: any = layoutConfig;
  if (
    React.isValidElement(finalLayout) ||
    (finalLayout as any)?.$$typeof ||
    typeof (finalLayout as any)?.type === 'function'
  ) {
    finalLayout = { medium: renderToWidget(finalLayout) };
  } else if (finalLayout && typeof finalLayout === 'object') {
    const c = normalizeSinglePageConfig(finalLayout);
    if (c.pages && typeof c.pages === 'object') {
      const convertedPages: Record<string, any> = {};
      for (const [pageKey, pageCfg] of Object.entries(c.pages)) {
        convertedPages[pageKey] = normalizeSinglePageConfig(pageCfg);
      }
      c.pages = convertedPages;
    }
    finalLayout = c;
  }
  return finalLayout;
}

function resolveLayoutObjectTemplates(value: any, flatVars: Record<string, string>): any {
  if (typeof value === 'string') {
    return resolveTemplateString(value, flatVars);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveLayoutObjectTemplates(item, flatVars));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveLayoutObjectTemplates(v, flatVars);
    }
    return out;
  }
  return value;
}

// ─── 1. LIVE ACTIVITY & LIVE UPDATE ──────────────────────────────────────────

export const LiveActivity = {
  /**
   * Khởi động một Live Activity (iOS) hoặc Live Update / Ongoing Notification (Android).
   */
  start: async (options: StartActivityOptions): Promise<boolean> => {
    if (!LiveActivityModule?.start) return false;
    try {
      const payload = JSON.stringify(normalizeActivityPayload(options));
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
      const payload = JSON.stringify(normalizeActivityPayload(options));
      return await LiveActivityModule.update(options.activityId, payload);
    } catch (error) {
      console.warn('[react-native-live-widgets] update error:', error);
      return false;
    }
  },

  /**
   * Kết thúc một Live Activity cụ thể theo activityId với các chính sách linh hoạt (Dismissal Policy & Final Summary Layout).
   */
  end: async (activityId: string, options?: EndActivityOptions): Promise<boolean> => {
    try {
      if (options && (LiveActivityModule?.endWithOptions || LiveActivityModule?.endActivity)) {
        const finalLock = options.finalLockScreen ? convertIfJsx(options.finalLockScreen) : undefined;
        const finalIsland = options.finalDynamicIsland ? normalizeDynamicIsland(options.finalDynamicIsland) : undefined;
        const payloadJson = finalLock || finalIsland
          ? JSON.stringify({
              activityId,
              lockScreen: finalLock,
              dynamicIsland: finalIsland,
            })
          : null;
        const nativeOptions = {
          dismissalPolicy: options.dismissalPolicy || 'immediate',
          dismissalAfterSeconds: options.dismissalAfterSeconds ?? 900,
          finalPayloadJson: payloadJson,
        };
        const endFn = LiveActivityModule.endWithOptions || LiveActivityModule.endActivity;
        return await endFn.call(LiveActivityModule, activityId, nativeOptions);
      }
      if (LiveActivityModule?.end) {
        return await LiveActivityModule.end(activityId);
      }
      return false;
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
   * Đăng ký và lấy Push Token của thiết bị (APNs Device Token trên iOS / FCM Device Token trên Android).
   */
  getDevicePushToken: async (): Promise<string | undefined> => {
    if (!LiveActivityModule?.getDevicePushToken) {
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
   * Lấy Push-to-Start token để backend kích hoạt mở mới Live Activity / Live Update từ xa.
   */
  getPushToStartToken: async (): Promise<string | undefined> => {
    if (!LiveActivityModule?.getPushToStartToken) {
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
   * Lấy Update Push Token của một phiên Live Activity / Live Update đang chạy (theo activityId)
   * để backend gửi bản cập nhật ("event": "update") hoặc kết thúc ("event": "end").
   */
  getActivityPushToken: async (activityId: string): Promise<string | undefined> => {
    if (!LiveActivityModule?.getActivityPushToken) {
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
   * Lấy trọn bộ cả 3 loại Push Token trong 1 lần gọi (hỗ trợ cả iOS APNs & Android):
   * - `devicePushToken`: Token của máy
   * - `pushToStartToken`: Token mở mới Live Activity / Live Update từ xa
   * - `activityUpdateToken`: Token cập nhật phiên Live Activity đang chạy
   */
  getAllPushTokens: async (activityId?: string): Promise<LiveActivityPushTokens> => {
    const empty: LiveActivityPushTokens = {
      devicePushToken: null,
      pushToStartToken: null,
      activityUpdateToken: null,
      allActivityUpdateTokens: {},
    };
    if (!LiveActivityModule?.getAllPushTokens) {
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
   * Lắng nghe khi hệ điều hành cấp mới hoặc thay đổi Device Push Token của máy.
   */
  onDevicePushTokenChange: (listener: (token: string) => void): (() => void) => {
    if (!liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(DEVICE_TOKEN_CHANGED_EVENT, (token: any) => {
      listener(typeof token === 'string' ? token : String(token ?? ''));
    });
    return () => sub.remove();
  },

  /**
   * Lắng nghe khi hệ điều hành cấp hoặc xoay Push-to-Start Token mới.
   */
  onPushToStartTokenChange: (listener: (token: string) => void): (() => void) => {
    if (!liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(TOKEN_CHANGED_EVENT, (token: any) => {
      listener(typeof token === 'string' ? token : String(token ?? ''));
    });
    return () => sub.remove();
  },

  /**
   * Lắng nghe khi hệ điều hành cấp hoặc xoay Update Token cho một Live Activity cụ thể.
   * Trả về `{ activityId, token }` để gửi ngay lên Backend.
   */
  onActivityUpdateTokenChange: (
    listener: (event: { activityId: string; token: string }) => void
  ): (() => void) => {
    if (!liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(UPDATE_TOKEN_CHANGED_EVENT, (event: any) => {
      listener(event as { activityId: string; token: string });
    });
    return () => sub.remove();
  },

  /**
   * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
   * Hoạt động mượt mà cả khi App đang mở lẫn chạy ngầm.
   * Trả về hàm hủy đăng ký (unsubscribe).
   */
  registerAction: (actionId: string, handler: ActionHandler): (() => void) => {
    actionHandlers.set(actionId, handler);
    return () => {
      actionHandlers.delete(actionId);
    };
  },

  /**
   * Đăng ký hàm lắng nghe toàn cục tất cả các sự kiện bấm nút từ Live Activity hoặc Widget.
   * Nhận `(actionId, payload)`. Trả về hàm hủy đăng ký (unsubscribe).
   */
  registerActionHandler: (handler: GlobalActionHandler): (() => void) => {
    return registerActionHandler(handler);
  },

  /**
   * Hủy đăng ký action handler theo `actionId`.
   */
  unregisterAction: (actionId: string): void => {
    actionHandlers.delete(actionId);
  },

  /**
   * Lấy danh sách các phiên Live Activity đang chạy trên thiết bị (kèm trạng thái Stale, RelevanceScore, ScheduledEnd và Push Token).
   * Giúp ứng dụng khôi phục lại trạng thái giao diện khi mở lại App.
   */
  getActiveActivities: async (): Promise<ActiveActivityInfo[]> => {
    if (!LiveActivityModule?.getActiveActivities) {
      return [];
    }
    try {
      const list = await LiveActivityModule.getActiveActivities();
      return (list || []).map((item: any) => ({
        activityId: item.activityId || '',
        systemActivityId: item.systemActivityId,
        activityState: item.activityState,
        isStale: Boolean(item.isStale ?? item.activityState === 'stale'),
        relevanceScore: typeof item.relevanceScore === 'number' ? item.relevanceScore : undefined,
        staleTimestamp: typeof item.staleTimestamp === 'number' ? item.staleTimestamp : undefined,
        scheduledEndTimestamp: typeof item.scheduledEndTimestamp === 'number' ? item.scheduledEndTimestamp : undefined,
        pushToken: item.pushToken,
      }));
    } catch (e) {
      console.warn('[react-native-live-widgets] getActiveActivities error:', e);
      return [];
    }
  },

  /**
   * Lấy thông tin chi tiết của một Live Activity cụ thể theo activityId.
   */
  get: async (activityId: string): Promise<ActiveActivityInfo | null> => {
    const list = await LiveActivity.getActiveActivities();
    return list.find((a) => a.activityId === activityId || a.systemActivityId === activityId) ?? null;
  },

  /**
   * Kiểm tra nhanh xem một Live Activity cụ thể có đang chạy trên thiết bị hay không.
   */
  isActive: async (activityId: string): Promise<boolean> => {
    const info = await LiveActivity.get(activityId);
    return Boolean(info && info.activityState !== 'ended' && info.activityState !== 'dismissed' && info.activityState !== 'expired');
  },

  /**
   * Lắng nghe sự kiện chuyển đổi vòng đời Live Activity (`active`, `started_by_push`, `stale`, `expired`, `ended`, `dismissed`).
   */
  onStateChange: (listener: (event: LiveActivityStateEvent) => void): (() => void) => {
    if (!liveActivityEmitter) return () => {};
    const sub = liveActivityEmitter.addListener(STATE_CHANGED_EVENT, (event: any) => {
      if (!event) return;
      listener({
        activityId: event.activityId || '',
        systemActivityId: event.systemActivityId,
        state: event.state || 'active',
        timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now() / 1000.0,
        pushToken: event.pushToken,
      });
    });
    return () => sub.remove();
  },

  /**
   * Kiểm tra và tự động kết thúc các Live Activity đã quá hạn `scheduledEndTimestamp` (dọn dẹp các phiên bị kẹt).
   * Trả về danh sách các `activityId` đã được dọn dẹp.
   */
  cleanupExpired: async (): Promise<string[]> => {
    const list = await LiveActivity.getActiveActivities();
    const nowSec = Date.now() / 1000.0;
    const cleaned: string[] = [];
    for (const item of list) {
      const endTs = item.scheduledEndTimestamp;
      if (typeof endTs === 'number' && endTs > 0) {
        const normalizedEnd = endTs > 10_000_000_000 ? endTs / 1000.0 : endTs;
        if (nowSec >= normalizedEnd) {
          await LiveActivity.end(item.activityId, { dismissalPolicy: 'immediate' });
          cleaned.push(item.activityId);
        }
      }
    }
    return cleaned;
  },

  /**
   * Kiểm tra xem người dùng có cấp quyền Hoạt động trực tiếp (Live Activities) trong Cài đặt máy hay không.
   */
  areActivitiesEnabled: async (): Promise<boolean> => {
    if (!LiveActivityModule?.areActivitiesEnabled) {
      return false;
    }
    try {
      return await LiveActivityModule.areActivitiesEnabled();
    } catch {
      return false;
    }
  },

  /**
   * iOS 16.2+: Kiểm tra xem người dùng có bật tùy chọn nhận cập nhật đẩy APNs tần suất cao (Frequent Pushes) hay không.
   */
  areFrequentPushesEnabled: async (): Promise<boolean> => {
    if (!LiveActivityModule?.areFrequentPushesEnabled) {
      return false;
    }
    try {
      return await LiveActivityModule.areFrequentPushesEnabled();
    } catch {
      return false;
    }
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

  /**
   * Đăng ký tác vụ chạy ngầm xử lý tương tác nút bấm trên Widget (Headless JS / Background Action Task).
   * Hoạt động ngay cả khi App chính đã bị người dùng vuốt đóng (Killed).
   */
  registerBackgroundActionHandler: (
    handler?: (actionId: string, activityId?: string) => Promise<void> | void
  ) => {
    if (Platform.OS === 'android') {
      try {
        AppRegistry.registerHeadlessTask(
          'LiveActivityBackgroundTask',
          () => async (taskData: any) => {
            const actionId = taskData?.actionId || '';
            const activityId = taskData?.activityId || '';
            if (handler) {
              await handler(actionId, activityId);
            }
            const registered = actionHandlers.get(actionId);
            if (registered) {
              await registered({ actionId, activityId });
            }
            for (const globalHandler of globalActionHandlers) {
              try {
                await globalHandler(actionId, { actionId, activityId });
              } catch (e) {
                console.warn('[react-native-live-widgets] background globalHandler error:', e);
              }
            }
          }
        );
      } catch (e) {
        console.warn('[react-native-live-widgets] registerHeadlessTask warning:', e);
      }
    }
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
   * Yêu cầu vẽ lại một Widget cụ thể theo kind (hỗ trợ cả iOS và Android).
   */
  reload: async (kind: string): Promise<boolean> => {
    if (!LiveActivityModule?.reloadWidget) return false;
    try {
      return await LiveActivityModule.reloadWidget(kind);
    } catch (error) {
      console.warn('[react-native-live-widgets] reload error:', error);
      return false;
    }
  },

  /**
   * Thiết lập layout động cho Home Screen Widget (hỗ trợ small, medium, large).
   * Hỗ trợ gọi 2 hoặc 3 tham số:
   * - `Widget.setLayout('main', layoutConfig, appGroup?)`
   * - `Widget.setLayout(layoutConfig, appGroup?)` (tự động gán widgetKey = 'main')
   * Tự động lưu vào Shared Storage và yêu cầu OS vẽ lại.
   */
  setLayout: async (
    widgetKeyOrConfig: string | WidgetLayoutConfig,
    layoutConfigOrAppGroup?: WidgetLayoutConfig | string,
    maybeAppGroup?: string
  ): Promise<boolean> => {
    try {
      let widgetKey = 'main';
      let layoutConfig: WidgetLayoutConfig;
      let appGroup: string | undefined;

      if (typeof widgetKeyOrConfig === 'string') {
        widgetKey = widgetKeyOrConfig;
        layoutConfig = layoutConfigOrAppGroup as WidgetLayoutConfig;
        appGroup = maybeAppGroup;
      } else {
        layoutConfig = widgetKeyOrConfig;
        appGroup = typeof layoutConfigOrAppGroup === 'string' ? layoutConfigOrAppGroup : undefined;
      }

      const finalLayout = normalizeWidgetLayoutConfig(layoutConfig);

      const saved = await SharedStorage.set(`widget_layout_${widgetKey}`, finalLayout, appGroup);
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setLayout error:', error);
      return false;
    }
  },

  /**
   * Cập nhật layout động cho Widget (Alias tiện ích cho `Widget.setLayout`).
   */
  update: async (
    widgetKeyOrConfig: string | WidgetLayoutConfig,
    layoutConfigOrAppGroup?: WidgetLayoutConfig | string,
    maybeAppGroup?: string
  ): Promise<boolean> => {
    return (Widget.setLayout as any)(widgetKeyOrConfig, layoutConfigOrAppGroup, maybeAppGroup);
  },

  /**
   * Thiết lập dòng thời gian tự động (Timeline Entries) cho Widget.
   * Hệ điều hành iOS/Android sẽ tự động chuyển đổi giữa các layout theo từng mốc thời gian
   * mà KHÔNG tốn pin, không cần ứng dụng mở hay chạy ngầm.
   */
  setTimeline: async (
    widgetKey: string,
    timelineConfig: WidgetTimelineConfig,
    appGroup?: string
  ): Promise<boolean> => {
    try {
      const formattedEntries = timelineConfig.entries.map((entry) => {
        let entryLayout = normalizeWidgetLayoutConfig(entry.layout);
        if (entry.data && typeof entry.data === 'object') {
          const flatVars = flattenDataObject(entry.data);
          entryLayout = resolveLayoutObjectTemplates(entryLayout, flatVars);
        }
        return {
          date:
            typeof entry.date === 'string'
              ? new Date(entry.date).getTime() / 1000.0
              : entry.date > 10000000000
              ? entry.date / 1000.0
              : entry.date,
          layout: entryLayout,
        };
      });
      const formattedConfig = {
        entries: formattedEntries,
        policy: timelineConfig.policy || 'atEnd',
        afterDate: timelineConfig.afterDate
          ? typeof timelineConfig.afterDate === 'string'
            ? new Date(timelineConfig.afterDate).getTime() / 1000.0
            : timelineConfig.afterDate > 10000000000
            ? timelineConfig.afterDate / 1000.0
            : timelineConfig.afterDate
          : undefined,
      };
      const saved = await SharedStorage.set(
        `widget_timeline_${widgetKey}`,
        formattedConfig,
        appGroup
      );
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setTimeline error:', error);
      return false;
    }
  },

  /**
   * Cung cấp danh sách các tùy chọn cấu hình cho Widget (dành cho tính năng Edit Widget / AppIntent Configuration).
   * Ví dụ: Danh sách các Dự án, Chi nhánh, Ca làm để người dùng chọn khi nhấn giữ Widget ngoài Home Screen.
   */
  setConfigurationOptions: async (
    widgetKey: string,
    options: WidgetConfigOption[],
    appGroup?: string
  ): Promise<boolean> => {
    return await SharedStorage.set(`widget_config_options_${widgetKey}`, options, appGroup);
  },

  /**
   * Lấy ID tùy chọn cấu hình đang được người dùng chọn ghim trên Widget.
   */
  getSelectedConfiguration: async (
    widgetKey: string,
    appGroup?: string
  ): Promise<string | null> => {
    return await SharedStorage.get<string>(`widget_selected_config_${widgetKey}`, appGroup);
  },

  /**
   * Thiết lập lựa chọn cấu hình cho Widget từ trong ứng dụng.
   */
  setSelectedConfiguration: async (
    widgetKey: string,
    selectedId: string,
    appGroup?: string
  ): Promise<boolean> => {
    const ok = await SharedStorage.set(
      `widget_selected_config_${widgetKey}`,
      selectedId,
      appGroup
    );
    await Widget.reloadAll();
    return ok;
  },

  /**
   * Cấu hình Background Data Engine 2.0 để Widget Extension tự gọi API ngầm (REST, Custom Headers,
   * Cache TTL, ETag/304, Retry/Backoff, Timeout, Multiple Sources, Data Transform, Schema Validation,
   * Auth Token Refresh & Error State) kể cả khi App chính đã bị đóng hoàn toàn.
   *
   * Lưu ý hệ điều hành: Apple WidgetKit quản lý ngân sách reload động (~40–70 lần/ngày tùy mức sử dụng,
   * `refreshIntervalMinutes` chỉ là mốc sớm nhất đề xuất chứ không cam kết chạy đúng mỗi 15 phút khi app đóng);
   * Android cũng áp dụng Doze Mode / App Standby cho background task.
   *
   * Hỗ trợ gọi linh hoạt:
   * - `Widget.setRemoteConfig('main', config, appGroup?)`
   * - `Widget.setRemoteConfig(config, appGroup?)` (tự động gán widgetKey = 'main')
   */
  setRemoteConfig: async (
    widgetKeyOrConfig: string | WidgetRemoteConfig,
    remoteConfigOrAppGroup?: WidgetRemoteConfig | string,
    maybeAppGroup?: string
  ): Promise<boolean> => {
    try {
      let widgetKey = 'main';
      let remoteConfig: WidgetRemoteConfig;
      let appGroup: string | undefined;

      if (typeof widgetKeyOrConfig === 'string') {
        widgetKey = widgetKeyOrConfig;
        remoteConfig = remoteConfigOrAppGroup as WidgetRemoteConfig;
        appGroup = maybeAppGroup;
      } else {
        remoteConfig = widgetKeyOrConfig;
        appGroup = typeof remoteConfigOrAppGroup === 'string' ? remoteConfigOrAppGroup : undefined;
      }

      const finalConfig: WidgetRemoteConfig = { ...remoteConfig };
      if (
        finalConfig.intervalMinutes !== undefined &&
        finalConfig.refreshIntervalMinutes === undefined
      ) {
        finalConfig.refreshIntervalMinutes = finalConfig.intervalMinutes;
      } else if (
        finalConfig.refreshIntervalMinutes !== undefined &&
        finalConfig.intervalMinutes === undefined
      ) {
        finalConfig.intervalMinutes = finalConfig.refreshIntervalMinutes;
      }
      if (finalConfig.errorFallback) {
        finalConfig.errorFallback = convertIfJsx(finalConfig.errorFallback);
      }

      const saved = await SharedStorage.set(
        `widget_remote_config_${widgetKey}`,
        finalConfig,
        appGroup
      );
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setRemoteConfig error:', error);
      return false;
    }
  },

  /**
   * Đẩy dữ liệu có cấu trúc (Structured Data Binding) từ JS/TS xuống Native Shared Storage
   * để Home Screen Widget cập nhật tức thì mà không cần dựng lại toàn bộ cây layout.
   *
   * Hỗ trợ gọi linh hoạt:
   * - `Widget.setData('main', data, appGroup?)`
   * - `Widget.setData(data, appGroup?)` (tự động gán widgetKey = 'main')
   */
  setData: async (
    widgetKeyOrData: string | Record<string, any>,
    dataOrAppGroup?: Record<string, any> | string,
    maybeAppGroup?: string
  ): Promise<boolean> => {
    try {
      let widgetKey = 'main';
      let dataObj: Record<string, any>;
      let appGroup: string | undefined;

      if (typeof widgetKeyOrData === 'string') {
        widgetKey = widgetKeyOrData;
        dataObj = (dataOrAppGroup as Record<string, any>) || {};
        appGroup = maybeAppGroup;
      } else {
        dataObj = widgetKeyOrData || {};
        appGroup = typeof dataOrAppGroup === 'string' ? dataOrAppGroup : undefined;
      }

      const flattened = flattenDataObject(dataObj);
      const saved = await SharedStorage.set(`widget_bound_data_${widgetKey}`, flattened, appGroup);
      if (!saved) return false;
      return await Widget.reloadAll();
    } catch (error) {
      console.warn('[react-native-live-widgets] setData error:', error);
      return false;
    }
  },

  /**
   * Tạo Proxy Data Binding có cấu trúc & gợi ý kiểu TypeScript cho JSX/DSL Widget (`data.user.name`, `data.attendance.progress.divide(100)`).
   */
  createDataBinding,

  /**
   * Tạo chuỗi token binding (`{{path|pipe}}`) cho hệ thống Background Data Engine 2.0.
   */
  bind: UI.bind,

  /** Đăng ký lắng nghe tương tác nút bấm từ Widget theo `actionId` */
  registerAction: registerAction,

  /** Đăng ký lắng nghe toàn cục tất cả tương tác nút bấm từ Widget (alias) */
  onWidgetAction: registerActionHandler,

  /** Đăng ký lắng nghe toàn cục tất cả tương tác nút bấm từ Widget */
  registerActionHandler: registerActionHandler,

  /**
   * (Android 8.0+) Mở hộp thoại hệ thống cho phép người dùng ghim trực tiếp Tiện ích ra màn hình chính ngay từ trong ứng dụng.
   * Trên iOS, hàm trả về false vì Apple chỉ cho phép người dùng tự thêm tiện ích từ thư viện Widget của hệ điều hành.
   */
  requestPin: async (): Promise<boolean> => {
    if (!LiveActivityModule?.requestPinWidget) return false;
    try {
      return await LiveActivityModule.requestPinWidget();
    } catch (error) {
      console.warn('[react-native-live-widgets] Widget.requestPin error:', error);
      return false;
    }
  },

  /**
   * Kiểm tra xem thiết bị hiện tại có hỗ trợ ghim Tiện ích trực tiếp từ trong ứng dụng hay không (Chỉ Android API 26+).
   */
  isPinSupported: async (): Promise<boolean> => {
    if (!LiveActivityModule?.isRequestPinWidgetSupported) return false;
    try {
      return await LiveActivityModule.isRequestPinWidgetSupported();
    } catch {
      return false;
    }
  },

  /**
   * 📊 Bảng tra cứu năng lực nền tảng (Platform Capability & Fallback Matrix).
   * Giúp ứng dụng xác định chính xác tính năng nào được hỗ trợ thực tế trên thiết bị đang chạy.
   */
  getCapabilities: async (): Promise<WidgetCapabilities> => {
    const isIOS = Platform.OS === 'ios';
    const isAndroid = Platform.OS === 'android';
    const osVerNum = parseFloat(String(Platform.Version)) || 0;

    let hasIsland = false;
    if (isIOS) {
      try {
        hasIsland = LiveActivityModule?.isDynamicIslandSupported
          ? await LiveActivityModule.isDynamicIslandSupported()
          : osVerNum >= 16.1;
      } catch {
        hasIsland = osVerNum >= 16.1;
      }
    }

    return {
      platform: isIOS ? 'ios' : 'android',
      osVersion: Platform.Version,
      supportsLiveActivities: isIOS ? osVerNum >= 16.1 : osVerNum >= 26,
      supportsDynamicIsland: hasIsland,
      supportsAndroidLiveUpdates: isAndroid && osVerNum >= 36,
      supportsHomeWidgets: isIOS ? osVerNum >= 14.0 : osVerNum >= 26,
      supportsInteractiveIntents: isIOS ? osVerNum >= 17.0 : true,
      supportsGradients: true,
      supportsShadows: true,
      supportsDashedBorders: true,
      supportsDynamicType: true,
      supportsRTL: true,
      supportsTintedMode: isIOS ? osVerNum >= 18.0 : isAndroid,
      supportsNumericAnimation: isIOS && osVerNum >= 16.0,
      supportsAccessibility: true,
    };
  },

  /**
   * 🎛️ Cấu hình Control Widget (iOS 18+ Control Center / Lock Screen Controls / Action Button & Android Quick Settings).
   */
  setControl: async (
    controlId: string,
    config: ControlWidgetConfig,
    appGroup?: string
  ): Promise<boolean> => {
    try {
      return await SharedStorage.set(`widget_control_${controlId}`, config, appGroup);
    } catch (error) {
      console.warn('[react-native-live-widgets] setControl error:', error);
      return false;
    }
  },

  /**
   * Đọc cấu hình và trạng thái hiện tại của Control Widget từ Shared Storage.
   */
  getControlState: async (
    controlId: string,
    appGroup?: string
  ): Promise<ControlWidgetConfig | null> => {
    try {
      return await SharedStorage.get<ControlWidgetConfig>(`widget_control_${controlId}`, appGroup);
    } catch {
      return null;
    }
  },

  /**
   * 🌲 Biên dịch cây DSL sang UI Intermediate Representation (IR & Semantic Tree - Phase 2).
   */
  compileIR: (layout: any): WidgetIR => {
    return compileToIR(layout);
  },

  /**
   * 🔍 Phân tích và in ra bản đồ kiến trúc IR, Semantic Tree và Kế hoạch phân bổ Renderer Planner.
   */
  inspectIR: (layout: any): string => {
    return inspectIR(layout);
  },

  /**
   * ♿ Công cụ kiểm tra Cây Trợ Năng thực tế (Accessibility Test Inspector).
   * Hiển thị rõ thứ tự Focus Order, Grouping, State Description, Adjustable Actions và hướng RTL.
   */
  inspectAccessibilityTree: (layout: any, options?: { rtl?: boolean }): string => {
    return inspectAccessibilityTree(layout, options);
  },

  // ─── NHÓM B: PERSISTENT ACTION QUEUE & ATOMIC STATE LIFECYCLE (P0) ────────

  /** 📥 Đẩy 1 action vào Persistent Action Queue kèm Idempotency Key & Deduplication */
  enqueueAction: enqueuePendingAction,

  /** 📋 Lấy danh sách các Pending Actions đang chờ đồng bộ */
  getPendingActions,

  /** 🔄 Khôi phục các action bị kẹt ở trạng thái 'syncing' sau khi app bị kill/crash */
  recoverPendingActions,

  /** ⚡ Đồng bộ hàng đợi Pending Actions lên backend với Retry Policy (exponential/linear/fixed) */
  syncPendingActions,

  /** 🧹 Xóa Pending Actions khỏi hàng đợi (tất cả hoặc theo trạng thái) */
  clearPendingActions,

  /** 📜 Đăng ký State Schema & hàm Migration khi nâng cấp phiên bản dữ liệu */
  registerStateSchema,

  /** 📦 Đọc State có versioning + tự động chạy Migration nếu là phiên bản cũ */
  getVersionedState: readVersionedState,

  /** 🔒 Cập nhật State nguyên tử (Atomic Update) kèm Conflict Resolution & Multi-instance Isolation */
  updateStateAtomic,

  // ─── NHÓM C: BACKGROUND DATA ENGINE, SWR, CACHE & OBSERVABILITY (P1) ──────

  /** 🗑️ Chủ động xóa Cache (TTL + ETag) để ép lần đồng bộ tiếp theo tải dữ liệu mới nhất */
  invalidateCache: async (
    widgetKey = 'main',
    sourceKey?: string,
    appGroup?: string
  ): Promise<boolean> => {
    try {
      const markerKey = sourceKey
        ? `widget_cache_invalidated_${widgetKey}_${sourceKey}`
        : `widget_cache_invalidated_${widgetKey}`;
      await SharedStorage.set(markerKey, Date.now(), appGroup);
      return await Widget.reloadAll();
    } catch {
      return false;
    }
  },

  /** 🔐 Lưu token/credential bảo mật để Native Data Engine tự nội suy qua `{{$secure.<key>}}` */
  setSecureToken: async (
    tokenKey: string,
    tokenValue: string,
    appGroup?: string
  ): Promise<boolean> => {
    return await SharedStorage.set(`widget_secure_cred_${tokenKey}`, tokenValue, appGroup);
  },

  /** 🗑️ Xóa token bảo mật khỏi Shared Secure Store */
  removeSecureToken: async (tokenKey: string, appGroup?: string): Promise<boolean> => {
    return await SharedStorage.remove(`widget_secure_cred_${tokenKey}`, appGroup);
  },

  /** 📊 Theo dõi trạng thái đồng bộ & hiệu năng cache (Sync Observability) */
  getSyncStatus: async (widgetKey = 'main', appGroup?: string) => {
    const telemetry = await SharedStorage.get<any>(`widget_sync_telemetry_${widgetKey}`, appGroup);
    return (
      telemetry || {
        widgetKey,
        state: 'idle',
        cacheStatus: 'miss',
        isStale: false,
        isOffline: false,
      }
    );
  },

  /** 🔍 So sánh Diff dữ liệu giữa 2 snapshot (Data Diff / Incremental Update) */
  computeDataDiff,

  /** ⏱️ Đánh giá trạng thái Cache (fresh / stale / miss) theo chuẩn Stale-While-Revalidate */
  evaluateCacheStatus,
};

/**
 * 🎛️ Namespace cấu hình & quản lý Control Widget đa nền tảng
 * (iOS 18+ Control Center / Lock Screen Controls / Action Button & Android Quick Settings Tile).
 */
export const ControlWidget = {
  set: Widget.setControl,
  getState: Widget.getControlState,
  button: UI.ControlButton,
  toggle: UI.ControlToggle,
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

// ─── 4. AUDIO PLAYER (MUSIC PLAYBACK & EQUALIZER TESTING) ────────────────────

export interface AudioPlayerStatus {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface AudioTrackMetadata {
  title?: string;
  artist?: string;
  artworkUrl?: string;
  duration?: number;
}

export const AudioPlayer = {
  /**
   * Phát nhạc trực tiếp từ URL (hỗ trợ stream mp3, m4a, aac, wav...)
   * và đăng ký hệ thống Now Playing của iOS (hiện trên Dynamic Island & Lock Screen như Spotify).
   */
  play: async (url: string, metadata?: AudioTrackMetadata): Promise<boolean> => {
    if (!LiveActivityModule?.playAudio) return false;
    try {
      return await LiveActivityModule.playAudio(url, metadata || null);
    } catch (error) {
      console.warn('[react-native-live-widgets] AudioPlayer.play error:', error);
      return false;
    }
  },

  /**
   * Tạm dừng bài nhạc đang phát.
   */
  pause: async (): Promise<boolean> => {
    if (!LiveActivityModule?.pauseAudio) return false;
    try {
      return await LiveActivityModule.pauseAudio();
    } catch (error) {
      console.warn('[react-native-live-widgets] AudioPlayer.pause error:', error);
      return false;
    }
  },

  /**
   * Tiếp tục phát bài nhạc sau khi tạm dừng.
   */
  resume: async (): Promise<boolean> => {
    if (!LiveActivityModule?.resumeAudio) return false;
    try {
      return await LiveActivityModule.resumeAudio();
    } catch (error) {
      console.warn('[react-native-live-widgets] AudioPlayer.resume error:', error);
      return false;
    }
  },

  /**
   * Dừng hẳn bài nhạc và giải phóng tài nguyên phát.
   */
  stop: async (): Promise<boolean> => {
    if (!LiveActivityModule?.stopAudio) return false;
    try {
      return await LiveActivityModule.stopAudio();
    } catch (error) {
      console.warn('[react-native-live-widgets] AudioPlayer.stop error:', error);
      return false;
    }
  },

  /**
   * Lấy trạng thái hiện tại của trình phát nhạc (đang phát, thời lượng, vị trí phát).
   */
  getStatus: async (): Promise<AudioPlayerStatus> => {
    if (!LiveActivityModule?.getAudioStatus) {
      return { isPlaying: false, currentTime: 0, duration: 0 };
    }
    try {
      return await LiveActivityModule.getAudioStatus();
    } catch (error) {
      return { isPlaying: false, currentTime: 0, duration: 0 };
    }
  },
};

export * from './types';
export * from './builder';
export * from './ir';
export * from './actionQueue';
export { StyleSheet } from './builder';
export * from './hooks';

// Kết nối Storage Backend mặc định (SharedStorage) cho Persistent Action Queue & Atomic State Engine
setEngineStorageBackend(SharedStorage);

/**
 * Định nghĩa cấu hình các Widget cho ứng dụng với đầy đủ Type Safety và gợi ý thuộc tính IDE.
 * Cấu hình này được công cụ Codegen (`npx react-native-live-widgets codegen`) đọc
 * để tự động tạo file LiveWidgetsBundle.swift cho iOS WidgetKit.
 */
export function defineWidgetsConfig<T extends import('./types').WidgetsProjectConfig>(config: T): T {
  return config;
}

/**
 * Alias cho `defineWidgetsConfig` (hỗ trợ cả dạng số ít và số nhiều)
 */
export const defineWidgetConfig = defineWidgetsConfig;
