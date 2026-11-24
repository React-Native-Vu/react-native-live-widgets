"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaSession = void 0;
const react_native_1 = require("react-native");
const LiveActivityModule = react_native_1.NativeModules?.LiveActivityModule;
const listeners = new Set();
let lastMetadata = null;
let lastPlaybackState = null;
let nativeSubInitialized = false;
function ensureNativeSubscription() {
    if (nativeSubInitialized || !LiveActivityModule)
        return;
    try {
        const emitter = new react_native_1.NativeEventEmitter(LiveActivityModule);
        emitter.addListener('onMediaRemoteCommand', (payload) => {
            const evt = {
                type: payload?.type || 'togglePlayPause',
                positionSeconds: typeof payload?.positionSeconds === 'number' ? payload.positionSeconds : undefined,
                timestamp: Date.now(),
            };
            listeners.forEach((cb) => {
                try {
                    cb(evt);
                }
                catch { }
            });
        });
        nativeSubInitialized = true;
    }
    catch {
        // Running in non-RN Node environment
    }
}
/**
 * 🎵 Standalone Native MediaSession & Now Playing API (iOS MPNowPlayingInfoCenter + Android MediaSession).
 * Độc lập hoàn toàn với AudioPlayer nội bộ — dùng được với react-native-track-player, expo-av, react-native-video...
 */
exports.MediaSession = {
    /** Cập nhật metadata bài hát / podcast lên Lock Screen, Dynamic Island & Android System Media Player */
    setMetadata: async (metadata) => {
        lastMetadata = { ...metadata };
        if (LiveActivityModule?.setMediaMetadata) {
            try {
                return Boolean(await LiveActivityModule.setMediaMetadata(metadata));
            }
            catch (err) {
                console.warn('[react-native-live-widgets] MediaSession.setMetadata error:', err);
                return false;
            }
        }
        return true;
    },
    /** Cập nhật trạng thái phát (playing / paused / stopped / buffering) và vị trí thanh tua (positionSeconds) */
    setPlaybackState: async (playback) => {
        lastPlaybackState = { ...playback };
        if (LiveActivityModule?.setMediaPlaybackState) {
            try {
                return Boolean(await LiveActivityModule.setMediaPlaybackState(playback));
            }
            catch (err) {
                console.warn('[react-native-live-widgets] MediaSession.setPlaybackState error:', err);
                return false;
            }
        }
        return true;
    },
    /** Xóa phiên Now Playing / MediaSession khỏi màn hình khóa và thanh thông báo */
    clear: async () => {
        lastMetadata = null;
        lastPlaybackState = { state: 'stopped', positionSeconds: 0, rate: 0 };
        if (LiveActivityModule?.clearMediaSession) {
            try {
                return Boolean(await LiveActivityModule.clearMediaSession());
            }
            catch (err) {
                console.warn('[react-native-live-widgets] MediaSession.clear error:', err);
                return false;
            }
        }
        return true;
    },
    /** Lắng nghe sự kiện bấm nút từ Lock Screen, Dynamic Island, tai nghe Bluetooth hoặc Android Media Controls */
    onRemoteCommand: (callback) => {
        ensureNativeSubscription();
        listeners.add(callback);
        return () => {
            listeners.delete(callback);
        };
    },
    /** Helper giả lập / phát sự kiện remote command (dùng cho test & preview) */
    emitRemoteCommand: (type, positionSeconds) => {
        const evt = { type, positionSeconds, timestamp: Date.now() };
        listeners.forEach((cb) => cb(evt));
    },
    getLastMetadata: () => lastMetadata,
    getLastPlaybackState: () => lastPlaybackState,
};
//# sourceMappingURL=mediaSession.js.map