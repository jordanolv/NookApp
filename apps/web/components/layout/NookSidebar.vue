<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import type { useSidebar } from '~/composables/useSidebar';
import type { HomePinKind } from '~/composables/useHomePins';

type Sidebar = ReturnType<typeof useSidebar>;

interface SidebarSectionDef {
  key: string;
  label: string;
  icon: Component;
}

const props = defineProps<{
  side: 'left' | 'right';
  sidebar: Sidebar;
  sections: SidebarSectionDef[];
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
  serverId: string;
  serverName: string;
  bannerUrl: string | null;
  alwaysShow?: boolean;
}>();

const emit = defineEmits<{
  'select-channel': [channel: ChannelPublic, e: MouseEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
  'open-server-switcher': [e: MouseEvent];
  'open-server-menu': [e: MouseEvent];
  'create-channel': [];
  'open-pinned': [channel: ChannelPublic, kind: HomePinKind];
}>();

const otherSide = computed<'left' | 'right'>(() => (props.side === 'left' ? 'right' : 'left'));
const keys = computed(() =>
  props.side === 'left' ? props.sidebar.leftKeys.value : props.sidebar.rightKeys.value,
);
const otherKeys = computed(() =>
  props.side === 'left' ? props.sidebar.rightKeys.value : props.sidebar.leftKeys.value,
);
const visible = computed(
  () =>
    keys.value.length > 0 ||
    props.sidebar.serverHeaderSide.value === props.side ||
    props.sidebar.userDockSide.value === props.side ||
    !!props.alwaysShow,
);
</script>

<template>
  <LayoutSideBar
    v-if="visible"
    :side="side"
    :sections="sections"
    :keys="keys"
    :active-keys="sidebar.activeSet.value"
    :section-heights="sidebar.sectionHeights.value"
    :server-name="serverName"
    :banner-url="bannerUrl"
    :always-show="alwaysShow"
    :show-server-header="sidebar.serverHeaderSide.value === side"
    :show-user-dock="sidebar.userDockSide.value === side"
    :other-side-has-sections="otherKeys.length > 0"
    @toggle-section="sidebar.toggleSection"
    @toggle-key="(key) => sidebar.setSectionSide(key, otherSide)"
    @toggle-server-header="sidebar.setServerHeaderSide(otherSide)"
    @toggle-user-dock="sidebar.setUserDockSide(otherSide)"
    @set-section-height="sidebar.setSectionHeight"
    @open-server-switcher="(e) => emit('open-server-switcher', e)"
    @open-server-menu="(e) => emit('open-server-menu', e)"
  >
    <template #user-dock><LayoutUserDock /></template>

    <template #channels-action>
      <button
        type="button"
        class="section__close"
        title="Créer un channel"
        @click="emit('create-channel')"
      >
        +
      </button>
    </template>

    <template #channels>
      <LayoutChannelsList
        :channels="channels"
        :categories="categories"
        :active-channel-ids="activeChannelIds"
        :current-voice-id="currentVoiceId"
        :can-manage="canManage"
        @select="(ch, e) => emit('select-channel', ch, e)"
        @edit-channel="(id) => emit('edit-channel', id)"
        @edit-category="(id) => emit('edit-category', id)"
      />
    </template>

    <template #members><HomeMembersList :server-id="serverId" /></template>

    <template #pinned>
      <HomePinsList :server-id="serverId" @open="(ch, kind) => emit('open-pinned', ch, kind)" />
    </template>
  </LayoutSideBar>
</template>
