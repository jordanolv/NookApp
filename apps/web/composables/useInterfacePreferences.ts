export type InterfacePreferences = {
  useClassicInterface: boolean;
};

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  useClassicInterface: false,
};

const STORAGE_KEY = 'nookapp:interface';

function sanitize(raw: unknown): InterfacePreferences {
  const out: InterfacePreferences = { ...DEFAULT_INTERFACE_PREFERENCES };
  if (!raw || typeof raw !== 'object') return out;
  const v = (raw as Record<string, unknown>).useClassicInterface;
  if (typeof v === 'boolean') out.useClassicInterface = v;
  return out;
}

function loadInitial(): InterfacePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_INTERFACE_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INTERFACE_PREFERENCES };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_INTERFACE_PREFERENCES };
  }
}

export function useInterfacePreferences() {
  const prefs = useState<InterfacePreferences>('interface.preferences', loadInitial);

  function persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value));
    } catch {
      /* quota / private mode — fail silent */
    }
  }

  function setClassicInterface(value: boolean) {
    prefs.value = { ...prefs.value, useClassicInterface: value };
    persist();
  }

  return {
    prefs: readonly(prefs),
    setClassicInterface,
  };
}
