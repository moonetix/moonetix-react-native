import { MoonetixError, type MoonetixEvent } from './types';
import { DEFAULT_ERROR_MESSAGE } from './validation';

/** Name of the single event the native modules send. Its body has `type`, and `code` and `message` for errors. */
export const NATIVE_EVENT = 'MoonetixOfferwallEvent';

/** Turns a native event body into a MoonetixEvent. Returns null for anything it does not know. */
export function parseEvent(body: unknown): MoonetixEvent | null {
  if (body === null || typeof body !== 'object') {
    return null;
  }
  const { type, code, message } = body as { type?: unknown; code?: unknown; message?: unknown };
  switch (type) {
    case 'opened':
      return { type: 'opened' };
    case 'closed':
      return { type: 'closed' };
    case 'error':
      return {
        type: 'error',
        error: new MoonetixError(
          MoonetixError.codeFromName(code),
          typeof message === 'string' && message.length > 0 ? message : DEFAULT_ERROR_MESSAGE,
        ),
      };
    default:
      return null;
  }
}

/**
 * Converts the value React Native's processColor() returns into an opaque 24-bit RGB value, or -1
 * when there is no usable color (missing, invalid, or a platform color object).
 */
export function toRgb(processed: unknown): number {
  if (typeof processed !== 'number' || !Number.isFinite(processed)) {
    return -1;
  }
  // processColor() gives 0xAARRGGBB, signed on Android and unsigned on iOS.
  return (processed >>> 0) & 0xffffff;
}
