<script setup lang="ts">
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';

defineProps<{
  serverId: string;
  serverName?: string | null;
  showSettings: boolean;
  showPlugins: boolean;
  editingChannel: ChannelPublic | null;
  editingCategory: CategoryPublic | null;
}>();

defineEmits<{
  'update:showSettings': [v: boolean];
  'update:showPlugins': [v: boolean];
  'update:editingChannel': [v: ChannelPublic | null];
  'update:editingCategory': [v: CategoryPublic | null];
}>();
</script>

<template>
  <ServerSettingsModal
    v-if="showSettings"
    :server-id="serverId"
    :server-name="serverName"
    @close="$emit('update:showSettings', false)"
  />

  <ServerPluginsModal
    v-if="showPlugins"
    :server-id="serverId"
    :server-name="serverName"
    @close="$emit('update:showPlugins', false)"
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
