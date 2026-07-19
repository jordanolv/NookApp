import type { DirectMessagePublic } from '@nookapp/protocol';

export function useDmRealtime() {
  const socket = useSocket();
  const hub = useDmHub();
  const dock = useNotificationDock();
  const { store, fetchConversations, markRead } = useDms();
  const { user } = useAuth();

  function handle(msg: DirectMessagePublic) {
    const isMine = msg.authorId === user.value?.id;
    const isActive = hub.open.value && hub.activeId.value === msg.conversationId;
    const { isNew, shouldNotify } = store.receiveDirectMessage(msg, { isMine, isActive });

    if (isNew) void fetchConversations();
    else if (isActive) void markRead(msg.conversationId);

    if (shouldNotify) {
      const conv = store.conversations.find((c) => c.id === msg.conversationId);
      dock.push({
        kind: 'info',
        title: conv?.otherUser.name ?? 'Message privé',
        detail: msg.content.slice(0, 80),
        timeoutMs: 6000,
        onClick: () => hub.openConversation(msg.conversationId),
      });
    }
  }

  function setup() {
    void fetchConversations();
    return socket.onDmMessage(handle);
  }

  return { setup };
}
