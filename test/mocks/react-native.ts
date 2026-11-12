// A small stand-in for react-native in Jest: Platform, TurboModuleRegistry, NativeEventEmitter and
// processColor (with React Native's real color parser), plus helpers to drive them from tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const normalizeColor: (color: unknown) => number | null = require('@react-native/normalize-colors');

type NativeListener = (body: unknown) => void;

export interface FakeNativeModule {
  configure: jest.Mock;
  open: jest.Mock;
  addListener: jest.Mock;
  removeListeners: jest.Mock;
}

export const Platform: { OS: string } = { OS: 'ios' };

export function createFakeModule(): FakeNativeModule {
  return {
    configure: jest.fn(),
    open: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
}

let registered: FakeNativeModule | null = createFakeModule();
const nativeListeners = new Map<string, Set<NativeListener>>();

export const TurboModuleRegistry = {
  get: jest.fn((name: string) => (name === 'MoonetixOfferwall' ? registered : null)),
};

export const emitterInstances: unknown[] = [];

export class NativeEventEmitter {
  private readonly nativeModule: { addListener?: (e: string) => void; removeListeners?: (n: number) => void } | null;

  constructor(nativeModule?: { addListener?: (e: string) => void; removeListeners?: (n: number) => void } | null) {
    if (Platform.OS === 'ios' && nativeModule == null) {
      throw new Error('`new NativeEventEmitter()` requires a non-null argument.');
    }
    this.nativeModule = nativeModule ?? null;
    emitterInstances.push(this);
  }

  addListener(eventType: string, listener: NativeListener): { remove(): void } {
    this.nativeModule?.addListener?.(eventType);
    const set = nativeListeners.get(eventType) ?? new Set<NativeListener>();
    set.add(listener);
    nativeListeners.set(eventType, set);
    return {
      remove: () => {
        if (set.delete(listener)) {
          this.nativeModule?.removeListeners?.(1);
        }
      },
    };
  }
}

// Same conversion as React Native's processColor.
export function processColor(color?: unknown): number | null | undefined {
  if (color === undefined || color === null) {
    return color as null | undefined;
  }
  let normalized = normalizeColor(color);
  if (normalized === null || normalized === undefined) {
    return undefined;
  }
  normalized = ((normalized << 24) | (normalized >>> 8)) >>> 0;
  if (Platform.OS === 'android') {
    normalized = normalized | 0x0;
  }
  return normalized;
}

/** Sends an event as the native module would. */
export function emitNative(eventType: string, body: unknown): void {
  for (const listener of Array.from(nativeListeners.get(eventType) ?? [])) {
    listener(body);
  }
}

export function nativeListenerCount(eventType: string): number {
  return nativeListeners.get(eventType)?.size ?? 0;
}

/** The module TurboModuleRegistry returns, or null for a build without the native module. */
export function setNativeModule(mod: FakeNativeModule | null): void {
  registered = mod;
}

export function resetReactNative(): FakeNativeModule {
  Platform.OS = 'ios';
  registered = createFakeModule();
  nativeListeners.clear();
  emitterInstances.length = 0;
  TurboModuleRegistry.get.mockClear();
  return registered;
}
