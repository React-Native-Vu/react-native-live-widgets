import { UI } from './builder';
import { LayoutNode } from './types';

export type NavigationManeuverType =
  | 'straight'
  | 'turn_left'
  | 'turn_right'
  | 'u_turn'
  | 'roundabout'
  | 'arrive';

export interface NavigationLiveState {
  destination: string;
  maneuver: NavigationManeuverType;
  instruction: string;
  distanceMeters: number;
  etaTimestamp: number;
  routeProgress: number; // 0..1
  nextStreet?: string;
}

const MANEUVER_ICON_MAP: Record<NavigationManeuverType, { ios: string; android: string; arrow: string }> = {
  straight: { ios: 'arrow.up', android: 'straight', arrow: '⬆️' },
  turn_left: { ios: 'arrow.turn.up.left', android: 'turn_left', arrow: '↰' },
  turn_right: { ios: 'arrow.turn.up.right', android: 'turn_right', arrow: '↱' },
  u_turn: { ios: 'arrow.uturn.down', android: 'u_turn_left', arrow: '↩️' },
  roundabout: { ios: 'arrow.triangle.2.circlepath', android: 'roundabout_right', arrow: '🔄' },
  arrive: { ios: 'flag.checkered', android: 'flag', arrow: '🏁' },
};

export function formatNavigationDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * 🗺️ Navigation Live UI Builder:
 * Tạo trọn bộ layout Turn-by-Turn cho iOS Dynamic Island (Compact/Expanded/Minimal),
 * Lock Screen & Android ProgressStyle Live Update.
 */
export function buildNavigationLiveLayout(state: NavigationLiveState): {
  lockScreen: LayoutNode;
  dynamicIsland: {
    compactLeading: LayoutNode;
    compactTrailing: LayoutNode;
    minimal: LayoutNode;
    expandedLeading: LayoutNode;
    expandedTrailing: LayoutNode;
    expandedBottom: LayoutNode;
  };
} {
  const icon = MANEUVER_ICON_MAP[state.maneuver] || MANEUVER_ICON_MAP.straight;
  const distText = formatNavigationDistance(state.distanceMeters);
  const progress = Math.max(0, Math.min(1, state.routeProgress));

  const lockScreen = UI.VStack(
    {
      padding: 14,
      spacing: 8,
      backgroundColor: '#0F172A',
      borderRadius: 16,
    },
    UI.HStack(
      { spacing: 10, alignment: 'center' },
      UI.Text(icon.arrow, { fontSize: 22, accessible: false }),
      UI.VStack(
        { spacing: 2 },
        UI.Text(state.instruction, {
          typography: 'headline',
          color: '#F8FAFC',
          accessibilityRole: 'header',
          accessibilityFocusOrder: 1,
          accessibilityLiveRegion: 'assertive',
        }),
        UI.Text(`${distText} • ${state.nextStreet || state.destination}`, {
          typography: 'caption1',
          color: '#94A3B8',
          accessibilityFocusOrder: 2,
        })
      ),
      UI.Spacer(),
      UI.Timer(state.etaTimestamp, {
        mode: 'countdown',
        color: '#38BDF8',
        fontWeight: 'bold',
      })
    ),
    UI.Progress({
      value: progress,
      tintColor: '#38BDF8',
      trackColor: '#1E293B',
      accessibilityLabel: 'Tiến độ hành trình',
    })
  );

  return {
    lockScreen,
    dynamicIsland: {
      compactLeading: UI.Text(icon.arrow, { fontSize: 14, color: '#38BDF8' }),
      compactTrailing: UI.Text(distText, { fontSize: 12, fontWeight: 'bold', color: '#F8FAFC' }),
      minimal: UI.Text(icon.arrow, { fontSize: 13, color: '#38BDF8' }),
      expandedLeading: UI.Text(`${icon.arrow} ${distText}`, {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#38BDF8',
      }),
      expandedTrailing: UI.Timer(state.etaTimestamp, {
        mode: 'countdown',
        color: '#F59E0B',
        fontWeight: 'bold',
      }),
      expandedBottom: UI.VStack(
        { spacing: 6 },
        UI.Text(state.instruction, { fontSize: 13, fontWeight: 'semibold', color: '#F8FAFC' }),
        UI.Progress({ value: progress, tintColor: '#38BDF8', trackColor: '#1E293B' })
      ),
    },
  };
}
