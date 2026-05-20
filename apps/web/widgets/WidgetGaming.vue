<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { Plus, Search, Users, MessageSquare, Pin, PinOff } from 'lucide-vue-next';
import { useHomePins } from '~/composables/useHomePins';
import { useGameTopicWindows } from '~/composables/useGameTopicWindows';
import { gradientFor, hashString } from '~/utils/color-hash';
import GameComposer from './GameComposer.vue';
import WidgetGamingTopic from './WidgetGamingTopic.vue';

const props = defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
}>();

const { store } = useChannels();
const homePins = useHomePins(computed(() => props.serverId));
const { resolveUrl } = useResolveUrl();

const games = computed(() => store.channels.filter((c) => c.parentId === props.channelId));

const search = ref('');
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return games.value;
  return games.value.filter((g) => g.name.toLowerCase().includes(q));
});

const showNew = ref(false);

function initialFor(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function toggleGamePin(game: ChannelPublic) {
  homePins.toggleChannel(game, 'game', props.channelName);
}

const topics = useGameTopicWindows();

function onGameCreated(game: ChannelPublic) {
  showNew.value = false;
  topics.open(game.id, game.name);
}
</script>

<template>
  <div class="gaming-widget">
    <div class="toolbar">
      <div class="search-box">
        <Search :size="13" class="search-icon" />
        <input v-model="search" type="text" placeholder="Rechercher un jeu…" class="search-input" />
      </div>
      <button class="add-btn" @click="showNew = true">
        <Plus :size="14" />
        Ajouter un jeu
      </button>
    </div>

    <div class="library">
      <GameComposer
        v-if="showNew"
        :server-id="serverId"
        :parent-channel-id="channelId"
        @created="onGameCreated"
        @cancel="showNew = false"
      />

      <div v-if="!filtered.length && !showNew" class="empty">
        <p v-if="!games.length" class="empty-title">Aucun jeu pour l'instant.</p>
        <p v-else class="empty-title">Aucun résultat pour « {{ search }} »</p>
        <p v-if="!games.length" class="empty-sub">
          Ajoute ton premier jeu pour ouvrir une discussion dédiée.
        </p>
      </div>

      <div class="grid">
        <div
          v-for="game in filtered"
          :key="game.id"
          class="game-card"
          role="button"
          tabindex="0"
          @click="topics.open(game.id, game.name)"
          @keydown.enter.prevent="topics.open(game.id, game.name)"
          @keydown.space.prevent="topics.open(game.id, game.name)"
        >
          <button
            class="pin-btn"
            :class="{ 'pin-btn--active': homePins.isPinned(game.id, 'game') }"
            :title="
              homePins.isPinned(game.id, 'game')
                ? `Retirer ${game.name} de l'accueil`
                : `Épingler ${game.name} sur l'accueil`
            "
            @click.stop="toggleGamePin(game)"
          >
            <component :is="homePins.isPinned(game.id, 'game') ? PinOff : Pin" :size="13" />
          </button>
          <div
            class="cover"
            :style="
              resolveUrl(game.iconUrl)
                ? { backgroundImage: `url(${resolveUrl(game.iconUrl)})` }
                : { background: gradientFor(game.id) }
            "
          >
            <div v-if="!resolveUrl(game.iconUrl)" class="initial">
              {{ initialFor(game.name) }}
            </div>
            <div class="cover-overlay" />
            <div class="online-badge">
              <span class="online-dot" />
              {{ hashString(game.id) % 7 }} en ligne
            </div>
          </div>
          <div class="meta">
            <p class="name">{{ game.name }}</p>
            <div class="stats">
              <span class="stat"> <MessageSquare :size="10" />{{ hashString(game.id) % 80 }} </span>
              <span class="stat"><Users :size="10" />{{ hashString(game.id) % 12 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <WidgetGamingTopic
      v-for="(t, i) in topics.openTopics.value"
      :key="t.channelId"
      :server-id="serverId"
      :channel-id="t.channelId"
      :channel-name="t.channelName"
      :initial-x="t.x"
      :initial-y="t.y"
      :z-index="80 + i"
      @close="topics.close(t.channelId)"
      @focus="topics.focus(t.channelId)"
      @drag-end="(x, y) => topics.updatePosition(t.channelId, x, y)"
    />
  </div>
</template>

<style scoped>
.gaming-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 12, 0.4);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.3);
}
.search-input {
  width: 100%;
  padding: 6px 10px 6px 28px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  outline: none;
  transition: border-color 120ms;
}
.search-input:focus {
  border-color: rgba(99, 102, 241, 0.45);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
  transition:
    transform 120ms,
    box-shadow 120ms;
}
.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
}

.library {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.empty {
  text-align: center;
  padding: 48px 16px;
}
.empty-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}
.empty-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  max-width: 240px;
  margin: 0 auto;
  line-height: 1.5;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.game-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition:
    transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 160ms,
    box-shadow 200ms;
}
.game-card:hover {
  transform: translateY(-3px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.2);
}

.pin-btn {
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.48);
  color: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 140ms,
    transform 140ms,
    background 140ms,
    color 140ms;
}

.game-card:hover .pin-btn,
.game-card:focus-within .pin-btn,
.pin-btn--active {
  opacity: 1;
  transform: translateY(0);
}

.pin-btn:hover,
.pin-btn--active {
  background: rgba(99, 102, 241, 0.82);
  color: white;
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.55) 100%);
}
.initial {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.online-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  z-index: 2;
}
.online-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.meta {
  padding: 8px 10px 10px;
}
.name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stats {
  display: flex;
  gap: 9px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
}
</style>
