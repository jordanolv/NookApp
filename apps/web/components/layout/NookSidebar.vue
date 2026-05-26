<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import type { useSidebar } from '~/composables/useSidebar';
import type { HomePinKind } from '~/composables/useHomePins';

type Sidebar = ReturnType<typeof useSidebar>;

interface SidebarSectionDef {
  key: string;
  label: string;
  icon: Component;
  mode?: 'panel' | 'toggle';
  active?: boolean;
  onToggle?: () => void;
}

const props = defineProps<{
  sidebar: Sidebar;
  sections: SidebarSectionDef[];
  serverId: string;
}>();

const emit = defineEmits<{
  'open-pinned': [channel: ChannelPublic, kind: HomePinKind];
  'minimap-teleport': [x: number, y: number];
  'reorder-sections': [fromKey: string, toKey: string];
}>();

const { user } = useAuth();
const { store } = useServers();
const { currentMap } = useMap();
const voice = useVoice();
const presence = usePresence();

const voiceChannels = computed(() =>
  store.channels.filter((c) => c.type === 'voice' && c.serverId === props.serverId),
);

const detachedKeys = computed(() => new Set(props.sidebar.detached.value.map((w) => w.sectionKey)));

function onToggleSection(key: string) {
  const section = props.sections.find((s) => s.key === key);
  if (section?.mode === 'toggle') {
    section.onToggle?.();
    return;
  }
  props.sidebar.toggleSection(key);
}
</script>

<template>
  <LayoutSideBar
    :sections="sections"
    :active-keys="sidebar.activeSet.value"
    :detached-keys="detachedKeys"
    :section-heights="sidebar.sectionHeights.value"
    @toggle-section="onToggleSection"
    @set-section-height="sidebar.setSectionHeight"
    @detach-section="(key, x, y) => sidebar.detachSection(key, { initialX: x, initialY: y })"
    @reorder-sections="(from, to) => emit('reorder-sections', from, to)"
  >
    <template #members><HomeMembersList :server-id="serverId" /></template>
    <template #pinned>
      <HomePinsList :server-id="serverId" @open="(ch, kind) => emit('open-pinned', ch, kind)" />
    </template>
    <template #map>
      <div class="minimap-host">
        <div class="minimap-square">
          <WorldMinimap
            embedded
            :map-data="currentMap"
            :voice-channels="voiceChannels"
            :players="presence.players.value"
            :voice-members="presence.voiceMembers.value"
            :current-user-id="user?.id ?? null"
            :current-user-name="user?.name ?? null"
            :current-voice-channel-id="voice.currentChannelId.value"
            @teleport-to="(x, y) => emit('minimap-teleport', x, y)"
          />
        </div>
      </div>
    </template>
  </LayoutSideBar>
</template>

<style scoped>
.minimap-host {
  padding: 12px;
  min-width: 0;
}
.minimap-square {
  width: 100%;
  aspect-ratio: 1;
}
</style>
