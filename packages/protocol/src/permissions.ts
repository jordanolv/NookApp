export const PERMISSIONS = {
  ViewChannels: 1 << 0,
  SendMessages: 1 << 1,
  ManageMessages: 1 << 2,
  CreateInvite: 1 << 3,
  ManageChannels: 1 << 4,
  ManageRoles: 1 << 5,
  ManageMembers: 1 << 6,
  ManageMap: 1 << 7,
  ManagePlugins: 1 << 8,
  ManageServer: 1 << 9,
} as const;

export type PermissionFlag = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export const ALL_PERMISSIONS: number = Object.values(PERMISSIONS).reduce<number>(
  (acc, flag) => acc | flag,
  0,
);

export const DEFAULT_EVERYONE_PERMISSIONS: number =
  PERMISSIONS.ViewChannels | PERMISSIONS.SendMessages | PERMISSIONS.CreateInvite;

export function hasPermission(bitfield: number, flag: PermissionFlag): boolean {
  return (bitfield & flag) === flag;
}

export function combinePermissions(...bitfields: number[]): number {
  return bitfields.reduce((acc, b) => acc | b, 0);
}

export interface PermissionMeta {
  label: string;
  description: string;
  category: 'general' | 'moderation' | 'management';
}

export const PERMISSION_META: Record<PermissionKey, PermissionMeta> = {
  ViewChannels: {
    label: 'Voir les salons',
    description: 'Voir la liste des salons et leur contenu.',
    category: 'general',
  },
  SendMessages: {
    label: 'Envoyer des messages',
    description: 'Envoyer des messages dans les salons texte.',
    category: 'general',
  },
  CreateInvite: {
    label: 'Créer une invitation',
    description: "Générer un lien d'invitation pour le serveur.",
    category: 'general',
  },
  ManageMessages: {
    label: 'Gérer les messages',
    description: 'Supprimer les messages des autres membres.',
    category: 'moderation',
  },
  ManageMembers: {
    label: 'Gérer les membres',
    description: 'Expulser des membres du serveur.',
    category: 'moderation',
  },
  ManageChannels: {
    label: 'Gérer les salons',
    description: 'Créer, modifier et supprimer des salons et catégories.',
    category: 'management',
  },
  ManageRoles: {
    label: 'Gérer les rôles',
    description: 'Créer, modifier et assigner les rôles inférieurs au sien.',
    category: 'management',
  },
  ManageMap: {
    label: 'Modifier la carte',
    description: 'Utiliser le mode édition de la carte.',
    category: 'management',
  },
  ManagePlugins: {
    label: 'Gérer les plugins',
    description: 'Activer, désactiver et configurer les plugins.',
    category: 'management',
  },
  ManageServer: {
    label: 'Gérer le serveur',
    description: 'Modifier le nom, la bannière et les paramètres du serveur.',
    category: 'management',
  },
};
