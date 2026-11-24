import { LayoutNode } from './types';
export type NavigationManeuverType = 'straight' | 'turn_left' | 'turn_right' | 'u_turn' | 'roundabout' | 'arrive';
export interface NavigationLiveState {
    destination: string;
    maneuver: NavigationManeuverType;
    instruction: string;
    distanceMeters: number;
    etaTimestamp: number;
    routeProgress: number;
    nextStreet?: string;
}
export declare function formatNavigationDistance(meters: number): string;
/**
 * 🗺️ Navigation Live UI Builder:
 * Tạo trọn bộ layout Turn-by-Turn cho iOS Dynamic Island (Compact/Expanded/Minimal),
 * Lock Screen & Android ProgressStyle Live Update.
 */
export declare function buildNavigationLiveLayout(state: NavigationLiveState): {
    lockScreen: LayoutNode;
    dynamicIsland: {
        compactLeading: LayoutNode;
        compactTrailing: LayoutNode;
        minimal: LayoutNode;
        expandedLeading: LayoutNode;
        expandedTrailing: LayoutNode;
        expandedBottom: LayoutNode;
    };
};
//# sourceMappingURL=navigationLive.d.ts.map