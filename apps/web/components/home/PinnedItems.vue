<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { Gamepad2, MessageSquare, Pin, PinOff } from 'lucide-vue-next';
import { useHomePins, type HomePin, type HomePinKind } from '~/composables/useHomePins';

const props = defineProps<{
  serverId: string;
  railSide: 'left' | 'right';
  railWidth: number;
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

const minPanelHeight = computed(() => {
  const visibleRows = Math.min(Math.max(pinnedItems.value.length, 1), 3);
  return 48 + visibleRows * 44;
});

const initialX = computed(() => {
  const offset = props.railWidth + 28;
  return props.railSide === 'left' ? offset : 16;
});

function subtitle(pin: HomePin, channel: ChannelPublic): string {
  if (pin.kind === 'game') return pin.parentName ? `Jeu · ${pin.parentName}` : 'Jeu';
  if (channel.type === 'widget') return 'Widget';
  if (channel.type === 'forum') return 'Forum';
  if (channel.type === 'voice') return 'Vocal';
  return 'Channel';
}
</script>

<template>
  <UiFloatingWindow
    v-if="pinnedItems.length"
    title="Épinglés"
    :initial-width="268"
    :initial-height="248"
    :initial-x="initialX"
    :initial-y="16"
    :min-width="220"
    :min-height="minPanelHeight"
    :max-width="420"
    :max-height="520"
    :z-index="35"
    :close-on-escape="false"
    :show-close="false"
    surface="rail"
    :persist-key="`home-pins-panel:${serverId}`"
  >
    <template #header-actions>
      <div class="home-pins__header-actions">
        <Pin :size="13" />
        <span class="home-pins__count">{{ pinnedItems.length }}</span>
      </div>
    </template>

    <div class="home-pins__list">
      <div v-for="{ pin, channel } in pinnedItems" :key="pin.key" class="home-pin">
        <button class="home-pin__main" @click="emit('open', channel, pin.kind)">
          <span class="home-pin__icon">
            <Gamepad2 v-if="pin.kind === 'game'" :size="15" />
            <ChannelIconDisplay
              v-else
              :icon-url="channel.iconUrl"
              :type="channel.type"
              :size="15"
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
  </UiFloatingWindow>
</template>

<style scoped>
.home-pins__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, 0.42);
}

.home-pins__list {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 2px;
  overflow-y: auto;
  padding: 5px;
}

.home-pins__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
  font-weight: 800;
}

.home-pin {
  display: flex;
  align-items: stretch;
  min-height: 40px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid transparent;
  transition:
    background 140ms,
    border-color 140ms;
}

.home-pin:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.07);
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
  background: rgba(99, 102, 241, 0.13);
  color: rgba(199, 210, 254, 0.95);
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
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  font-weight: 750;
}

.home-pin__sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 10px;
  font-weight: 650;
}

.home-pin__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
  transition:
    color 140ms,
    background 140ms;
}

.home-pin__remove:hover {
  background: rgba(248, 113, 113, 0.12);
  color: rgb(248, 113, 113);
}
</style>
