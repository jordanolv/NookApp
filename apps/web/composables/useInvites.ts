import type { InvitePublic, ServerPublic } from '@nookapp/protocol';

export function useInvites() {
  const api = useApi();

  async function createInvite(serverId: string): Promise<InvitePublic> {
    return api.post<InvitePublic>(`/servers/${serverId}/invites`, {});
  }

  async function joinViaInvite(code: string): Promise<ServerPublic> {
    return api.post<ServerPublic>(`/servers/invites/${code}/join`, {});
  }

  return { createInvite, joinViaInvite };
}
