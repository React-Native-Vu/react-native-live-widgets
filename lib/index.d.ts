import { LiveActivityPushTokens, StartActivityOptions, UpdateActivityOptions, WidgetLayoutConfig, WidgetRemoteConfig } from './types';
export declare const LiveActivity: {
    /**
     * Khởi động một Live Activity (iOS) hoặc Live Update / Ongoing Notification (Android).
     */
    start: (options: StartActivityOptions) => Promise<boolean>;
    /**
     * Cập nhật nội dung Live Activity hiện tại.
     */
    update: (options: UpdateActivityOptions) => Promise<boolean>;
    /**
     * Kết thúc một Live Activity cụ thể theo activityId.
     */
    end: (activityId: string) => Promise<boolean>;
    /**
     * Tắt tất cả Live Activity / Live Update của ứng dụng.
     */
    endAll: () => Promise<boolean>;
    /**
     * Đăng ký và lấy Push Token của thiết bị (APNs Device Token trên iOS / FCM Device Token trên Android).
     */
    getDevicePushToken: () => Promise<string | undefined>;
    /**
     * Lấy Push-to-Start token để backend kích hoạt mở mới Live Activity / Live Update từ xa.
     */
    getPushToStartToken: () => Promise<string | undefined>;
    /**
     * Lấy Update Push Token của một phiên Live Activity / Live Update đang chạy (theo activityId)
     * để backend gửi bản cập nhật ("event": "update") hoặc kết thúc ("event": "end").
     */
    getActivityPushToken: (activityId: string) => Promise<string | undefined>;
    /**
     * Lấy trọn bộ cả 3 loại Push Token trong 1 lần gọi (hỗ trợ cả iOS APNs & Android):
     * - `devicePushToken`: Token của máy
     * - `pushToStartToken`: Token mở mới Live Activity / Live Update từ xa
     * - `activityUpdateToken`: Token cập nhật phiên Live Activity đang chạy
     */
    getAllPushTokens: (activityId?: string) => Promise<LiveActivityPushTokens>;
    /**
     * Lắng nghe khi hệ điều hành cấp mới hoặc thay đổi Device Push Token của máy.
     */
    onDevicePushTokenChange: (listener: (token: string) => void) => (() => void);
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Push-to-Start Token mới.
     */
    onPushToStartTokenChange: (listener: (token: string) => void) => (() => void);
    /**
     * Lắng nghe khi hệ điều hành cấp hoặc xoay Update Token cho một Live Activity cụ thể.
     * Trả về `{ activityId, token }` để gửi ngay lên Backend.
     */
    onActivityUpdateTokenChange: (listener: (event: {
        activityId: string;
        token: string;
    }) => void) => (() => void);
    /**
     * Lắng nghe khi người dùng bấm vào một Action Button.
     */
    onActionClicked: (listener: (actionId: string, activityId: string) => void) => (() => void);
    /**
     * Android 16+: Kiểm tra quyền Promoted Ongoing Notifications.
     */
    canPostPromoted: () => Promise<boolean>;
};
export declare const Widget: {
    /**
     * Yêu cầu hệ điều hành iOS và Android vẽ lại toàn bộ Home Screen Widgets ngay lập tức.
     */
    reloadAll: () => Promise<boolean>;
    /**
     * Yêu cầu vẽ lại một Widget cụ thể theo kind (hỗ trợ cả iOS và Android).
     */
    reload: (kind: string) => Promise<boolean>;
    /**
     * Thiết lập layout động cho Home Screen Widget (hỗ trợ small, medium, large).
     * Tự động lưu vào Shared Storage và yêu cầu vẽ lại.
     */
    setLayout: (widgetKey: string, layoutConfig: WidgetLayoutConfig, appGroup?: string) => Promise<boolean>;
    /**
     * Cấu hình Endpoint API để bản thân Widget Extension tự chạy ngầm lấy dữ liệu mới
     * theo chu kỳ (`getTimeline`) hoặc khi bấm nút `actionId: 'refresh'` trên mặt Widget,
     * kể cả khi người dùng đã vuốt tắt (Kill) hoàn toàn ứng dụng chính!
     */
    setRemoteConfig: (widgetKey: string, remoteConfig: WidgetRemoteConfig, appGroup?: string) => Promise<boolean>;
    /**
     * (Android 8.0+) Mở hộp thoại hệ thống cho phép người dùng ghim trực tiếp Tiện ích ra màn hình chính ngay từ trong ứng dụng.
     * Trên iOS, hàm trả về false vì Apple chỉ cho phép người dùng tự thêm tiện ích từ thư viện Widget của hệ điều hành.
     */
    requestPin: () => Promise<boolean>;
    /**
     * Kiểm tra xem thiết bị hiện tại có hỗ trợ ghim Tiện ích trực tiếp từ trong ứng dụng hay không (Chỉ Android API 26+).
     */
    isPinSupported: () => Promise<boolean>;
};
export declare const SharedStorage: {
    /**
     * Lưu dữ liệu vào App Group (iOS) hoặc SharedPreferences (Android) để Widget đọc.
     */
    set: (key: string, value: any, appGroup?: string) => Promise<boolean>;
    /**
     * Đọc dữ liệu từ App Group hoặc SharedPreferences.
     */
    get: <T = any>(key: string, appGroup?: string) => Promise<T | null>;
    /**
     * Xóa 1 giá trị theo key.
     */
    remove: (key: string, appGroup?: string) => Promise<boolean>;
    /**
     * Xóa sạch toàn bộ dữ liệu trong App Group.
     */
    clear: (appGroup?: string) => Promise<boolean>;
};
export interface AudioPlayerStatus {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
}
export declare const AudioPlayer: {
    /**
     * Phát nhạc trực tiếp từ URL (hỗ trợ stream mp3, m4a, aac, wav...)
     */
    play: (url: string) => Promise<boolean>;
    /**
     * Tạm dừng bài nhạc đang phát.
     */
    pause: () => Promise<boolean>;
    /**
     * Tiếp tục phát bài nhạc sau khi tạm dừng.
     */
    resume: () => Promise<boolean>;
    /**
     * Dừng hẳn bài nhạc và giải phóng tài nguyên phát.
     */
    stop: () => Promise<boolean>;
    /**
     * Lấy trạng thái hiện tại của trình phát nhạc (đang phát, thời lượng, vị trí phát).
     */
    getStatus: () => Promise<AudioPlayerStatus>;
};
export * from './types';
export * from './builder';
export { StyleSheet } from './builder';
//# sourceMappingURL=index.d.ts.map