import { NativeEventEmitter, NativeModules } from 'react-native';

const LiveActivityModule = NativeModules?.LiveActivityModule;

export type MediaPlaybackStateType = 'playing' | 'paused' | 'stopped' | 'buffering';

export type MediaRemoteCommandType =
  | 'play'
  | 'pause'
  | 'togglePlayPause'
  | 'next'
  | 'previous'
  | 'seek'
  | 'stop';

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

const listeners = new Set<RemoteCommandListener>();
let lastMetadata: MediaMetadata | null = null;
let lastPlaybackState: MediaPlaybackState | null = null;
let nativeSubInitialized = false;

function ensureNativeSubscription(): void {
  if (nativeSubInitialized || !LiveActivityModule) return;
  try {
    const emitter = new NativeEventEmitter(LiveActivityModule);
    emitter.addListener('onMediaRemoteCommand', (payload: any) => {
      const evt: MediaRemoteCommandEvent = {
        type: payload?.type || 'togglePlayPause',
        positionSeconds:
          typeof payload?.positionSeconds === 'number' ? payload.positionSeconds : undefined,
        timestamp: Date.now(),
      };
      listeners.forEach((cb) => {
        try {
          cb(evt);
        } catch {}
      });
    });
    nativeSubInitialized = true;
  } catch {
    // Running in non-RN Node environment
  }
}

/**
 * 🎵 Standalone Native MediaSession & Now Playing API (iOS MPNowPlayingInfoCenter + Android MediaSession).
 * Độc lập hoàn toàn với AudioPlayer nội bộ — dùng được với react-native-track-player, expo-av, react-native-video...
 */
export const MediaSession = {
  /** Cập nhật metadata bài hát / podcast lên Lock Screen, Dynamic Island & Android System Media Player */
  setMetadata: async (metadata: MediaMetadata): Promise<boolean> => {
    lastMetadata = { ...metadata };
    if (LiveActivityModule?.setMediaMetadata) {
      try {
        return Boolean(await LiveActivityModule.setMediaMetadata(metadata));
      } catch (err) {
        console.warn('[react-native-live-widgets] MediaSession.setMetadata error:', err);
        return false;
      }
    }
    return true;
  },

  /** Cập nhật trạng thái phát (playing / paused / stopped / buffering) và vị trí thanh tua (positionSeconds) */
  setPlaybackState: async (playback: MediaPlaybackState): Promise<boolean> => {
    lastPlaybackState = { ...playback };
    if (LiveActivityModule?.setMediaPlaybackState) {
      try {
        return Boolean(await LiveActivityModule.setMediaPlaybackState(playback));
      } catch (err) {
        console.warn('[react-native-live-widgets] MediaSession.setPlaybackState error:', err);
        return false;
      }
    }
    return true;
  },

  /** Xóa phiên Now Playing / MediaSession khỏi màn hình khóa và thanh thông báo */
  clear: async (): Promise<boolean> => {
    lastMetadata = null;
    lastPlaybackState = { state: 'stopped', positionSeconds: 0, rate: 0 };
    if (LiveActivityModule?.clearMediaSession) {
      try {
        return Boolean(await LiveActivityModule.clearMediaSession());
      } catch (err) {
        console.warn('[react-native-live-widgets] MediaSession.clear error:', err);
        return false;
      }
    }
    return true;
  },

  /** Lắng nghe sự kiện bấm nút từ Lock Screen, Dynamic Island, tai nghe Bluetooth hoặc Android Media Controls */
  onRemoteCommand: (callback: RemoteCommandListener): (() => void) => {
    ensureNativeSubscription();
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  /** Helper giả lập / phát sự kiện remote command (dùng cho test & preview) */
  emitRemoteCommand: (type: MediaRemoteCommandType, positionSeconds?: number): void => {
    const evt: MediaRemoteCommandEvent = { type, positionSeconds, timestamp: Date.now() };
    listeners.forEach((cb) => cb(evt));
  },

  getLastMetadata: (): MediaMetadata | null => lastMetadata,
  getLastPlaybackState: (): MediaPlaybackState | null => lastPlaybackState,
};
