import type { MemberPublic } from '@nookapp/protocol';

// Module-level cache: member directory per server, used to resolve author ids to names.
const membersByServer = reactive(new Map<string, MemberPublic[]>());
const pending = new Map<string, Promise<void>>();

export function useServerMembers(serverId: Ref<string> | ComputedRef<string>) {
  const api = useApi();

  function ensureLoaded(id: string): Promise<void> {
    if (membersByServer.has(id)) return Promise.resolve();
    let p = pending.get(id);
    if (!p) {
      p = api
        .get<MemberPublic[]>(`/servers/${id}/members`)
        .then((list) => void membersByServer.set(id, list))
        .finally(() => pending.delete(id));
      pending.set(id, p);
    }
    return p;
  }

  if (import.meta.client) watch(serverId, (id) => void ensureLoaded(id), { immediate: true });

  const byUserId = computed(() => {
    const map = new Map<string, MemberPublic['user']>();
    for (const m of membersByServer.get(serverId.value) ?? []) map.set(m.userId, m.user);
    return map;
  });

  function nameOf(userId: string): string {
    return byUserId.value.get(userId)?.name ?? userId.slice(0, 8);
  }

  return { byUserId, nameOf, ensureLoaded };
}
