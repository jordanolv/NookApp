export type MediaDeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

export type MediaDevicePrefs = {
  audioinput: string | null;
  audiooutput: string | null;
  videoinput: string | null;
};

export const MEDIA_DEVICE_KINDS = ['audioinput', 'audiooutput', 'videoinput'] as const;

export const DEFAULT_MEDIA_DEVICE_PREFS: MediaDevicePrefs = {
  audioinput: null,
  audiooutput: null,
  videoinput: null,
};

export const MEDIA_DEVICE_STORAGE_KEY = 'nookapp:media-devices';

export function sanitizeMediaDevicePrefs(raw: unknown): MediaDevicePrefs {
  const out = { ...DEFAULT_MEDIA_DEVICE_PREFS };
  if (!raw || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;
  for (const kind of MEDIA_DEVICE_KINDS) {
    const v = obj[kind];
    if (typeof v === 'string' && v.length > 0) out[kind] = v;
  }
  return out;
}

export function loadMediaDevicePrefs(): MediaDevicePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_MEDIA_DEVICE_PREFS };
  try {
    const raw = window.localStorage.getItem(MEDIA_DEVICE_STORAGE_KEY);
    return raw ? sanitizeMediaDevicePrefs(JSON.parse(raw)) : { ...DEFAULT_MEDIA_DEVICE_PREFS };
  } catch {
    return { ...DEFAULT_MEDIA_DEVICE_PREFS };
  }
}

export function saveMediaDevicePrefs(prefs: MediaDevicePrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEDIA_DEVICE_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode — fail silent */
  }
}
