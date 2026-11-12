import { NATIVE_EVENT, parseEvent, toRgb } from '../src/events';
import { MoonetixError } from '../src/types';
import { clean, isValidAppId, isValidToken } from '../src/validation';

describe('isValidAppId', () => {
  it.each(['eeee35416ef2e85e9b4d8203', '000000000000000000000000', 'abcdefabcdefabcdefabcdef'])(
    'accepts %s',
    (id) => expect(isValidAppId(id)).toBe(true),
  );

  it.each([
    ['uppercase', 'EEEE35416EF2E85E9B4D8203'],
    ['23 characters', 'eeee35416ef2e85e9b4d820'],
    ['25 characters', 'eeee35416ef2e85e9b4d82033'],
    ['not hex', 'gggg35416ef2e85e9b4d8203'],
    ['trailing newline', 'eeee35416ef2e85e9b4d8203\n'],
    ['empty', ''],
    ['number', 123],
    ['null', null],
  ])('rejects %s', (_label, id) => expect(isValidAppId(id)).toBe(false));
});

describe('isValidToken', () => {
  const body = 'Ab0_-'.repeat(8) + 'xyz';

  it('accepts sst_ and 43 base64url characters', () => {
    expect(body).toHaveLength(43);
    expect(isValidToken('sst_' + body)).toBe(true);
  });

  it.each([
    ['no prefix', body],
    ['uppercase prefix', 'SST_' + body],
    ['42 characters', 'sst_' + body.slice(1)],
    ['44 characters', 'sst_' + body + 'a'],
    ['slash', 'sst_' + body.slice(1) + '/'],
    ['space inside', 'sst_' + body.slice(1) + ' '],
    ['trailing newline', 'sst_' + body + '\n'],
    ['undefined', undefined],
  ])('rejects %s', (_label, token) => expect(isValidToken(token)).toBe(false));
});

describe('clean', () => {
  it('trims strings and turns anything else into an empty string', () => {
    expect(clean('  a \n')).toBe('a');
    expect(clean(undefined)).toBe('');
    expect(clean(42)).toBe('');
  });
});

describe('parseEvent', () => {
  it('uses the shared native event name', () => {
    expect(NATIVE_EVENT).toBe('MoonetixOfferwallEvent');
  });

  it('parses opened, closed and error', () => {
    expect(parseEvent({ type: 'opened' })).toEqual({ type: 'opened' });
    expect(parseEvent({ type: 'closed', code: 'X' })).toEqual({ type: 'closed' });
    const event = parseEvent({ type: 'error', code: 'INVALID_TOKEN', message: 'gone' });
    expect(event?.type).toBe('error');
    if (event?.type === 'error') {
      expect(event.error).toBeInstanceOf(MoonetixError);
      expect(event.error.code).toBe('INVALID_TOKEN');
      expect(event.error.message).toBe('gone');
    }
  });

  it.each([undefined, null, 1, 'opened', [], {}, { type: 'other' }])('returns null for %p', (body) => {
    expect(parseEvent(body)).toBeNull();
  });
});

describe('MoonetixError', () => {
  it('is an Error with a code', () => {
    const e = new MoonetixError('NETWORK', 'offline');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(MoonetixError);
    expect(e.name).toBe('MoonetixError');
    expect(e.code).toBe('NETWORK');
    expect(e.message).toBe('offline');
    expect(String(e)).toBe('MoonetixError(NETWORK): offline');
  });

  it('maps native code names', () => {
    for (const code of [
      'NOT_INITIALIZED',
      'INVALID_APP_ID',
      'INVALID_TOKEN',
      'TOKEN_EXPIRED_OR_USED',
      'NETWORK',
      'UNSUPPORTED',
      'UNKNOWN',
    ] as const) {
      expect(MoonetixError.codeFromName(code)).toBe(code);
    }
    expect(MoonetixError.codeFromName('network')).toBe('UNKNOWN');
    expect(MoonetixError.codeFromName(undefined)).toBe('UNKNOWN');
  });
});

describe('toRgb', () => {
  it('keeps the RGB part of signed and unsigned ARGB values', () => {
    expect(toRgb(0xff004abb)).toBe(0x004abb);
    expect(toRgb(0xff004abb | 0)).toBe(0x004abb);
    expect(toRgb(0x00ffffff)).toBe(0xffffff);
  });

  it.each([undefined, null, NaN, Infinity, '#fff', { semantic: ['label'] }])('returns -1 for %p', (value) => {
    expect(toRgb(value)).toBe(-1);
  });
});
