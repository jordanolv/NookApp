import { describe, expect, it } from 'vitest';
import { sanitizeMediaDevicePrefs } from '~/utils/media-device-prefs';

describe('sanitizeMediaDevicePrefs', () => {
  it('keeps non-empty string ids and drops everything else', () => {
    expect(
      sanitizeMediaDevicePrefs({ audioinput: 'mic-1', audiooutput: '', videoinput: 42 }),
    ).toEqual({ audioinput: 'mic-1', audiooutput: null, videoinput: null });
  });

  it('returns defaults for garbage input', () => {
    expect(sanitizeMediaDevicePrefs(null)).toEqual({
      audioinput: null,
      audiooutput: null,
      videoinput: null,
    });
  });
});
