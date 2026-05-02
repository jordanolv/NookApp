import type { CreateServerInput, ServerPublic } from '@nookapp/protocol';
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

  async function deleteServer(serverId: string) {
    await api.del(`/servers/${serverId}`);
    store.removeServer(serverId);
  }

  return { store, fetchServers, createServer, deleteServer };
}
