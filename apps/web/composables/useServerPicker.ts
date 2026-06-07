import { computed, ref } from 'vue';

export type ServerDropdown = 'switcher' | 'menu';
export type ServerDropdownPlacement = 'top' | 'bottom';

const ESTIMATED_PICKER_HEIGHT = 320;
const GAP = 6;

export function useServerPicker() {
  const dropdown = ref<ServerDropdown | null>(null);
  const anchor = ref<DOMRect | null>(null);

  const placement = computed<ServerDropdownPlacement>(() => {
    if (!anchor.value || typeof window === 'undefined') return 'bottom';
    const spaceBelow = window.innerHeight - anchor.value.bottom;
    return spaceBelow < ESTIMATED_PICKER_HEIGHT ? 'top' : 'bottom';
  });

  const top = computed(() => {
    if (!anchor.value) return 64;
    return placement.value === 'top' ? anchor.value.top - GAP : anchor.value.bottom + GAP;
  });
  const left = computed(() => (anchor.value ? anchor.value.left : 16));

  function close() {
    dropdown.value = null;
  }

  function openMenu(e: MouseEvent) {
    anchor.value = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropdown.value = 'menu';
  }

  function showSwitcher() {
    dropdown.value = 'switcher';
  }

  function switchServer(id: string) {
    close();
    navigateTo(`/app/${id}`);
  }

  return { dropdown, anchor, top, left, placement, close, openMenu, showSwitcher, switchServer };
}
