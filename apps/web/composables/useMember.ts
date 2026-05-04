import type { MemberPublic } from '@nookapp/protocol';

// Module-level state: the current viewer's membership in the active server.
const currentMember = shallowRef<MemberPublic | null>(null);
const currentServerId = ref<string | null>(null);

export function useMember() {
  const api = useApi();

  async function loadMember(serverId: string): Promise<MemberPublic> {
    const m = await api.get<MemberPublic>(`/servers/${serverId}/members/me`);
    currentMember.value = m;
    currentServerId.value = serverId;
    return m;
  }

  function clearMember() {
    currentMember.value = null;
    currentServerId.value = null;
  }

  const isAdmin = computed(
    () => currentMember.value?.role === 'owner' || currentMember.value?.role === 'admin',
  );

  return {
    currentMember: readonly(currentMember),
    currentServerId: readonly(currentServerId),
    isAdmin,
    loadMember,
    clearMember,
  };
}
