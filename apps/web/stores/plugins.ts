import { defineStore } from 'pinia';
import { mountPluginPanels, unmountPluginPanels, getActivePanels } from '~/plugins-runtime';
import type { PanelEntry } from '~/plugins-runtime';

export const usePluginsStore = defineStore('plugins', () => {
  const { listForServer } = usePlugins();
  const panels = ref<PanelEntry[]>([]);

  async function syncForServer(serverId: string) {
    const plugins = await listForServer(serverId);
    for (const plugin of plugins) {
      if (plugin.enabled && plugin.panels.length) {
        mountPluginPanels(plugin.id, plugin.panels);
      } else {
        unmountPluginPanels(plugin.id);
      }
    }
    panels.value = getActivePanels();
  }

  function clear() {
    panels.value = [];
  }

  return { panels, syncForServer, clear };
});
