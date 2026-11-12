import type * as RNMock from './mocks/react-native';
import type * as MoonetixModule from '../src/Moonetix';
import type * as TypesModule from '../src/types';
import * as V from '../src/validation';

const APP_ID = 'eeee35416ef2e85e9b4d8203';
const TOKEN = 'sst_' + 'A'.repeat(43);

let RN: typeof RNMock;
let Moonetix: typeof MoonetixModule.Moonetix;
let MoonetixError: typeof TypesModule.MoonetixError;
let native: RNMock.FakeNativeModule | null;

// Fresh copies of the package and the react-native stand-in for every test.
function load(platform = 'ios', withNative = true): void {
  jest.resetModules();
  RN = require('react-native');
  RN.resetReactNative();
  RN.Platform.OS = platform;
  native = withNative ? RN.createFakeModule() : null;
  RN.setNativeModule(native);
  Moonetix = (require('../src/Moonetix') as typeof MoonetixModule).Moonetix;
  MoonetixError = (require('../src/types') as typeof TypesModule).MoonetixError;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function collectErrors(): TypesModule.MoonetixError[] {
  const errors: TypesModule.MoonetixError[] = [];
  Moonetix.addListener('error', (e) => errors.push(e));
  return errors;
}

let warn: jest.SpyInstance;
let consoleError: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  load();
});

afterEach(() => {
  warn.mockRestore();
  consoleError.mockRestore();
});

describe('init', () => {
  it('passes the trimmed app ID to the native module', () => {
    Moonetix.init(`  ${APP_ID}\n`);
    expect(native!.configure).toHaveBeenCalledWith(APP_ID);
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects an invalid app ID without calling the native module', async () => {
    const errors = collectErrors();
    Moonetix.init('EEEE35416EF2E85E9B4D8203');
    expect(native!.configure).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(`[Moonetix] ${V.INVALID_APP_ID_MESSAGE}`);
    Moonetix.open(TOKEN);
    await flush();
    expect(errors.map((e) => e.code)).toEqual(['INVALID_APP_ID']);
    expect(errors[0]!.message).toBe(V.INVALID_APP_ID_MESSAGE);
    expect(native!.open).not.toHaveBeenCalled();
  });

  it('a valid init after an invalid one works again', () => {
    Moonetix.init('nope');
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN);
    expect(native!.open).toHaveBeenCalledTimes(1);
  });

  it('does not throw for non-string input', () => {
    expect(() => Moonetix.init(undefined as unknown as string)).not.toThrow();
    expect(native!.configure).not.toHaveBeenCalled();
  });
});

describe('open', () => {
  it('reports NOT_INITIALIZED before init, after the call returns', async () => {
    const errors = collectErrors();
    Moonetix.open(TOKEN);
    expect(errors).toHaveLength(0);
    await flush();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(MoonetixError);
    expect(errors[0]!.code).toBe('NOT_INITIALIZED');
    expect(errors[0]!.message).toBe(V.NOT_INITIALIZED_MESSAGE);
    expect(native!.open).not.toHaveBeenCalled();
  });

  it('a listener added right after open() still receives the error', async () => {
    Moonetix.open(TOKEN);
    const errors = collectErrors();
    await flush();
    expect(errors.map((e) => e.code)).toEqual(['NOT_INITIALIZED']);
  });

  it.each([
    ['empty', ''],
    ['wrong prefix', 'sst-' + 'A'.repeat(43)],
    ['too short', 'sst_' + 'A'.repeat(42)],
    ['too long', 'sst_' + 'A'.repeat(44)],
    ['base64 padding', 'sst_' + 'A'.repeat(42) + '='],
    ['plus sign', 'sst_' + 'A'.repeat(42) + '+'],
  ])('reports INVALID_TOKEN for a malformed token (%s)', async (_label, token) => {
    const errors = collectErrors();
    Moonetix.init(APP_ID);
    Moonetix.open(token);
    await flush();
    expect(errors.map((e) => e.code)).toEqual(['INVALID_TOKEN']);
    expect(errors[0]!.message).toBe(V.INVALID_TOKEN_MESSAGE);
    expect(native!.open).not.toHaveBeenCalled();
  });

  it('passes the trimmed token and default options', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(`  ${TOKEN} `);
    expect(native!.open).toHaveBeenCalledWith(TOKEN, null, -1, true);
  });

  it('maps title, color and logo', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN, { title: 'Earn coins', toolbarColor: '#004ABB', showLogo: false });
    expect(native!.open).toHaveBeenCalledWith(TOKEN, 'Earn coins', 0x004abb, false);
  });

  it.each(['ios', 'android'])('gives the same RGB value on %s (alpha ignored)', (platform) => {
    load(platform);
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN, { toolbarColor: '#FF880080' });
    Moonetix.open(TOKEN, { toolbarColor: 'rgb(255, 255, 255)' });
    Moonetix.open(TOKEN, { toolbarColor: 'navy' });
    Moonetix.open(TOKEN, { toolbarColor: '#000' });
    expect(native!.open.mock.calls.map((c) => c[2])).toEqual([0xff8800, 0xffffff, 0x000080, 0x000000]);
  });

  it('treats a blank title as no title', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN, { title: '   ', showLogo: true });
    expect(native!.open).toHaveBeenCalledWith(TOKEN, null, -1, true);
  });

  it('warns and uses the Design tab color for an unknown color', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN, { toolbarColor: 'sharky-blue' });
    Moonetix.open(TOKEN, { toolbarColor: 0x004abb as unknown as string });
    expect(native!.open.mock.calls.map((c) => c[2])).toEqual([-1, -1]);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]![0]).toContain('toolbarColor "sharky-blue"');
  });

  it('null options and null values mean defaults', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN, null);
    Moonetix.open(TOKEN, { title: null, toolbarColor: null });
    expect(native!.open.mock.calls).toEqual([
      [TOKEN, null, -1, true],
      [TOKEN, null, -1, true],
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports UNKNOWN without the token when the native call throws', async () => {
    const errors = collectErrors();
    Moonetix.init(APP_ID);
    native!.open.mockImplementation(() => {
      throw new TypeError(TOKEN);
    });
    Moonetix.open(TOKEN);
    await flush();
    expect(errors.map((e) => [e.code, e.message])).toEqual([
      ['UNKNOWN', 'The offerwall could not be opened: TypeError.'],
    ]);
  });
});

describe('unsupported platforms', () => {
  it('web: checks the input first, then reports UNSUPPORTED', async () => {
    load('web');
    const errors = collectErrors();
    expect(Moonetix.isSupported).toBe(false);
    Moonetix.open(TOKEN);
    Moonetix.init(APP_ID);
    Moonetix.open('bad');
    Moonetix.open(TOKEN);
    await flush();
    expect(errors.map((e) => e.code)).toEqual(['NOT_INITIALIZED', 'INVALID_TOKEN', 'UNSUPPORTED']);
    expect(errors[2]!.message).toBe(V.UNSUPPORTED_PLATFORM_MESSAGE);
    expect(RN.TurboModuleRegistry.get).not.toHaveBeenCalled();
  });

  it('a mobile build without the native module (Expo Go) reports UNSUPPORTED with a hint', async () => {
    load('android', false);
    const errors = collectErrors();
    expect(Moonetix.isSupported).toBe(false);
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN);
    await flush();
    expect(errors.map((e) => [e.code, e.message])).toEqual([['UNSUPPORTED', V.NOT_LINKED_MESSAGE]]);
  });

  it('isSupported is true with the native module', () => {
    expect(Moonetix.isSupported).toBe(true);
  });
});

describe('events', () => {
  function initAndOpen(): void {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN);
  }

  it('maps native events to listeners', () => {
    const seen: string[] = [];
    Moonetix.addListener('opened', () => seen.push('opened'));
    Moonetix.addListener('closed', () => seen.push('closed'));
    Moonetix.addListener('error', (e) => seen.push(`error ${e.code} ${e.message}`));
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'opened' });
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    RN.emitNative('MoonetixOfferwallEvent', { type: 'error', code: 'TOKEN_EXPIRED_OR_USED', message: 'expired' });
    RN.emitNative('MoonetixOfferwallEvent', { type: 'error', code: 'NETWORK', message: 'offline' });
    expect(seen).toEqual(['opened', 'closed', 'error TOKEN_EXPIRED_OR_USED expired', 'error NETWORK offline']);
  });

  it('unknown codes become UNKNOWN and empty messages get a default', () => {
    const errors = collectErrors();
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'error', code: 'SOMETHING_NEW', message: '' });
    RN.emitNative('MoonetixOfferwallEvent', { type: 'error' });
    expect(errors.map((e) => [e.code, e.message])).toEqual([
      ['UNKNOWN', V.DEFAULT_ERROR_MESSAGE],
      ['UNKNOWN', V.DEFAULT_ERROR_MESSAGE],
    ]);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it('ignores unknown event types and malformed bodies', () => {
    const seen: string[] = [];
    Moonetix.addListener('opened', () => seen.push('opened'));
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'resized' });
    RN.emitNative('MoonetixOfferwallEvent', null);
    RN.emitNative('MoonetixOfferwallEvent', 'opened');
    expect(seen).toEqual([]);
  });

  it('subscribes to the native module once, also on iOS with the module as emitter source', () => {
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN);
    Moonetix.init(APP_ID);
    Moonetix.open(TOKEN);
    expect(RN.emitterInstances).toHaveLength(1);
    expect(RN.nativeListenerCount('MoonetixOfferwallEvent')).toBe(1);
    expect(native!.addListener).toHaveBeenCalledTimes(1);
    expect(native!.addListener).toHaveBeenCalledWith('MoonetixOfferwallEvent');
  });

  it('subscribes on init, before any open', () => {
    Moonetix.init(APP_ID);
    expect(RN.nativeListenerCount('MoonetixOfferwallEvent')).toBe(1);
  });

  it('remove() stops a listener and can be called twice', () => {
    const calls: string[] = [];
    const sub = Moonetix.addListener('closed', () => calls.push('a'));
    Moonetix.addListener('closed', () => calls.push('b'));
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    sub.remove();
    sub.remove();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    expect(calls).toEqual(['a', 'b', 'b']);
  });

  it('the same function added twice gets two calls and two subscriptions', () => {
    const fn = jest.fn();
    const one = Moonetix.addListener('opened', fn);
    Moonetix.addListener('opened', fn);
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'opened' });
    one.remove();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'opened' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('removeAllListeners clears one event or all', () => {
    const fn = jest.fn();
    Moonetix.addListener('opened', fn);
    Moonetix.addListener('closed', fn);
    initAndOpen();
    Moonetix.removeAllListeners('opened');
    RN.emitNative('MoonetixOfferwallEvent', { type: 'opened' });
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    expect(fn).toHaveBeenCalledTimes(1);
    Moonetix.removeAllListeners();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a listener that throws does not stop the others', () => {
    const second = jest.fn();
    Moonetix.addListener('closed', () => {
      throw new Error('boom');
    });
    Moonetix.addListener('closed', second);
    initAndOpen();
    RN.emitNative('MoonetixOfferwallEvent', { type: 'closed' });
    expect(second).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('logs errors nobody listens to', async () => {
    Moonetix.open(TOKEN);
    await flush();
    expect(warn).toHaveBeenCalledWith(
      `[Moonetix] MoonetixError(NOT_INITIALIZED): ${V.NOT_INITIALIZED_MESSAGE} (no error listener)`,
    );
  });

  it('rejects unknown event names and non-functions', () => {
    expect(() => Moonetix.addListener('open' as 'opened', () => undefined)).toThrow(TypeError);
    expect(() => Moonetix.addListener('closed', undefined as unknown as () => void)).toThrow(TypeError);
  });
});

describe('package info', () => {
  it('version matches package.json', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(Moonetix.version).toBe(require('../package.json').version);
  });

  it('the package root exports the API', () => {
    const root = require('../src/index') as typeof import('../src/index');
    expect(root.Moonetix).toBe(Moonetix);
    expect(root.default).toBe(Moonetix);
    expect(root.MoonetixErrorCodes).toEqual([
      'NOT_INITIALIZED',
      'INVALID_APP_ID',
      'INVALID_TOKEN',
      'TOKEN_EXPIRED_OR_USED',
      'NETWORK',
      'UNSUPPORTED',
      'UNKNOWN',
    ]);
  });
});
