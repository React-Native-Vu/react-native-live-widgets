"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleSheet = exports.AudioPlayer = exports.SharedStorage = exports.Widget = exports.LiveActivity = void 0;
const react_native_1 = require("react-native");
const { LiveActivityModule } = react_native_1.NativeModules;
if (!LiveActivityModule && __DEV__) {
    console.warn('[react-native-live-widgets] Native module not found. ' +
        'Please ensure you have run "npx react-native-live-widgets init" and re-compiled your app.');
}
const liveActivityEmitter = LiveActivityModule
    ? new react_native_1.NativeEventEmitter(LiveActivityModule)
    : null;
const DEVICE_TOKEN_CHANGED_EVENT = 'DevicePushTokenChanged';
const TOKEN_CHANGED_EVENT = 'LiveActivityTokenChanged';
const UPDATE_TOKEN_CHANGED_EVENT = 'LiveActivityUpdateTokenChanged';
const ACTION_CLICKED_EVENT = 'LiveActivityActionClicked';
// ─── 1. LIVE ACTIVITY & LIVE UPDATE ──────────────────────────────────────────
exports.LiveActivity = {
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
     * Kết thúc một Live Activity cụ thể theo activityId.
     */
    end: async (activityId) => {
        if (!LiveActivityModule?.end)
            return false;
        try {
            return await LiveActivityModule.end(activityId);
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
        const sub = liveActivityEmitter.addListener(DEVICE_TOKEN_CHANGED_EVENT, listener);
        return () => sub.remove();
    },
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Push-to-Start Token mới.
     */
    onPushToStartTokenChange: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(TOKEN_CHANGED_EVENT, listener);
        return () => sub.remove();
    },
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Update Token cho một Live Activity cụ thể.
     * Trả về `{ activityId, token }` để gửi ngay lên Backend.
     */
    onActivityUpdateTokenChange: (listener) => {
        if (!liveActivityEmitter)
            return () => { };
        const sub = liveActivityEmitter.addListener(UPDATE_TOKEN_CHANGED_EVENT, listener);
        return () => sub.remove();
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
        if (react_native_1.Platform.OS !== 'android' || !LiveActivityModule?.canPostPromoted) {
            return false;
        }
        return await LiveActivityModule.canPostPromoted();
    },
};
// ─── 2. HOME SCREEN WIDGETS ──────────────────────────────────────────────────
exports.Widget = {
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
            const saved = await exports.SharedStorage.set(`widget_layout_${widgetKey}`, layoutConfig, appGroup);
            if (!saved)
                return false;
            return await exports.Widget.reloadAll();
        }
        catch (error) {
            console.warn('[react-native-live-widgets] setLayout error:', error);
            return false;
        }
    },
    /**
     * Cấu hình Endpoint API để bản thân Widget Extension tự chạy ngầm lấy dữ liệu mới
     * theo chu kỳ (`getTimeline`) hoặc khi bấm nút `actionId: 'refresh'` trên mặt Widget,
     * kể cả khi người dùng đã vuốt tắt (Kill) hoàn toàn ứng dụng chính!
     */
    setRemoteConfig: async (widgetKey, remoteConfig, appGroup) => {
        try {
            const saved = await exports.SharedStorage.set(`widget_remote_config_${widgetKey}`, remoteConfig, appGroup);
            if (!saved)
                return false;
            return await exports.Widget.reloadAll();
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
exports.SharedStorage = {
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
exports.AudioPlayer = {
    /**
     * Phát nhạc trực tiếp từ URL (hỗ trợ stream mp3, m4a, aac, wav...)
     */
    play: async (url) => {
        if (!LiveActivityModule?.playAudio)
            return false;
        try {
            return await LiveActivityModule.playAudio(url);
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
__exportStar(require("./types"), exports);
__exportStar(require("./builder"), exports);
var builder_1 = require("./builder");
Object.defineProperty(exports, "StyleSheet", { enumerable: true, get: function () { return builder_1.StyleSheet; } });
//# sourceMappingURL=index.js.map