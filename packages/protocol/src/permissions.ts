export const MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const PERMISSIONS = {
  ServerManage: 'server.manage',
  ServerDelete: 'server.delete',
  ChannelManage: 'channel.manage',
  MessageSend: 'message.send',
  MessageDelete: 'message.delete',
  MapEdit: 'map.edit',
  PluginManage: 'plugin.manage',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.ServerManage,
    PERMISSIONS.ChannelManage,
    PERMISSIONS.MessageSend,
    PERMISSIONS.MessageDelete,
    PERMISSIONS.MapEdit,
    PERMISSIONS.PluginManage,
  ],
  member: [PERMISSIONS.MessageSend],
};

export function roleHas(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
