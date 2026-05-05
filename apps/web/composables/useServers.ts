import type { CreateServerInput, ServerPublic, UpdateServerInput } from '@nookapp/protocol';
import { useServersStore } from '~/stores/servers';

export function useServers() {
  const api = useApi();
  const store = useServersStore();

  async function fetchServers() {
    const servers = await api.get<ServerPublic[]>('/servers');
    store.setList(servers);
    return servers;
  }

  async function createServer(input: CreateServerInput): Promise<ServerPublic> {
    const server = await api.post<ServerPublic>('/servers', input);
    store.upsertServer(server);
    return server;
  }

  async function updateServer(serverId: string, input: UpdateServerInput): Promise<ServerPublic> {
    const updated = await api.patch<ServerPublic>(
      `/servers/${serverId}`,
      input as Record<string, unknown>,
    );
    store.upsertServer(updated);
    return updated;
  }

  async function deleteServer(serverId: string) {
    await api.del(`/servers/${serverId}`);
    store.removeServer(serverId);
  }

  return { store, fetchServers, createServer, updateServer, deleteServer };
}
