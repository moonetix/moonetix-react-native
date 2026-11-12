/**
 * Error codes reported through the `error` event. Same names as the native Moonetix SDKs.
 *
 * - `NOT_INITIALIZED`: `Moonetix.open()` was called before `Moonetix.init()`.
 * - `INVALID_APP_ID`: the app ID passed to `Moonetix.init()` is not 24 lowercase hex characters.
 * - `INVALID_TOKEN`: the token is malformed, or the server does not know it (HTTP 404).
 * - `TOKEN_EXPIRED_OR_USED`: the token expired (10 minutes) or was already used (HTTP 410).
 *   Request a new one from your server.
 * - `NETWORK`: the offerwall could not be reached. The offerwall screen shows a retry button.
 * - `UNSUPPORTED`: the offerwall is not available here: web, other platforms, Expo Go, or an
 *   app that was not rebuilt after installing the package.
 * - `UNKNOWN`: anything else, for example no WebView on the device.
 */
export type MoonetixErrorCode =
  | 'NOT_INITIALIZED'
  | 'INVALID_APP_ID'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED_OR_USED'
  | 'NETWORK'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

/** Every error code, for exhaustive checks and tests. */
export const MoonetixErrorCodes: readonly MoonetixErrorCode[] = [
  'NOT_INITIALIZED',
  'INVALID_APP_ID',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED_OR_USED',
  'NETWORK',
  'UNSUPPORTED',
  'UNKNOWN',
];

/**
 * An error reported through the `error` event. The package never throws for offerwall problems.
 * The message is meant for logs. It never contains the session token.
 */
export class MoonetixError extends Error {
  /** Machine-readable category of the error. */
  readonly code: MoonetixErrorCode;

  constructor(code: MoonetixErrorCode, message: string) {
    super(message);
    // Keeps instanceof working when classes are compiled to ES5 functions.
    Object.setPrototypeOf(this, MoonetixError.prototype);
    this.name = 'MoonetixError';
    this.code = code;
  }

  /** Maps a native code name such as `NETWORK` to a code. Unknown names map to `UNKNOWN`. */
  static codeFromName(name: unknown): MoonetixErrorCode {
    return typeof name === 'string' && (MoonetixErrorCodes as readonly string[]).includes(name)
      ? (name as MoonetixErrorCode)
      : 'UNKNOWN';
  }

  toString(): string {
    return `MoonetixError(${this.code}): ${this.message}`;
  }
}

/**
 * Appearance options for the offerwall screen.
 *
 * By default the top bar shows the Moonetix mark with the title and colors from the Design tab
 * of your Moonetix dashboard, loaded automatically. Set an option only to override it.
 */
export interface MoonetixOptions {
  /** Text shown in the top bar. Empty or missing uses your Design tab title, or "Earn rewards". */
  title?: string | null;
  /**
   * Color of the top bar, any color string React Native understands, for example `#004ABB`.
   * Missing uses your Design tab color. Transparency is ignored. The title and close icon
   * always keep a readable contrast.
   */
  toolbarColor?: string | null;
  /** Whether to show the Moonetix mark next to the title. Default `true`. */
  showLogo?: boolean;
}

/** Names of the offerwall events. */
export type MoonetixEventName = 'opened' | 'closed' | 'error';

/** Returned by `Moonetix.addListener`. Call `remove()` when you no longer need the events. */
export interface MoonetixSubscription {
  remove(): void;
}

/** A parsed native event. */
export type MoonetixEvent =
  | { type: 'opened' }
  | { type: 'closed' }
  | { type: 'error'; error: MoonetixError };
