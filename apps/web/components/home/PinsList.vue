<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { MessageSquare, PinOff } from 'lucide-vue-next';
import { useHomePins, type HomePin, type HomePinKind } from '~/composables/useHomePins';

const props = defineProps<{
  serverId: string;
}>();

const emit = defineEmits<{
  open: [channel: ChannelPublic, kind: HomePinKind];
}>();

const { store } = useChannels();
const homePins = useHomePins(computed(() => props.serverId));

const pinnedItems = computed(() =>
  homePins.pins.value
    .map((pin) => {
      const channel = store.channels.find((c) => c.id === pin.channelId);
      return channel ? { pin, channel } : null;
    })
    .filter((item): item is { pin: HomePin; channel: ChannelPublic } => item !== null),
);

function subtitle(pin: HomePin, channel: ChannelPublic): string {
  if (pin.kind === 'game') return pin.parentName ? `Jeu · ${pin.parentName}` : 'Jeu';
  if (channel.type === 'widget') return 'Widget';
  if (channel.type === 'forum') return 'Forum';
  if (channel.type === 'voice') return 'Vocal';
  return 'Channel';
}

function hasImageIcon(url: string | null | undefined) {
  return !!url && url.startsWith('/');
}
</script>

<template>
  <div v-if="pinnedItems.length" class="home-pins__list">
    <div v-for="{ pin, channel } in pinnedItems" :key="pin.key" class="home-pin">
      <button class="home-pin__main" @click="emit('open', channel, pin.kind)">
        <span
          class="home-pin__icon"
          :class="{ 'home-pin__icon--image': hasImageIcon(channel.iconUrl) }"
        >
          <ChannelIconDisplay
            :icon-url="channel.iconUrl"
            :type="pin.kind === 'game' ? 'game' : channel.type"
            :size="hasImageIcon(channel.iconUrl) ? 26 : 15"
          />
        </span>
        <span class="home-pin__copy">
          <span class="home-pin__name">{{ channel.name }}</span>
          <span class="home-pin__sub">
            <MessageSquare v-if="pin.kind === 'game' || channel.type === 'text'" :size="10" />
            {{ subtitle(pin, channel) }}
          </span>
        </span>
      </button>
      <button
        class="home-pin__remove"
        title="Retirer de l'accueil"
        @click="homePins.unpin(channel.id, pin.kind)"
      >
        <PinOff :size="13" />
      </button>
    </div>
  </div>
  <div v-else class="home-pins__empty">Aucun épinglé</div>
</template>

<style scoped>
.home-pins__list {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 2px;
  overflow-y: auto;
  padding: 5px;
}

.home-pins__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px 12px;
  color: var(--ink-faint);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.home-pin {
  display: flex;
  align-items: stretch;
  min-height: 40px;
  border-radius: 9px;
  background: var(--surface-tinted);
  border: 1px solid transparent;
  transition:
    background 140ms,
    border-color 140ms;
}

.home-pin:hover {
  background: var(--surface-tinted-strong);
  border-color: var(--surface-border);
}

.home-pin__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 7px 7px 7px 9px;
  text-align: left;
}

.home-pin__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--accent-violet-soft);
  color: var(--accent-violet);
  overflow: hidden;
}
.home-pin__icon--image {
  background: transparent;
}

.home-pin__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.home-pin__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  font-size: 12px;
  font-weight: 750;
}

.home-pin__sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 650;
}

.home-pin__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  flex-shrink: 0;
  color: var(--ink-faint);
  transition:
    color 140ms,
    background 140ms;
}

.home-pin__remove:hover {
  background: var(--accent-rose-soft);
  color: var(--accent-rose);
}
</style>
