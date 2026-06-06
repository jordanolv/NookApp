<script setup lang="ts">
import type { DmConversation } from '@nookapp/protocol';

defineProps<{
  conversations: DmConversation[];
  activeId: string | null;
}>();

const emit = defineEmits<{ select: [id: string] }>();

function preview(c: DmConversation): string {
  if (!c.lastMessage) return 'Démarrer la conversation';
  return c.lastMessage.content;
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}
</script>

<template>
  <div class="dm-list">
    <div v-if="conversations.length === 0" class="dm-list__empty">Aucune conversation</div>
    <button
      v-for="c in conversations"
      :key="c.id"
      type="button"
      class="dm-list__item"
      :class="{ 'dm-list__item--active': c.id === activeId }"
      @click="emit('select', c.id)"
    >
      <DmAvatar :name="c.otherUser.name" :avatar-url="c.otherUser.avatarUrl" :size="38" />
      <span class="dm-list__meta">
        <span class="dm-list__top">
          <span class="dm-list__name">{{ c.otherUser.name }}</span>
          <span class="dm-list__time">{{ shortTime(c.lastMessageAt) }}</span>
        </span>
        <span class="dm-list__preview" :class="{ 'dm-list__preview--unread': c.unreadCount > 0 }">
          {{ preview(c) }}
        </span>
      </span>
      <span v-if="c.unreadCount > 0" class="dm-list__badge">{{ c.unreadCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.dm-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-divider) transparent;
}
.dm-list__empty {
  padding: 16px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-faint);
}
.dm-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: none;
  padding: 8px;
  border-radius: 12px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s ease;
}
.dm-list__item:hover {
  background: var(--surface-tinted);
}
.dm-list__item--active {
  background: var(--surface-tinted-strong);
}
.dm-list__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dm-list__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.dm-list__name {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dm-list__time {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--ink-faint);
}
.dm-list__preview {
  font-size: 12px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dm-list__preview--unread {
  color: var(--ink);
  font-weight: 600;
}
.dm-list__badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--accent-rose);
}
</style>
