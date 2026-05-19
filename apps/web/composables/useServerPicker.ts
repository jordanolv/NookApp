import { computed, ref } from 'vue';

export type ServerDropdown = 'switcher' | 'menu';

export function useServerPicker() {
  const dropdown = ref<ServerDropdown | null>(null);
  const anchor = ref<DOMRect | null>(null);

  const top = computed(() => (anchor.value ? anchor.value.bottom + 6 : 64));
  const left = computed(() => (anchor.value ? anchor.value.left : 16));

  function close() {
    dropdown.value = null;
  }

  function openSwitcher(e: MouseEvent) {
    anchor.value = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropdown.value = 'switcher';
  }

  function openMenu(e: MouseEvent) {
    anchor.value = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropdown.value = 'menu';
  }

  function switchServer(id: string) {
    close();
    navigateTo(`/app/${id}`);
  }

  return { dropdown, anchor, top, left, close, openSwitcher, openMenu, switchServer };
}
