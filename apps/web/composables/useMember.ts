import {
  hasPermission,
  PERMISSIONS,
  type MemberPublic,
  type PermissionFlag,
} from '@nookapp/protocol';

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

  function can(flag: PermissionFlag): boolean {
    const m = currentMember.value;
    if (!m) return false;
    return m.isOwner || hasPermission(m.permissions, flag);
  }

  const isOwner = computed(() => currentMember.value?.isOwner ?? false);
  const canManageServer = computed(() => can(PERMISSIONS.ManageServer));
  const canManageChannels = computed(() => can(PERMISSIONS.ManageChannels));
  const canManageMap = computed(() => can(PERMISSIONS.ManageMap));
  const canManageRoles = computed(() => can(PERMISSIONS.ManageRoles));
  const canManageMembers = computed(() => can(PERMISSIONS.ManageMembers));

  // Coarse "admin UI" check: any management permission gives access to admin affordances.
  const isAdmin = computed(
    () =>
      isOwner.value ||
      canManageServer.value ||
      canManageChannels.value ||
      canManageMap.value ||
      canManageRoles.value,
  );

  return {
    currentMember: readonly(currentMember),
    currentServerId: readonly(currentServerId),
    isOwner,
    isAdmin,
    canManageServer,
    canManageChannels,
    canManageMap,
    canManageRoles,
    canManageMembers,
    loadMember,
    clearMember,
  };
}
