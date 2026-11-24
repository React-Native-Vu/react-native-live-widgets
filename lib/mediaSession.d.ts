export type MediaPlaybackStateType = 'playing' | 'paused' | 'stopped' | 'buffering';
export type MediaRemoteCommandType = 'play' | 'pause' | 'togglePlayPause' | 'next' | 'previous' | 'seek' | 'stop';
export interface MediaMetadata {
    title: string;
    artist?: string;
    album?: string;
    artworkUrl?: string;
    durationSeconds?: number;
    isLiveStream?: boolean;
}
export interface MediaPlaybackState {
    state: MediaPlaybackStateType;
    positionSeconds?: number;
    rate?: number;
}
export interface MediaRemoteCommandEvent {
    type: MediaRemoteCommandType;
    positionSeconds?: number;
    timestamp: number;
}
type RemoteCommandListener = (event: MediaRemoteCommandEvent) => void;
/**
 * 🎵 Standalone Native MediaSession & Now Playing API (iOS MPNowPlayingInfoCenter + Android MediaSession).
 * Độc lập hoàn toàn với AudioPlayer nội bộ — dùng được với react-native-track-player, expo-av, react-native-video...
 */
export declare const MediaSession: {
    /** Cập nhật metadata bài hát / podcast lên Lock Screen, Dynamic Island & Android System Media Player */
    setMetadata: (metadata: MediaMetadata) => Promise<boolean>;
    /** Cập nhật trạng thái phát (playing / paused / stopped / buffering) và vị trí thanh tua (positionSeconds) */
    setPlaybackState: (playback: MediaPlaybackState) => Promise<boolean>;
    /** Xóa phiên Now Playing / MediaSession khỏi màn hình khóa và thanh thông báo */
    clear: () => Promise<boolean>;
    /** Lắng nghe sự kiện bấm nút từ Lock Screen, Dynamic Island, tai nghe Bluetooth hoặc Android Media Controls */
    onRemoteCommand: (callback: RemoteCommandListener) => (() => void);
    /** Helper giả lập / phát sự kiện remote command (dùng cho test & preview) */
    emitRemoteCommand: (type: MediaRemoteCommandType, positionSeconds?: number) => void;
    getLastMetadata: () => MediaMetadata | null;
    getLastPlaybackState: () => MediaPlaybackState | null;
};
export {};
//# sourceMappingURL=mediaSession.d.ts.map