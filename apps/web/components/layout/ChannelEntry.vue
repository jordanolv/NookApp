<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import ChannelCard from './ChannelCard.vue';

const props = defineProps<{
  channel: ChannelPublic;
  children: ChannelPublic[];
  activeIds: Set<string>;
  forumExpanded: boolean;
}>();

const emit = defineEmits<{
  select: [channel: ChannelPublic, event: MouseEvent];
  contextmenu: [channel: ChannelPublic, event: MouseEvent];
  'toggle-forum': [];
}>();

function onMainClick(e: MouseEvent) {
  if (props.channel.type === 'forum') emit('toggle-forum');
  else emit('select', props.channel, e);
}
</script>

<template>
  <ChannelCard
    :channel="channel"
    :active="activeIds.has(channel.id)"
    :forum-open="forumExpanded"
    @click="onMainClick"
    @contextmenu="emit('contextmenu', channel, $event)"
  />
  <template v-if="channel.type === 'forum' && forumExpanded">
    <ChannelCard
      v-for="child in children"
      :key="child.id"
      :channel="child"
      :active="activeIds.has(child.id)"
      is-child
      @click="emit('select', child, $event)"
      @contextmenu="emit('contextmenu', child, $event)"
    />
    <div v-if="!children.length" class="card--child-empty">Aucun fil</div>
  </template>
</template>

<style scoped>
.card--child-empty {
  padding: 6px 8px 6px 28px;
  font-size: 10px;
  font-style: italic;
  color: var(--ink-faint);
  background: var(--surface-tinted);
}
</style>
