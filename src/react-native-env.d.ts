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
}
