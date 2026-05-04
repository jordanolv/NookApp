interface PluginPanelSpec {
  id: string;
  label: string;
  icon: string;
  component: string;
}

interface PluginInfo {
  id: string;
  displayName: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  panels: PluginPanelSpec[];
}

export function usePlugins() {
  const {
    public: { apiBase },
  } = useRuntimeConfig();

  async function listForServer(serverId: string): Promise<PluginInfo[]> {
    return $fetch<PluginInfo[]>(`${apiBase}/servers/${serverId}/plugins`, {
      credentials: 'include',
    });
  }

  async function enable(serverId: string, pluginId: string) {
    await $fetch(`${apiBase}/servers/${serverId}/plugins/${pluginId}/enable`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  async function disable(serverId: string, pluginId: string) {
    await $fetch(`${apiBase}/servers/${serverId}/plugins/${pluginId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  return { listForServer, enable, disable };
}
