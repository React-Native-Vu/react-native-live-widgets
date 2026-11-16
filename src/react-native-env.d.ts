// Ambient declaration for react module imports
declare module 'react' {
  export type ReactNode = any;
  export type ReactElement<P = any, T = any> = {
    type: T;
    props: P;
    key: any;
  };
  export type FC<P = {}> = ((props: P) => any) & { displayName?: string };
  export function useState<T>(initialState: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function isValidElement(object: any): boolean;
  export const Children: {
    forEach(children: any, fn: (child: any, index: number) => void): void;
    map<T, C>(children: C | readonly C[], fn: (child: C, index: number) => T): T[];
    count(children: any): number;
    only<C>(children: C): C;
    toArray(children: any): any[];
  };
  export const Fragment: any;
  const React: any;
  export default React;
}

// Ambient declaration for react-native to ensure compile safety across all environments
declare module 'react-native' {
  export interface PlatformOSType {
    OS: 'ios' | 'android' | 'windows' | 'macos' | 'web';
    select<T>(specifics: { [platform in 'ios' | 'android' | 'default']?: T }): T;
  }
  export const Platform: PlatformOSType;

  export interface NativeModulesStatic {
    [key: string]: any;
  }
  export const NativeModules: NativeModulesStatic;

  export interface EmitterSubscription {
    remove(): void;
  }

  export class NativeEventEmitter {
    constructor(nativeModule?: any);
    addListener(eventType: string, listener: (...args: any[]) => any, context?: any): EmitterSubscription;
    removeAllListeners(eventType: string): void;
    removeSubscription(subscription: EmitterSubscription): void;
  }

  export interface AppRegistry {
    registerHeadlessTask(taskKey: string, task: () => (taskData: any) => Promise<void>): void;
  }
  export const AppRegistry: AppRegistry;

  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;

  export const View: any;
  export const Text: any;
  export const Image: any;
  export const TouchableOpacity: any;
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    [key: string]: any;
  };
  export const Dimensions: {
    get(dim: 'window' | 'screen'): { width: number; height: number; scale: number; fontScale: number };
    [key: string]: any;
  };
}
