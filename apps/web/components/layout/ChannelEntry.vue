<script setup lang="ts">
import { computed } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import ChannelCard from './ChannelCard.vue';
import { usePlayingGames } from '~/composables/usePlayingGames';

const props = defineProps<{
  channel: ChannelPublic;
  children: ChannelPublic[];
  activeIds: Set<string>;
  forumExpanded: boolean;
}>();

const emit = defineEmits<{
  select: [channel: ChannelPublic, event: MouseEvent | KeyboardEvent];
  contextmenu: [channel: ChannelPublic, event: MouseEvent];
  'toggle-forum': [];
}>();

const playing = usePlayingGames(computed(() => props.channel.serverId));
const playedGames = computed(() =>
  props.channel.type === 'widget' ? props.children.filter((c) => playing.isPlaying(c.id)) : [],
);

function onMainClick(e: MouseEvent | KeyboardEvent) {
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
    <div v-for="child in children" :key="child.id" class="thread">
      <ChannelCard
        :channel="child"
        :active="activeIds.has(child.id)"
        is-child
        @click="emit('select', child, $event)"
        @contextmenu="emit('contextmenu', child, $event)"
      />
    </div>
    <div v-if="!children.length" class="card--child-empty">Aucun fil</div>
  </template>
  <div v-for="game in playedGames" :key="game.id" class="thread">
    <ChannelCard
      :channel="game"
      :active="activeIds.has(game.id)"
      is-child
      @click="emit('select', game, $event)"
      @contextmenu="emit('contextmenu', game, $event)"
    />
  </div>
</template>

<style scoped>
/* Elbow connector from the parent channel into the child indent */
.thread {
  position: relative;
}
.thread::before {
  content: '';
  position: absolute;
  left: 11px;
  top: -6px;
  bottom: 50%;
  width: 10px;
  border-left: 2px solid var(--surface-divider);
  border-bottom: 2px solid var(--surface-divider);
  border-bottom-left-radius: 8px;
  pointer-events: none;
}

.card--child-empty {
  padding: 6px 8px 6px 28px;
  font-size: 10px;
  font-style: italic;
  color: var(--ink-faint);
  background: var(--surface-tinted);
}
</style>
