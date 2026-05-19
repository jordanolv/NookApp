<script setup lang="ts">
import type { Component } from 'vue';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import type { useSidebar } from '~/composables/useSidebar';
import type { HomePinKind } from '~/composables/useHomePins';

type Sidebar = ReturnType<typeof useSidebar>;

defineProps<{
  sidebar: Sidebar;
  sections: { key: string; label: string; icon: Component }[];
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
  serverId: string;
  serverName: string;
  bannerUrl: string | null;
}>();

defineEmits<{
  'select-channel': [channel: ChannelPublic, e: MouseEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
  'open-server-switcher': [e: MouseEvent];
  'open-server-menu': [e: MouseEvent];
  'create-channel': [];
  'open-pinned': [channel: ChannelPublic, kind: HomePinKind];
}>();
</script>

<template>
  <LayoutNookSidebar
    v-for="side in ['left', 'right'] as const"
    :key="side"
    :side="side"
    :sidebar="sidebar"
    :sections="sections"
    :channels="channels"
    :categories="categories"
    :active-channel-ids="activeChannelIds"
    :current-voice-id="currentVoiceId"
    :can-manage="canManage"
    :server-id="serverId"
    :server-name="serverName"
    :banner-url="bannerUrl"
    :always-show="side === 'left'"
    @select-channel="(ch, e) => $emit('select-channel', ch, e)"
    @edit-channel="(id) => $emit('edit-channel', id)"
    @edit-category="(id) => $emit('edit-category', id)"
    @open-server-switcher="(e) => $emit('open-server-switcher', e)"
    @open-server-menu="(e) => $emit('open-server-menu', e)"
    @create-channel="$emit('create-channel')"
    @open-pinned="(ch, kind) => $emit('open-pinned', ch, kind)"
  />
</template>
