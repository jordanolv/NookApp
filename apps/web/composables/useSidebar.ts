import { onMounted, ref } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export interface DetachedWindow {
  id: string;
  sectionKey: string;
  initialX?: number;
  initialY?: number;
}

interface StoredState {
  active?: string[];
  heights?: Record<string, number>;
  detached?: Array<{ id: string; sectionKey: string }>;
}

const STORAGE_KEY = 'sidebar:state';

export function useSidebar(allSectionKeys: string[], defaultActiveKeys: string[] = []) {
  const uiLayout = useUiLayout();

  const known = new Set(allSectionKeys);
  const validDefaultActiveKeys = defaultActiveKeys.filter((k) => known.has(k));

  const activeSet = ref<Set<string>>(new Set(validDefaultActiveKeys));
  const sectionHeights = ref<Record<string, number>>({});
  const detached = ref<DetachedWindow[]>([]);

  function loadFromSaved(saved: StoredState) {
    if (Array.isArray(saved.active)) {
      activeSet.value = new Set(saved.active.filter((k) => known.has(k)));
    }
    if (saved.heights && typeof saved.heights === 'object') {
      sectionHeights.value = { ...saved.heights };
    }
    if (Array.isArray(saved.detached)) {
      detached.value = saved.detached
        .filter((w) => w && known.has(w.sectionKey) && typeof w.id === 'string')
        .map((w) => ({ id: w.id, sectionKey: w.sectionKey }));
    }
  }

  onMounted(() => {
    void uiLayout.ensureLoaded().then(() => {
      const saved = uiLayout.get<StoredState & UiLayoutEntry>(STORAGE_KEY);
      if (saved) loadFromSaved(saved);
    });
  });

  function persist() {
    uiLayout.set(STORAGE_KEY, {
      active: Array.from(activeSet.value),
      heights: sectionHeights.value,
      detached: detached.value.map((w) => ({ id: w.id, sectionKey: w.sectionKey })),
    } as unknown as UiLayoutEntry);
  }

  function toggleSection(key: string) {
    if (!known.has(key)) return;
    if (activeSet.value.has(key)) activeSet.value.delete(key);
    else activeSet.value.add(key);
    activeSet.value = new Set(activeSet.value);
    persist();
  }

  function setSectionHeight(key: string, px: number) {
    sectionHeights.value = { ...sectionHeights.value, [key]: Math.max(80, Math.round(px)) };
    persist();
  }

  function newWindowId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function detachSection(
    key: string,
    opts?: { initialX?: number; initialY?: number },
  ): string | null {
    if (!known.has(key)) return null;
    const id = newWindowId();
    detached.value = [
      ...detached.value,
      { id, sectionKey: key, initialX: opts?.initialX, initialY: opts?.initialY },
    ];
    persist();
    return id;
  }

  function dockWindow(id: string) {
    const before = detached.value.length;
    detached.value = detached.value.filter((w) => w.id !== id);
    if (detached.value.length !== before) {
      uiLayout.remove(`sidebar:window:${id}`);
      persist();
    }
  }

  return {
    activeSet,
    sectionHeights,
    detached,
    toggleSection,
    setSectionHeight,
    detachSection,
    dockWindow,
  };
}
