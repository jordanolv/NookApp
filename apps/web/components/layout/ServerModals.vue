<script setup lang="ts">
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';

defineProps<{
  serverId: string;
  serverName?: string | null;
  showSettings: boolean;
  showCreate: boolean;
  editingChannel: ChannelPublic | null;
  editingCategory: CategoryPublic | null;
}>();

defineEmits<{
  'update:showSettings': [v: boolean];
  'update:showCreate': [v: boolean];
  'update:editingChannel': [v: ChannelPublic | null];
  'update:editingCategory': [v: CategoryPublic | null];
  'channel-created': [channelId: string, type: string];
}>();
</script>

<template>
  <ServerSettingsModal
    v-if="showSettings"
    :server-id="serverId"
    :server-name="serverName"
    @close="$emit('update:showSettings', false)"
  />

  <ChannelCreateChannelModal
    v-if="showCreate"
    :server-id="serverId"
    @close="$emit('update:showCreate', false)"
    @created="(id, type) => $emit('channel-created', id, type)"
  />

  <ChannelEditChannelModal
    v-if="editingChannel"
    :server-id="serverId"
    :channel="editingChannel"
    @close="$emit('update:editingChannel', null)"
    @updated="$emit('update:editingChannel', null)"
  />

  <ChannelEditCategoryModal
    v-if="editingCategory"
    :server-id="serverId"
    :category="editingCategory"
    @close="$emit('update:editingCategory', null)"
    @updated="$emit('update:editingCategory', null)"
  />
</template>
