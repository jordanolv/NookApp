import type {
  CreateRoleInput,
  ReorderRolesInput,
  RolePublic,
  SetMemberRolesInput,
  UpdateRoleInput,
} from '@nookapp/protocol';

export function useRoles() {
  const api = useApi();

  async function listRoles(serverId: string): Promise<RolePublic[]> {
    return api.get<RolePublic[]>(`/servers/${serverId}/roles`);
  }

  async function createRole(serverId: string, input: CreateRoleInput): Promise<RolePublic> {
    return api.post<RolePublic>(`/servers/${serverId}/roles`, input as Record<string, unknown>);
  }

  async function updateRole(
    serverId: string,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<RolePublic> {
    return api.patch<RolePublic>(
      `/servers/${serverId}/roles/${roleId}`,
      input as Record<string, unknown>,
    );
  }

  async function deleteRole(serverId: string, roleId: string): Promise<void> {
    await api.del(`/servers/${serverId}/roles/${roleId}`);
  }

  async function reorderRoles(serverId: string, input: ReorderRolesInput): Promise<RolePublic[]> {
    return api.put<RolePublic[]>(
      `/servers/${serverId}/roles/order`,
      input as unknown as Record<string, unknown>,
    );
  }

  async function setMemberRoles(
    serverId: string,
    userId: string,
    input: SetMemberRolesInput,
  ): Promise<string[]> {
    return api.put<string[]>(
      `/servers/${serverId}/members/${userId}/roles`,
      input as unknown as Record<string, unknown>,
    );
  }

  return {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    reorderRoles,
    setMemberRoles,
  };
}
