<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import type { useSidebar } from '~/composables/useSidebar';
import type { HomePinKind } from '~/composables/useHomePins';

type Sidebar = ReturnType<typeof useSidebar>;

const props = defineProps<{
  sidebar: Sidebar;
  sectionLabels: Record<string, string>;
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
  serverId: string;
}>();

const emit = defineEmits<{
  'select-channel': [channel: ChannelPublic, e: MouseEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
  'create-channel': [opts: { type: 'text' | 'voice'; categoryId: string | null }];
  'open-pinned': [channel: ChannelPublic, kind: HomePinKind];
}>();

const windows = computed(() => props.sidebar.detached.value);

function titleFor(sectionKey: string): string {
  return props.sectionLabels[sectionKey] ?? sectionKey;
}

function onDragEnd(id: string, x: number, y: number, width: number, height: number) {
  if (isOverSidebar(x, y, width, height)) {
    props.sidebar.dockWindow(id);
  }
}

function isOverSidebar(x: number, y: number, w: number, h: number): boolean {
  const sidebars = document.querySelectorAll<HTMLElement>('.sidebar');
  for (const el of sidebars) {
    const r = el.getBoundingClientRect();
    const overlapX = Math.min(x + w, r.right) - Math.max(x, r.left);
    const overlapY = Math.min(y + h, r.bottom) - Math.max(y, r.top);
    if (overlapX > 60 && overlapY > 60) return true;
  }
  return false;
}
</script>

<template>
  <template v-for="win in windows" :key="win.id">
    <UiFloatingWindow
      :title="titleFor(win.sectionKey)"
      :initial-width="320"
      :initial-height="440"
      :initial-x="win.initialX"
      :initial-y="win.initialY"
      :min-width="240"
      :min-height="200"
      :persist-key="`sidebar:window:${win.id}`"
      @close="sidebar.dockWindow(win.id)"
      @drag-end="(x, y, w, h) => onDragEnd(win.id, x, y, w, h)"
    >
      <LayoutChannelsList
        v-if="win.sectionKey === 'channels'"
        :channels="channels"
        :categories="categories"
        :active-channel-ids="activeChannelIds"
        :current-voice-id="currentVoiceId"
        :can-manage="canManage"
        @select="(ch, e) => emit('select-channel', ch, e)"
        @edit-channel="(id) => emit('edit-channel', id)"
        @edit-category="(id) => emit('edit-category', id)"
      />
      <HomeMembersList v-else-if="win.sectionKey === 'members'" :server-id="serverId" />
      <HomePinsList
        v-else-if="win.sectionKey === 'pinned'"
        :server-id="serverId"
        @open="(ch, kind) => emit('open-pinned', ch, kind)"
      />
    </UiFloatingWindow>
  </template>
</template>
