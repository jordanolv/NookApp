<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { Plus, Search, Users, MessageSquare, Pin, PinOff } from 'lucide-vue-next';
import { useHomePins } from '~/composables/useHomePins';
import WidgetGamingTopic from './WidgetGamingTopic.vue';

const props = defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
}>();

const { store, createChannel } = useChannels();
const homePins = useHomePins(computed(() => props.serverId));

const games = computed(() => store.channels.filter((c) => c.parentId === props.channelId));

const search = ref('');
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return games.value;
  return games.value.filter((g) => g.name.toLowerCase().includes(q));
});

const newName = ref('');
const creating = ref(false);
const showNew = ref(false);

async function submitGame() {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const game = await createChannel(props.serverId, {
      name,
      type: 'text',
      parentId: props.channelId,
    });
    newName.value = '';
    showNew.value = false;
    openGame(game.id, name);
  } finally {
    creating.value = false;
  }
}

const COVER_GRADIENTS = [
  ['#1e3a8a', '#7c3aed'],
  ['#831843', '#be185d'],
  ['#064e3b', '#10b981'],
  ['#7c2d12', '#ea580c'],
  ['#1e293b', '#0ea5e9'],
  ['#581c87', '#ec4899'],
  ['#365314', '#84cc16'],
  ['#7f1d1d', '#f59e0b'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function gradientFor(id: string) {
  const [a, b] = COVER_GRADIENTS[hash(id) % COVER_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}
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

// Topic windows opened from this widget
interface GameWin {
  channelId: string;
  channelName: string;
  x: number;
  y: number;
}
const openTopics = ref<GameWin[]>([]);
let topicCounter = 0;

function openGame(channelId: string, channelName: string) {
  const existing = openTopics.value.find((t) => t.channelId === channelId);
  if (existing) {
    focusTopic(channelId);
    return;
  }
  const stagger = (topicCounter % 6) * 28;
  const x = import.meta.client ? Math.round(window.innerWidth / 2 - 380) + stagger : 200;
  const y = import.meta.client ? Math.round(window.innerHeight / 2 - 300) + stagger : 100;
  topicCounter++;
  openTopics.value = [...openTopics.value, { channelId, channelName, x, y }];
}
function closeTopic(channelId: string) {
  openTopics.value = openTopics.value.filter((t) => t.channelId !== channelId);
}
function focusTopic(channelId: string) {
  const t = openTopics.value.find((x) => x.channelId === channelId);
  if (!t) return;
  openTopics.value = [...openTopics.value.filter((x) => x.channelId !== channelId), t];
}
</script>

<template>
  <div class="gaming-widget">
    <!-- Toolbar -->
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

    <!-- Library -->
    <div class="library">
      <!-- New game composer -->
      <div v-if="showNew" class="composer">
        <div class="composer-cover">
          <Plus :size="22" />
        </div>
        <div class="composer-body">
          <input
            v-model="newName"
            type="text"
            class="composer-input"
            placeholder="Nom du jeu (ex: Valorant, Rocket League…)"
            maxlength="80"
            autofocus
            @keydown.enter="submitGame"
            @keydown.esc="
              showNew = false;
              newName = '';
            "
          />
          <div class="composer-actions">
            <button
              class="composer-btn solid"
              :class="{ disabled: creating || !newName.trim() }"
              @click="submitGame"
            >
              {{ creating ? '…' : 'Ajouter' }}
            </button>
            <button
              class="composer-btn ghost"
              @click="
                showNew = false;
                newName = '';
              "
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

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
          @click="openGame(game.id, game.name)"
          @keydown.enter.prevent="openGame(game.id, game.name)"
          @keydown.space.prevent="openGame(game.id, game.name)"
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
              game.iconUrl
                ? { backgroundImage: `url(${game.iconUrl})` }
                : { background: gradientFor(game.id) }
            "
          >
            <div v-if="!game.iconUrl" class="initial">
              {{ initialFor(game.name) }}
            </div>
            <div class="cover-overlay" />
            <div class="online-badge">
              <span class="online-dot" />
              {{ hash(game.id) % 7 }} en ligne
            </div>
          </div>
          <div class="meta">
            <p class="name">{{ game.name }}</p>
            <div class="stats">
              <span class="stat"><MessageSquare :size="10" />{{ hash(game.id) % 80 }}</span>
              <span class="stat"><Users :size="10" />{{ hash(game.id) % 12 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Topic windows (one per opened game) -->
    <WidgetGamingTopic
      v-for="(t, i) in openTopics"
      :key="t.channelId"
      :server-id="serverId"
      :channel-id="t.channelId"
      :channel-name="t.channelName"
      :initial-x="t.x"
      :initial-y="t.y"
      :z-index="80 + i"
      @close="closeTopic(t.channelId)"
      @focus="focusTopic(t.channelId)"
      @drag-end="
        (x, y) => {
          t.x = x;
          t.y = y;
        }
      "
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

.composer {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed rgba(99, 102, 241, 0.4);
  margin-bottom: 14px;
}
.composer-cover {
  width: 80px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
}
.composer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.composer-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}
.composer-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
}
.composer-actions {
  display: flex;
  gap: 6px;
}
.composer-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 120ms;
}
.composer-btn.solid {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}
.composer-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}
.composer-btn.disabled {
  opacity: 0.4;
  pointer-events: none;
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
