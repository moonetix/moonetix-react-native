// Same formats and messages as the native Moonetix SDKs and the Flutter and Unity plugins.

const APP_ID_PATTERN = /^[a-f0-9]{24}$/;
const TOKEN_PATTERN = /^sst_[A-Za-z0-9_-]{43}$/;

/** Whether `appId` is a Moonetix app ID: 24 lowercase hex characters. */
export function isValidAppId(appId: unknown): appId is string {
  return typeof appId === 'string' && APP_ID_PATTERN.test(appId);
}

/** Whether `token` is a session token: `sst_` and 43 base64url characters. */
export function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

/** Trims like the native SDKs. Anything that is not a string becomes an empty string. */
export function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const INVALID_APP_ID_MESSAGE =
  'The app ID passed to Moonetix.init() is invalid. It must be the 24-character lowercase hex ID from your Moonetix dashboard.';

export const NOT_INITIALIZED_MESSAGE = 'Call Moonetix.init(appId) before Moonetix.open().';

export const INVALID_TOKEN_MESSAGE =
  'The session token is malformed. Pass the "token" value returned by POST /v1/session.';

export const UNSUPPORTED_PLATFORM_MESSAGE =
  'The Moonetix offerwall is not available on this platform.';

export const NOT_LINKED_MESSAGE =
  'The Moonetix native module is not in this build. Rebuild the app after installing the package. Expo Go cannot load it: use a development build.';

export const DEFAULT_ERROR_MESSAGE = 'The offerwall reported an error.';
