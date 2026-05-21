import type { PluginCapabilities } from '@nookapp/protocol';

export interface ServerPluginItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  apiKeyPrefix: string;
  status: 'active' | 'disabled';
  capabilities: PluginCapabilities | null;
  installed: boolean;
  connected: boolean;
}

export function useServerPlugins() {
  const api = useApi();

  async function list(serverId: string): Promise<ServerPluginItem[]> {
    return api.get<ServerPluginItem[]>(`/servers/${serverId}/plugins`);
  }

  async function install(serverId: string, pluginId: string) {
    return api.post(`/servers/${serverId}/plugins/${pluginId}/install`, {});
  }

  async function uninstall(serverId: string, pluginId: string) {
    return api.del(`/servers/${serverId}/plugins/${pluginId}`);
  }

  return { list, install, uninstall };
}
