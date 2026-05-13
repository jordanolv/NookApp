import { computed, onMounted, ref } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export type SidebarSide = 'left' | 'right';

interface StoredState {
  side?: SidebarSide;
  order?: string[];
  active?: string[];
  heights?: Record<string, number>;
}

const STORAGE_KEY = 'sidebar:state';

/**
 * Sidebar state shared across the app:
 * - which side the bar is anchored to (left/right)
 * - section order (controls icon stack + content stack)
 * - which sections are currently active (multiple at once)
 */
export function useSidebar(allSectionKeys: string[], defaultActiveKeys: string[] = []) {
  const uiLayout = useUiLayout();

  const validDefaultActiveKeys = defaultActiveKeys.filter((key) => allSectionKeys.includes(key));
  const side = ref<SidebarSide>('left');
  const order = ref<string[]>([...allSectionKeys]);
  const activeSet = ref<Set<string>>(new Set(validDefaultActiveKeys));
  const sectionHeights = ref<Record<string, number>>({});

  onMounted(() => {
    void uiLayout.ensureLoaded().then(() => {
      const saved = uiLayout.get<StoredState & UiLayoutEntry>(STORAGE_KEY);
      if (!saved) return;
      if (saved.side === 'left' || saved.side === 'right') side.value = saved.side;
      if (Array.isArray(saved.order)) {
        // Preserve any new keys not in saved order, drop unknown keys.
        const known = new Set(allSectionKeys);
        const fromSaved = saved.order.filter((k) => known.has(k));
        const missing = allSectionKeys.filter((k) => !fromSaved.includes(k));
        order.value = [...fromSaved, ...missing];
      }
      if (Array.isArray(saved.active)) {
        activeSet.value = new Set(saved.active.filter((k) => allSectionKeys.includes(k)));
      }
      if (saved.heights && typeof saved.heights === 'object') {
        sectionHeights.value = { ...saved.heights };
      }
    });
  });

  function persist() {
    const payload: StoredState = {
      side: side.value,
      order: order.value,
      active: Array.from(activeSet.value),
      heights: sectionHeights.value,
    };
    uiLayout.set(STORAGE_KEY, payload as unknown as UiLayoutEntry);
  }

  function toggleSection(key: string) {
    if (activeSet.value.has(key)) activeSet.value.delete(key);
    else activeSet.value.add(key);
    activeSet.value = new Set(activeSet.value);
    persist();
  }

  function swapSide() {
    side.value = side.value === 'left' ? 'right' : 'left';
    persist();
  }

  function moveSection(key: string, toIndex: number) {
    const current = order.value.indexOf(key);
    if (current === -1) return;
    const next = order.value.slice();
    next.splice(current, 1);
    next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, key);
    order.value = next;
    persist();
  }

  function setOrder(newOrder: string[]) {
    const known = new Set(allSectionKeys);
    const sanitized = newOrder.filter((k) => known.has(k));
    const missing = allSectionKeys.filter((k) => !sanitized.includes(k));
    order.value = [...sanitized, ...missing];
    persist();
  }

  function setSectionHeight(key: string, px: number) {
    sectionHeights.value = { ...sectionHeights.value, [key]: Math.max(80, Math.round(px)) };
    persist();
  }

  const activeOrderedKeys = computed(() => order.value.filter((k) => activeSet.value.has(k)));
  const hasAnyIcon = computed(() => order.value.length > 0);

  return {
    side,
    order,
    activeSet,
    sectionHeights,
    activeOrderedKeys,
    hasAnyIcon,
    toggleSection,
    swapSide,
    moveSection,
    setOrder,
    setSectionHeight,
  };
}
