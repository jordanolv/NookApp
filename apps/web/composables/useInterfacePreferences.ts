import { applyTheme, isValidThemeId, type ThemeId } from '~/themes';

export type ThemeMode = ThemeId;

export type InterfacePreferences = {
  useClassicInterface: boolean;
  theme: ThemeMode;
  swapSidebars: boolean;
};

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  useClassicInterface: false,
  theme: 'light',
  swapSidebars: false,
};

const STORAGE_KEY = 'nookapp:interface';

function sanitize(raw: unknown): InterfacePreferences {
  const out: InterfacePreferences = { ...DEFAULT_INTERFACE_PREFERENCES };
  if (!raw || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.useClassicInterface === 'boolean') {
    out.useClassicInterface = obj.useClassicInterface;
  }
  if (isValidThemeId(obj.theme)) {
    out.theme = obj.theme;
  }
  if (typeof obj.swapSidebars === 'boolean') {
    out.swapSidebars = obj.swapSidebars;
  }
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

  if (import.meta.client) {
    applyTheme(prefs.value.theme);
  }

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

  function setTheme(theme: ThemeMode) {
    prefs.value = { ...prefs.value, theme };
    applyTheme(theme);
    persist();
  }

  function toggleTheme() {
    setTheme(prefs.value.theme === 'dark' ? 'light' : 'dark');
  }

  function setSwapSidebars(value: boolean) {
    prefs.value = { ...prefs.value, swapSidebars: value };
    persist();
  }

  return {
    prefs: readonly(prefs),
    setClassicInterface,
    setTheme,
    toggleTheme,
    setSwapSidebars,
  };
}
