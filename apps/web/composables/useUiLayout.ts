import type { UiLayout, UiLayoutEntry } from '@nookapp/protocol';

const STATE_KEY = 'ui-layout-state';
const FLUSH_DELAY = 500;

type LayoutState = {
  loaded: boolean;
  loading: Promise<void> | null;
  layout: UiLayout;
  pending: Record<string, UiLayoutEntry | null>;
  flushTimer: ReturnType<typeof setTimeout> | null;
};

export function useUiLayout() {
  const api = useApi();
  const state = useState<LayoutState>(STATE_KEY, () => ({
    loaded: false,
    loading: null,
    layout: {},
    pending: {},
    flushTimer: null,
  }));

  function ensureLoaded(): Promise<void> {
    if (!import.meta.client) return Promise.resolve();
    if (state.value.loaded) return Promise.resolve();
    if (state.value.loading) return state.value.loading;
    state.value.loading = api
      .get<UiLayout>('/users/me/ui-layout')
      .then((data) => {
        state.value.layout = data ?? {};
        state.value.loaded = true;
      })
      .catch(() => {
        state.value.layout = {};
        state.value.loaded = true;
      })
      .finally(() => {
        state.value.loading = null;
      });
    return state.value.loading;
  }

  if (import.meta.client) void ensureLoaded();

  function get<T extends UiLayoutEntry>(key: string): T | null {
    const v = state.value.layout[key];
    return v ? (v as T) : null;
  }

  function scheduleFlush() {
    if (!import.meta.client) return;
    if (state.value.flushTimer) clearTimeout(state.value.flushTimer);
    state.value.flushTimer = setTimeout(() => {
      void flush();
    }, FLUSH_DELAY);
  }

  async function flush(): Promise<void> {
    if (!import.meta.client) return;
    if (state.value.flushTimer) {
      clearTimeout(state.value.flushTimer);
      state.value.flushTimer = null;
    }
    const entries = state.value.pending;
    if (Object.keys(entries).length === 0) return;
    state.value.pending = {};
    try {
      await api.patch('/users/me/ui-layout', { entries });
    } catch {
      // best-effort — the local in-memory layout still reflects the change
    }
  }

  function set(key: string, value: UiLayoutEntry): void {
    state.value.layout = {
      ...state.value.layout,
      [key]: { ...(state.value.layout[key] ?? {}), ...value },
    };
    state.value.pending = {
      ...state.value.pending,
      [key]: { ...(state.value.pending[key] ?? {}), ...value },
    };
    scheduleFlush();
  }

  function remove(key: string): void {
    if (!(key in state.value.layout) && !(key in state.value.pending)) return;
    const next = { ...state.value.layout };
    delete next[key];
    state.value.layout = next;
    state.value.pending = { ...state.value.pending, [key]: null };
    scheduleFlush();
  }

  return { ensureLoaded, get, set, remove, flush };
}
