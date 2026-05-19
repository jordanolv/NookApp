import { computed, onMounted, ref } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export type SidebarSide = 'left' | 'right';

interface StoredState {
  sectionSide?: Record<string, SidebarSide>;
  leftKeys?: string[];
  rightKeys?: string[];
  active?: string[];
  heights?: Record<string, number>;
  serverHeaderSide?: SidebarSide;
  userDockSide?: SidebarSide;
}

const STORAGE_KEY = 'sidebar:state';

function isSide(v: unknown): v is SidebarSide {
  return v === 'left' || v === 'right';
}

export function useSidebar(allSectionKeys: string[], defaultActiveKeys: string[] = []) {
  const uiLayout = useUiLayout();

  const known = new Set(allSectionKeys);
  const validDefaultActiveKeys = defaultActiveKeys.filter((k) => known.has(k));

  const sectionSide = ref<Record<string, SidebarSide>>(
    Object.fromEntries(allSectionKeys.map((k) => [k, 'left' as SidebarSide])),
  );
  const activeSet = ref<Set<string>>(new Set(validDefaultActiveKeys));
  const sectionHeights = ref<Record<string, number>>({});
  const serverHeaderSide = ref<SidebarSide>('left');
  const userDockSide = ref<SidebarSide>('left');

  function loadFromSaved(saved: StoredState) {
    const next: Record<string, SidebarSide> = {};
    if (saved.sectionSide && typeof saved.sectionSide === 'object') {
      for (const key of allSectionKeys) {
        next[key] = isSide(saved.sectionSide[key]) ? saved.sectionSide[key]! : 'left';
      }
      sectionSide.value = next;
    } else if (Array.isArray(saved.leftKeys) || Array.isArray(saved.rightKeys)) {
      for (const k of allSectionKeys) next[k] = 'left';
      for (const k of saved.leftKeys ?? []) if (known.has(k)) next[k] = 'left';
      for (const k of saved.rightKeys ?? []) if (known.has(k)) next[k] = 'right';
      sectionSide.value = next;
    }

    if (Array.isArray(saved.active)) {
      activeSet.value = new Set(saved.active.filter((k) => known.has(k)));
    }
    if (saved.heights && typeof saved.heights === 'object') {
      sectionHeights.value = { ...saved.heights };
    }
    if (isSide(saved.serverHeaderSide)) serverHeaderSide.value = saved.serverHeaderSide;
    if (isSide(saved.userDockSide)) userDockSide.value = saved.userDockSide;
  }

  onMounted(() => {
    void uiLayout.ensureLoaded().then(() => {
      const saved = uiLayout.get<StoredState & UiLayoutEntry>(STORAGE_KEY);
      if (saved) loadFromSaved(saved);
    });
  });

  function persist() {
    uiLayout.set(STORAGE_KEY, {
      sectionSide: sectionSide.value,
      active: Array.from(activeSet.value),
      heights: sectionHeights.value,
      serverHeaderSide: serverHeaderSide.value,
      userDockSide: userDockSide.value,
    } as unknown as UiLayoutEntry);
  }

  function sideHasSections(side: SidebarSide): boolean {
    return allSectionKeys.some((k) => sectionSide.value[k] === side);
  }

  // Singletons (server header + user dock) can't sit alone on a side without
  // sections — they auto-follow the side that hosts the sections.
  function ensureSingletonPlacement() {
    const left = sideHasSections('left');
    const right = sideHasSections('right');
    if (left === right) return;
    const target: SidebarSide = left ? 'left' : 'right';
    if (serverHeaderSide.value !== target) serverHeaderSide.value = target;
    if (userDockSide.value !== target) userDockSide.value = target;
  }

  function toggleSection(key: string) {
    if (!known.has(key)) return;
    if (activeSet.value.has(key)) activeSet.value.delete(key);
    else activeSet.value.add(key);
    activeSet.value = new Set(activeSet.value);
    persist();
  }

  function setSectionSide(key: string, side: SidebarSide) {
    if (!known.has(key) || !isSide(side)) return;
    if (sectionSide.value[key] === side) return;
    sectionSide.value = { ...sectionSide.value, [key]: side };
    ensureSingletonPlacement();
    persist();
  }

  function setSingletonSide(ref_: typeof serverHeaderSide, side: SidebarSide) {
    if (!isSide(side) || ref_.value === side) return;
    const other: SidebarSide = side === 'left' ? 'right' : 'left';
    if (!sideHasSections(side) && sideHasSections(other)) return;
    ref_.value = side;
    persist();
  }

  function setServerHeaderSide(side: SidebarSide) {
    setSingletonSide(serverHeaderSide, side);
  }

  function setUserDockSide(side: SidebarSide) {
    setSingletonSide(userDockSide, side);
  }

  function setSectionHeight(key: string, px: number) {
    sectionHeights.value = { ...sectionHeights.value, [key]: Math.max(80, Math.round(px)) };
    persist();
  }

  const leftKeys = computed(() => allSectionKeys.filter((k) => sectionSide.value[k] === 'left'));
  const rightKeys = computed(() => allSectionKeys.filter((k) => sectionSide.value[k] === 'right'));
  const activeOrderedKeys = computed(() => allSectionKeys.filter((k) => activeSet.value.has(k)));

  return {
    sectionSide,
    leftKeys,
    rightKeys,
    activeSet,
    activeOrderedKeys,
    sectionHeights,
    serverHeaderSide,
    userDockSide,
    toggleSection,
    setSectionSide,
    setSectionHeight,
    setServerHeaderSide,
    setUserDockSide,
  };
}
