import type {
  CategoryPublic,
  ChannelPublic,
  DirectMessagePublic,
  DmConversation,
  DmUser,
  MessagePublic,
  ServerPublic,
} from '@nookapp/protocol';

export function message(overrides: Partial<MessagePublic> = {}): MessagePublic {
  return {
    id: 'm1',
    channelId: 'c1',
    authorId: 'u1',
    content: 'hello',
    createdAt: '2026-07-19T10:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

export function dmUser(overrides: Partial<DmUser> = {}): DmUser {
  return { id: 'u2', name: 'Ada', username: 'ada', avatarUrl: null, ...overrides };
}

export function directMessage(overrides: Partial<DirectMessagePublic> = {}): DirectMessagePublic {
  return {
    id: 'dm1',
    conversationId: 'conv1',
    authorId: 'u2',
    content: 'hey',
    createdAt: '2026-07-19T10:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

export function conversation(overrides: Partial<DmConversation> = {}): DmConversation {
  return {
    id: 'conv1',
    otherUser: dmUser(),
    lastMessage: null,
    lastMessageAt: '2026-07-19T10:00:00.000Z',
    unreadCount: 0,
    createdAt: '2026-07-19T09:00:00.000Z',
    ...overrides,
  };
}

export function server(overrides: Partial<ServerPublic> = {}): ServerPublic {
  return {
    id: 's1',
    slug: 'nook',
    name: 'Nook',
    ownerId: 'u1',
    iconUrl: null,
    bannerUrl: null,
    createdAt: '2026-07-19T09:00:00.000Z',
    ...overrides,
  };
}

export function channel(overrides: Partial<ChannelPublic> = {}): ChannelPublic {
  return {
    id: 'c1',
    serverId: 's1',
    categoryId: null,
    type: 'text',
    name: 'general',
    position: 0,
    parentId: null,
    mapZone: null,
    iconUrl: null,
    bannerUrl: null,
    widgetKind: null,
    showStat: true,
    color: null,
    iconName: null,
    createdAt: '2026-07-19T09:00:00.000Z',
    ...overrides,
  };
}

export function category(overrides: Partial<CategoryPublic> = {}): CategoryPublic {
  return {
    id: 'cat1',
    serverId: 's1',
    name: 'General',
    position: 0,
    color: null,
    iconUrl: null,
    bannerUrl: null,
    createdAt: '2026-07-19T09:00:00.000Z',
    ...overrides,
  };
}
