import type { Ref } from 'vue';

export interface HiddenPanelMeta {
  label: string;
  icon: string;
}

export interface HiddenPanelEntry extends HiddenPanelMeta {
  id: string;
}

export function useHiddenPanels(serverId: Ref<string>) {
  const layout = useUiLayout();

  const prefix = computed(() => `panel-hidden:${serverId.value}:`);

  const list = computed<HiddenPanelEntry[]>(() => {
    return layout
      .entriesByPrefix(prefix.value)
      .map(([key, value]) => ({
        id: key.slice(prefix.value.length),
        label: typeof value.label === 'string' ? value.label : key,
        icon: typeof value.icon === 'string' ? value.icon : 'square',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  function isHidden(id: string): boolean {
    return layout.get(`${prefix.value}${id}`) !== null;
  }

  function hide(id: string, meta: HiddenPanelMeta): void {
    layout.set(`${prefix.value}${id}`, { hidden: true, label: meta.label, icon: meta.icon });
  }

  function show(id: string): void {
    layout.remove(`${prefix.value}${id}`);
  }

  return { list, isHidden, hide, show };
}
