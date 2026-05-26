<script setup lang="ts">
import type { Component } from 'vue';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import type { useSidebar } from '~/composables/useSidebar';
import type { HomePinKind } from '~/composables/useHomePins';

type Sidebar = ReturnType<typeof useSidebar>;

defineProps<{
  sidebar: Sidebar;
  rightSections: {
    key: string;
    label: string;
    icon: Component;
    mode?: 'panel' | 'toggle';
    active?: boolean;
    onToggle?: () => void;
  }[];
  channels: ChannelPublic[];
  voiceChannels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
  serverId: string;
  serverName: string;
  bannerUrl: string | null;
}>();

defineEmits<{
  'select-channel': [channel: ChannelPublic, e: MouseEvent | KeyboardEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
  'open-server-switcher': [e: MouseEvent];
  'open-server-menu': [e: MouseEvent];
  'create-channel': [opts: { type: 'text' | 'voice'; categoryId: string | null }];
  'open-pinned': [channel: ChannelPublic, kind: HomePinKind];
  'open-user-settings': [];
  'minimap-teleport': [x: number, y: number];
  'reorder-sections': [fromKey: string, toKey: string];
}>();
</script>

<template>
  <LayoutLeftSidebar
    :channels="channels"
    :voice-channels="voiceChannels"
    :categories="categories"
    :active-channel-ids="activeChannelIds"
    :current-voice-id="currentVoiceId"
    :can-manage="canManage"
    :server-id="serverId"
    :server-name="serverName"
    :banner-url="bannerUrl"
    @select-channel="(ch, e) => $emit('select-channel', ch, e)"
    @edit-channel="(id) => $emit('edit-channel', id)"
    @edit-category="(id) => $emit('edit-category', id)"
    @open-server-switcher="(e) => $emit('open-server-switcher', e)"
    @open-server-menu="(e) => $emit('open-server-menu', e)"
    @create-channel="(opts) => $emit('create-channel', opts)"
    @open-user-settings="$emit('open-user-settings')"
  />

  <LayoutNookSidebar
    :sidebar="sidebar"
    :sections="rightSections"
    :server-id="serverId"
    @open-pinned="(ch, kind) => $emit('open-pinned', ch, kind)"
    @minimap-teleport="(x, y) => $emit('minimap-teleport', x, y)"
    @reorder-sections="(from, to) => $emit('reorder-sections', from, to)"
  />
</template>
