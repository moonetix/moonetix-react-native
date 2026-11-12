import { NativeEventEmitter, Platform, processColor } from 'react-native';

import type { Spec } from './NativeMoonetixOfferwall';
import { NATIVE_EVENT, parseEvent, toRgb } from './events';
import {
  MoonetixError,
  type MoonetixErrorCode,
  type MoonetixEvent,
  type MoonetixEventName,
  type MoonetixOptions,
  type MoonetixSubscription,
} from './types';
import {
  INVALID_APP_ID_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  NOT_INITIALIZED_MESSAGE,
  NOT_LINKED_MESSAGE,
  UNSUPPORTED_PLATFORM_MESSAGE,
  clean,
  isValidAppId,
  isValidToken,
} from './validation';

declare const require: (id: string) => unknown;

type AnyListener = (error?: MoonetixError) => void;

const VERSION = '2.0.1';
const EVENT_NAMES: readonly MoonetixEventName[] = ['opened', 'closed', 'error'];

let appId: string | null = null;
let initRejected = false;
let nativeResolved = false;
let nativeModule: Spec | null = null;
let nativeSubscription: { remove(): void } | null = null;
const listeners: Record<MoonetixEventName, Set<AnyListener>> = {
  opened: new Set(),
  closed: new Set(),
  error: new Set(),
};

function isMobile(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function loadNative(): Spec | null {
  if (!isMobile()) {
    return null;
  }
  try {
    const spec = require('./NativeMoonetixOfferwall') as { default?: Spec | null };
    return spec.default ?? null;
  } catch {
    return null;
  }
}

function getNative(): Spec | null {
  if (!nativeResolved) {
    nativeModule = loadNative();
    nativeResolved = true;
  }
  return nativeModule;
}

// One internal subscription to the native module; the listeners added by the app hang off it.
function wire(mod: Spec): void {
  if (nativeSubscription !== null) {
    return;
  }
  const emitter = new NativeEventEmitter(mod);
  nativeSubscription = emitter.addListener(NATIVE_EVENT, (body: unknown) => {
    const event = parseEvent(body);
    if (event !== null) {
      dispatch(event);
    }
  });
}

function dispatch(event: MoonetixEvent): void {
  const targets = Array.from(listeners[event.type]);
  if (event.type === 'error' && targets.length === 0) {
    console.warn(`[Moonetix] ${event.error.toString()} (no error listener)`);
    return;
  }
  for (const listener of targets) {
    try {
      if (event.type === 'error') {
        listener(event.error);
      } else {
        listener();
      }
    } catch (e) {
      console.error('[Moonetix] An event listener threw an error.', e);
    }
  }
}

// Errors are delivered after the current call returns, so a listener added right after
// open() still receives them.
function emitError(code: MoonetixErrorCode, message: string): void {
  const error = new MoonetixError(code, message);
  void Promise.resolve().then(() => dispatch({ type: 'error', error }));
}

function nativeOptions(options: MoonetixOptions | null | undefined): {
  title: string | null;
  rgb: number;
  showLogo: boolean;
} {
  const title =
    options != null && typeof options.title === 'string' && options.title.trim().length > 0
      ? options.title
      : null;
  let rgb = -1;
  const color = options?.toolbarColor;
  if (color != null) {
    rgb = typeof color === 'string' ? toRgb(processColor(color)) : -1;
    if (rgb < 0) {
      console.warn(
        `[Moonetix] toolbarColor ${JSON.stringify(color)} is not a color React Native understands. Using the color from your Design tab.`,
      );
    }
  }
  return { title, rgb, showLogo: options?.showLogo !== false };
}

/** The API of the `Moonetix` object. */
export interface MoonetixStatic {
  /** Version of this package. */
  readonly version: string;

  /**
   * Whether the offerwall can open here: true in Android and iOS builds that include the native
   * module, false on web, other platforms and in Expo Go.
   */
  readonly isSupported: boolean;

  /**
   * Initializes the package with your Moonetix app ID (24 lowercase hex characters, shown in the
   * Integration tab of your app). Call it once, for example when your app starts.
   *
   * An invalid value is not stored. Every following `open()` call then reports
   * `INVALID_APP_ID` instead of opening.
   */
  init(appId: string): void;

  /**
   * Opens the offerwall full screen.
   *
   * @param token A fresh session token (`sst_...`) that your server got from
   * `POST https://api.moonetix.com/v1/session`. Tokens are single-use and expire after
   * 10 minutes, so request a new one for every call.
   * @param options Optional top bar settings. By default the top bar shows the Moonetix mark
   * with the title and colors from the Design tab of your dashboard.
   */
  open(token: string, options?: MoonetixOptions | null): void;

  /**
   * Subscribes to an offerwall event:
   * - `opened`: the offerwall finished loading its first page.
   * - `closed`: the offerwall was closed. A good moment to load the user's balance from your
   *   server. Fired once per `open()` that showed the offerwall.
   * - `error`: something went wrong, see `MoonetixError.code`.
   *
   * Use the events for your UI only. Never credit rewards from them: credit rewards only from
   * the signed postback on your server.
   */
  addListener(event: 'opened' | 'closed', listener: () => void): MoonetixSubscription;
  addListener(event: 'error', listener: (error: MoonetixError) => void): MoonetixSubscription;

  /** Removes every listener of one event, or of all events when called without a name. */
  removeAllListeners(event?: MoonetixEventName): void;
}

/**
 * Entry point of the Moonetix offerwall package.
 *
 * ```ts
 * Moonetix.init('YOUR_APP_ID');
 * const sub = Moonetix.addListener('closed', refreshBalance);
 * // token = fresh single-use session token fetched from YOUR server
 * Moonetix.open(token);
 * ```
 *
 * Problems (not initialized, malformed token, network, expired token, unsupported platform)
 * arrive as `error` events. The methods never throw for them.
 */
export const Moonetix: MoonetixStatic = {
  version: VERSION,

  get isSupported(): boolean {
    return getNative() !== null;
  },

  init(appIdValue: string): void {
    const trimmed = clean(appIdValue);
    if (!isValidAppId(trimmed)) {
      appId = null;
      initRejected = true;
      console.warn(`[Moonetix] ${INVALID_APP_ID_MESSAGE}`);
      return;
    }
    appId = trimmed;
    initRejected = false;
    const mod = getNative();
    if (mod === null) {
      return;
    }
    wire(mod);
    try {
      mod.configure(trimmed);
    } catch (e) {
      console.warn(`[Moonetix] init failed: ${e instanceof Error ? e.name : 'Error'}`);
    }
  },

  open(token: string, options?: MoonetixOptions | null): void {
    if (appId === null) {
      if (initRejected) {
        emitError('INVALID_APP_ID', INVALID_APP_ID_MESSAGE);
      } else {
        emitError('NOT_INITIALIZED', NOT_INITIALIZED_MESSAGE);
      }
      return;
    }
    const cleanToken = clean(token);
    if (!isValidToken(cleanToken)) {
      emitError('INVALID_TOKEN', INVALID_TOKEN_MESSAGE);
      return;
    }
    const mod = getNative();
    if (mod === null) {
      emitError('UNSUPPORTED', isMobile() ? NOT_LINKED_MESSAGE : UNSUPPORTED_PLATFORM_MESSAGE);
      return;
    }
    wire(mod);
    const { title, rgb, showLogo } = nativeOptions(options);
    try {
      mod.open(cleanToken, title, rgb, showLogo);
    } catch (e) {
      emitError(
        'UNKNOWN',
        `The offerwall could not be opened: ${e instanceof Error ? e.name : 'Error'}.`,
      );
    }
  },

  addListener(
    event: MoonetixEventName,
    listener: (() => void) | ((error: MoonetixError) => void),
  ): MoonetixSubscription {
    if (!EVENT_NAMES.includes(event)) {
      throw new TypeError(
        `Unknown Moonetix event "${String(event)}". Use "opened", "closed" or "error".`,
      );
    }
    if (typeof listener !== 'function') {
      throw new TypeError('Moonetix.addListener() needs a function.');
    }
    // Wrapped, so adding the same function twice gives two independent subscriptions.
    const entry: AnyListener = (error) => (listener as AnyListener)(error);
    listeners[event].add(entry);
    let active = true;
    return {
      remove() {
        if (active) {
          active = false;
          listeners[event].delete(entry);
        }
      },
    };
  },

  removeAllListeners(event?: MoonetixEventName): void {
    for (const name of EVENT_NAMES) {
      if (event === undefined || event === name) {
        listeners[name].clear();
      }
    }
  },
};

/** Forgets the app ID, the listeners and the native module. For tests only. */
export function resetForTesting(): void {
  nativeSubscription?.remove();
  nativeSubscription = null;
  nativeModule = null;
  nativeResolved = false;
  appId = null;
  initRejected = false;
  for (const name of EVENT_NAMES) {
    listeners[name].clear();
  }
}
