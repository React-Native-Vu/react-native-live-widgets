import { AppRegistry, NativeEventEmitter, NativeModules, Platform } from 'react-native';
const { LiveActivityModule } = NativeModules;
if (!LiveActivityModule && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[react-native-live-widgets] Native module not found. ' +
        'Please ensure you have run "npx react-native-live-widgets init" and re-compiled your app.');
}
const liveActivityEmitter = LiveActivityModule
    ? new NativeEventEmitter(LiveActivityModule)
    : null;
const DEVICE_TOKEN_CHANGED_EVENT = 'DevicePushTokenChanged';
const TOKEN_CHANGED_EVENT = 'LiveActivityTokenChanged';
const UPDATE_TOKEN_CHANGED_EVENT = 'LiveActivityUpdateTokenChanged';
const ACTION_CLICKED_EVENT = 'LiveActivityActionClicked';
import { actionHandlers, registerAction, unregisterAction } from './dispatcher';
export { registerAction, unregisterAction };
// Tự động lắng nghe action event từ Native để dispatch tới các hàm TypeScript đã đăng ký
if (liveActivityEmitter) {
    liveActivityEmitter.addListener(ACTION_CLICKED_EVENT, async (event) => {
        const actionId = event?.actionId || '';
        const activityId = event?.activityId || '';
        const handler = actionHandlers.get(actionId);
        if (handler) {
            try {
                await handler({ actionId, activityId });
            }
            catch (e) {
                console.warn(`[react-native-live-widgets] Error executing action '${actionId}':`, e);
            }
        }
    });
}
// ─── 1. LIVE ACTIVITY & LIVE UPDATE ──────────────────────────────────────────
export const LiveActivity = {
    /**
     * Khởi động một Live Activity (iOS) hoặc Live Update / Ongoing Notification (Android).
     */
    start: async (options) => {
        if (!LiveActivityModule?.start)
            return false;
        try {
            const payload = JSON.stringify(options);
            return await LiveActivityModule.start(options.activityId, payload);
        }
        catch (error) {
            console.warn('[react-native-live-widgets] start error:', error);
            return false;
        }
    },
    /**
     * Cập nhật nội dung Live Activity hiện tại.
     */
    update: async (options) => {
        if (!LiveActivityModule?.update)
            return false;
        try {
            const payload = JSON.stringify(options);
            return await LiveActivityModule.update(options.activityId, payload);
        }
        catch (error) {
            console.warn('[react-native-live-widgets] update error:', error);
            return false;
        }
    },
    /**
     * Kết thúc một Live Activity cụ thể theo activityId với các chính sách linh hoạt (Dismissal Policy & Final Summary Layout).
     */
    end: async (activityId, options) => {
        try {
            if (options && (LiveActivityModule?.endWithOptions || LiveActivityModule?.endActivity)) {
                const payloadJson = options.finalLockScreen || options.finalDynamicIsland
                    ? JSON.stringify({
                        activityId,
                        lockScreen: options.finalLockScreen,
                        dynamicIsland: options.finalDynamicIsland,
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
        }
        catch (error) {
            console.warn('[react-native-live-widgets] end error:', error);
            return false;
        }
    },
    /**
     * Tắt tất cả Live Activity / Live Update của ứng dụng.
     */
    endAll: async () => {
        if (!LiveActivityModule?.endAll)
            return false;
        try {
            return await LiveActivityModule.endAll();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] endAll error:', error);
            return false;
        }
    },
    /**
     * Đăng ký và lấy Push Token của thiết bị (APNs Device Token trên iOS / FCM Device Token trên Android).
     */
    getDevicePushToken: async () => {
        if (!LiveActivityModule?.getDevicePushToken) {
            return undefined;
        }
        try {
            const token = await LiveActivityModule.getDevicePushToken();
            return token || undefined;
        }
        catch {
            return undefined;
        }
    },
    /**
     * Lấy Push-to-Start token để backend kích hoạt mở mới Live Activity / Live Update từ xa.
     */
    getPushToStartToken: async () => {
        if (!LiveActivityModule?.getPushToStartToken) {
            return undefined;
        }
        try {
            const token = await LiveActivityModule.getPushToStartToken();
            return token || undefined;
        }
        catch {
            return undefined;
        }
    },
    /**
     * Lấy Update Push Token của một phiên Live Activity / Live Update đang chạy (theo activityId)
     * để backend gửi bản cập nhật ("event": "update") hoặc kết thúc ("event": "end").
     */
    getActivityPushToken: async (activityId) => {
        if (!LiveActivityModule?.getActivityPushToken) {
            return undefined;
        }
        try {
            const token = await LiveActivityModule.getActivityPushToken(activityId);
            return token || undefined;
        }
        catch {
            return undefined;
        }
    },
    /**
     * Lấy trọn bộ cả 3 loại Push Token trong 1 lần gọi (hỗ trợ cả iOS APNs & Android):
     * - `devicePushToken`: Token của máy
     * - `pushToStartToken`: Token mở mới Live Activity / Live Update từ xa
     * - `activityUpdateToken`: Token cập nhật phiên Live Activity đang chạy
     */
    getAllPushTokens: async (activityId) => {
        const empty = {
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
        }
        catch {
            return empty;
        }
    },
    /**
     * Lắng nghe khi hệ điều hành cấp mới hoặc thay đổi Device Push Token của máy.
     */
    onDevicePushTokenChange: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(DEVICE_TOKEN_CHANGED_EVENT, (token) => {
            listener(typeof token === 'string' ? token : String(token ?? ''));
        });
        return () => sub.remove();
    },
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Push-to-Start Token mới.
     */
    onPushToStartTokenChange: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(TOKEN_CHANGED_EVENT, (token) => {
            listener(typeof token === 'string' ? token : String(token ?? ''));
        });
        return () => sub.remove();
    },
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Update Token cho một Live Activity cụ thể.
     * Trả về `{ activityId, token }` để gửi ngay lên Backend.
     */
    onActivityUpdateTokenChange: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(UPDATE_TOKEN_CHANGED_EVENT, (event) => {
            listener(event);
        });
        return () => sub.remove();
    },
    /**
     * Đăng ký một hàm xử lý logic TypeScript khi người dùng bấm nút có `actionId` tương ứng ngoài Widget/Live Activity.
     * Hoạt động mượt mà cả khi App đang mở lẫn chạy ngầm.
     * Trả về hàm hủy đăng ký (unsubscribe).
     */
    registerAction: (actionId, handler) => {
        actionHandlers.set(actionId, handler);
        return () => {
            actionHandlers.delete(actionId);
        };
    },
    /**
     * Hủy đăng ký action handler theo `actionId`.
     */
    unregisterAction: (actionId) => {
        actionHandlers.delete(actionId);
    },
    /**
     * Lấy danh sách các phiên Live Activity đang chạy trên thiết bị (ID và Push Token).
     * Giúp ứng dụng khôi phục lại trạng thái giao diện khi mở lại App.
     */
    getActiveActivities: async () => {
        if (!LiveActivityModule?.getActiveActivities) {
            return [];
        }
        try {
            const list = await LiveActivityModule.getActiveActivities();
            return (list || []).map((item) => ({
                activityId: item.activityId || '',
                pushToken: item.pushToken,
            }));
        }
        catch (e) {
            console.warn('[react-native-live-widgets] getActiveActivities error:', e);
            return [];
        }
    },
    /**
     * Kiểm tra xem người dùng có cấp quyền Hoạt động trực tiếp (Live Activities) trong Cài đặt máy hay không.
     */
    areActivitiesEnabled: async () => {
        if (!LiveActivityModule?.areActivitiesEnabled) {
            return false;
        }
        try {
            return await LiveActivityModule.areActivitiesEnabled();
        }
        catch {
            return false;
        }
    },
    /**
     * iOS 16.2+: Kiểm tra xem người dùng có bật tùy chọn nhận cập nhật đẩy APNs tần suất cao (Frequent Pushes) hay không.
     */
    areFrequentPushesEnabled: async () => {
        if (!LiveActivityModule?.areFrequentPushesEnabled) {
            return false;
        }
        try {
            return await LiveActivityModule.areFrequentPushesEnabled();
        }
        catch {
            return false;
        }
    },
    /**
     * Lắng nghe khi người dùng bấm vào một Action Button.
     */
    onActionClicked: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(ACTION_CLICKED_EVENT, (event) => {
            listener(event.actionId, event.activityId);
        });
        return () => sub.remove();
    },
    /**
     * Android 16+: Kiểm tra quyền Promoted Ongoing Notifications.
     */
    canPostPromoted: async () => {
        if (Platform.OS !== 'android' || !LiveActivityModule?.canPostPromoted) {
            return false;
        }
        return await LiveActivityModule.canPostPromoted();
    },
    /**
     * Đăng ký tác vụ chạy ngầm xử lý tương tác nút bấm trên Widget (Headless JS / Background Action Task).
     * Hoạt động ngay cả khi App chính đã bị người dùng vuốt đóng (Killed).
     */
    registerBackgroundActionHandler: (handler) => {
        if (Platform.OS === 'android') {
            try {
                AppRegistry.registerHeadlessTask('LiveActivityBackgroundTask', () => async (taskData) => {
                    const actionId = taskData?.actionId || '';
                    const activityId = taskData?.activityId || '';
                    if (handler) {
                        await handler(actionId, activityId);
                    }
                    const registered = actionHandlers.get(actionId);
                    if (registered) {
                        await registered({ actionId, activityId });
                    }
                });
            }
            catch (e) {
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
    reloadAll: async () => {
        if (!LiveActivityModule?.reloadAllWidgets)
            return false;
        try {
            return await LiveActivityModule.reloadAllWidgets();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] reloadAll error:', error);
            return false;
        }
    },
    /**
     * Yêu cầu vẽ lại một Widget cụ thể theo kind (hỗ trợ cả iOS và Android).
     */
    reload: async (kind) => {
        if (!LiveActivityModule?.reloadWidget)
            return false;
        try {
            return await LiveActivityModule.reloadWidget(kind);
        }
        catch (error) {
            console.warn('[react-native-live-widgets] reload error:', error);
            return false;
        }
    },
    /**
     * Thiết lập layout động cho Home Screen Widget (hỗ trợ small, medium, large).
     * Tự động lưu vào Shared Storage và yêu cầu vẽ lại.
     */
    setLayout: async (widgetKey, layoutConfig, appGroup) => {
        try {
            const saved = await SharedStorage.set(`widget_layout_${widgetKey}`, layoutConfig, appGroup);
            if (!saved)
                return false;
            return await Widget.reloadAll();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] setLayout error:', error);
            return false;
        }
    },
    /**
     * Thiết lập dòng thời gian tự động (Timeline Entries) cho Widget.
     * Hệ điều hành iOS/Android sẽ tự động chuyển đổi giữa các layout theo từng mốc thời gian
     * mà KHÔNG tốn pin, không cần ứng dụng mở hay chạy ngầm.
     */
    setTimeline: async (widgetKey, timelineConfig, appGroup) => {
        try {
            const formattedEntries = timelineConfig.entries.map((entry) => ({
                date: typeof entry.date === 'string'
                    ? new Date(entry.date).getTime() / 1000.0
                    : entry.date > 10000000000
                        ? entry.date / 1000.0
                        : entry.date,
                layout: entry.layout,
            }));
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
            const saved = await SharedStorage.set(`widget_timeline_${widgetKey}`, formattedConfig, appGroup);
            if (!saved)
                return false;
            return await Widget.reloadAll();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] setTimeline error:', error);
            return false;
        }
    },
    /**
     * Cung cấp danh sách các tùy chọn cấu hình cho Widget (dành cho tính năng Edit Widget / AppIntent Configuration).
     * Ví dụ: Danh sách các Dự án, Chi nhánh, Ca làm để người dùng chọn khi nhấn giữ Widget ngoài Home Screen.
     */
    setConfigurationOptions: async (widgetKey, options, appGroup) => {
        return await SharedStorage.set(`widget_config_options_${widgetKey}`, options, appGroup);
    },
    /**
     * Lấy ID tùy chọn cấu hình đang được người dùng chọn ghim trên Widget.
     */
    getSelectedConfiguration: async (widgetKey, appGroup) => {
        return await SharedStorage.get(`widget_selected_config_${widgetKey}`, appGroup);
    },
    /**
     * Thiết lập lựa chọn cấu hình cho Widget từ trong ứng dụng.
     */
    setSelectedConfiguration: async (widgetKey, selectedId, appGroup) => {
        const ok = await SharedStorage.set(`widget_selected_config_${widgetKey}`, selectedId, appGroup);
        await Widget.reloadAll();
        return ok;
    },
    /**
     * Cấu hình Endpoint API để bản thân Widget Extension tự chạy ngầm lấy dữ liệu mới
     * theo chu kỳ (`getTimeline`) hoặc khi bấm nút `actionId: 'refresh'` trên mặt Widget,
     * kể cả khi người dùng đã vuốt tắt (Kill) hoàn toàn ứng dụng chính!
     */
    setRemoteConfig: async (widgetKey, remoteConfig, appGroup) => {
        try {
            const saved = await SharedStorage.set(`widget_remote_config_${widgetKey}`, remoteConfig, appGroup);
            if (!saved)
                return false;
            return await Widget.reloadAll();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] setRemoteConfig error:', error);
            return false;
        }
    },
    /**
     * (Android 8.0+) Mở hộp thoại hệ thống cho phép người dùng ghim trực tiếp Tiện ích ra màn hình chính ngay từ trong ứng dụng.
     * Trên iOS, hàm trả về false vì Apple chỉ cho phép người dùng tự thêm tiện ích từ thư viện Widget của hệ điều hành.
     */
    requestPin: async () => {
        if (!LiveActivityModule?.requestPinWidget)
            return false;
        try {
            return await LiveActivityModule.requestPinWidget();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] Widget.requestPin error:', error);
            return false;
        }
    },
    /**
     * Kiểm tra xem thiết bị hiện tại có hỗ trợ ghim Tiện ích trực tiếp từ trong ứng dụng hay không (Chỉ Android API 26+).
     */
    isPinSupported: async () => {
        if (!LiveActivityModule?.isRequestPinWidgetSupported)
            return false;
        try {
            return await LiveActivityModule.isRequestPinWidgetSupported();
        }
        catch {
            return false;
        }
    },
};
// ─── 3. SHARED STORAGE (App Groups & SharedPreferences) ─────────────────────
export const SharedStorage = {
    /**
     * Lưu dữ liệu vào App Group (iOS) hoặc SharedPreferences (Android) để Widget đọc.
     */
    set: async (key, value, appGroup) => {
        if (!LiveActivityModule?.setSharedItem)
            return false;
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            return await LiveActivityModule.setSharedItem(key, stringValue, appGroup || '');
        }
        catch (error) {
            console.warn('[react-native-live-widgets] SharedStorage.set error:', error);
            return false;
        }
    },
    /**
     * Đọc dữ liệu từ App Group hoặc SharedPreferences.
     */
    get: async (key, appGroup) => {
        if (!LiveActivityModule?.getSharedItem)
            return null;
        try {
            const raw = await LiveActivityModule.getSharedItem(key, appGroup || '');
            if (!raw)
                return null;
            try {
                return JSON.parse(raw);
            }
            catch {
                return raw;
            }
        }
        catch (error) {
            console.warn('[react-native-live-widgets] SharedStorage.get error:', error);
            return null;
        }
    },
    /**
     * Xóa 1 giá trị theo key.
     */
    remove: async (key, appGroup) => {
        if (!LiveActivityModule?.removeSharedItem)
            return false;
        try {
            return await LiveActivityModule.removeSharedItem(key, appGroup || '');
        }
        catch (error) {
            console.warn('[react-native-live-widgets] SharedStorage.remove error:', error);
            return false;
        }
    },
    /**
     * Xóa sạch toàn bộ dữ liệu trong App Group.
     */
    clear: async (appGroup) => {
        if (!LiveActivityModule?.clearSharedItems)
            return false;
        try {
            return await LiveActivityModule.clearSharedItems(appGroup || '');
        }
        catch (error) {
            console.warn('[react-native-live-widgets] SharedStorage.clear error:', error);
            return false;
        }
    },
};
export const AudioPlayer = {
    /**
     * Phát nhạc trực tiếp từ URL (hỗ trợ stream mp3, m4a, aac, wav...)
     * và đăng ký hệ thống Now Playing của iOS (hiện trên Dynamic Island & Lock Screen như Spotify).
     */
    play: async (url, metadata) => {
        if (!LiveActivityModule?.playAudio)
            return false;
        try {
            return await LiveActivityModule.playAudio(url, metadata || null);
        }
        catch (error) {
            console.warn('[react-native-live-widgets] AudioPlayer.play error:', error);
            return false;
        }
    },
    /**
     * Tạm dừng bài nhạc đang phát.
     */
    pause: async () => {
        if (!LiveActivityModule?.pauseAudio)
            return false;
        try {
            return await LiveActivityModule.pauseAudio();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] AudioPlayer.pause error:', error);
            return false;
        }
    },
    /**
     * Tiếp tục phát bài nhạc sau khi tạm dừng.
     */
    resume: async () => {
        if (!LiveActivityModule?.resumeAudio)
            return false;
        try {
            return await LiveActivityModule.resumeAudio();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] AudioPlayer.resume error:', error);
            return false;
        }
    },
    /**
     * Dừng hẳn bài nhạc và giải phóng tài nguyên phát.
     */
    stop: async () => {
        if (!LiveActivityModule?.stopAudio)
            return false;
        try {
            return await LiveActivityModule.stopAudio();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] AudioPlayer.stop error:', error);
            return false;
        }
    },
    /**
     * Lấy trạng thái hiện tại của trình phát nhạc (đang phát, thời lượng, vị trí phát).
     */
    getStatus: async () => {
        if (!LiveActivityModule?.getAudioStatus) {
            return { isPlaying: false, currentTime: 0, duration: 0 };
        }
        try {
            return await LiveActivityModule.getAudioStatus();
        }
        catch (error) {
            return { isPlaying: false, currentTime: 0, duration: 0 };
        }
    },
};
export * from './types';
export * from './builder';
export { StyleSheet } from './builder';
//# sourceMappingURL=index.js.map