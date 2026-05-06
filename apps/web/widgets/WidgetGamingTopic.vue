<script setup lang="ts">
import { MessageSquare, Users, Trophy, Settings, Search, Zap, Clock, X } from 'lucide-vue-next';

const props = defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
  initialX?: number | null;
  initialY?: number | null;
  zIndex?: number;
}>();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-end': [x: number, y: number];
}>();

const tabs = [
  { id: 'discussion', label: 'Discussion', icon: MessageSquare },
  { id: 'squad', label: 'Squad', icon: Users },
  { id: 'highlights', label: 'Highlights', icon: Trophy },
] as const;
type TabId = (typeof tabs)[number]['id'];

const activeTab = ref<TabId>('discussion');

// Cover gradient (deterministic by channel id)
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
const banner = computed(() => {
  const [a, b] = COVER_GRADIENTS[hash(props.channelId) % COVER_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
});

// Squad finder mock state
const queueActive = ref(false);
const queueElapsed = ref(0);
let queueTimer: ReturnType<typeof setInterval> | null = null;

function toggleQueue() {
  queueActive.value = !queueActive.value;
  if (queueActive.value) {
    queueElapsed.value = 0;
    queueTimer = setInterval(() => queueElapsed.value++, 1000);
  } else if (queueTimer) {
    clearInterval(queueTimer);
    queueTimer = null;
  }
}
onUnmounted(() => {
  if (queueTimer) clearInterval(queueTimer);
});
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

const squadCriteria = ref({
  mode: 'ranked',
  level: 'any',
  voice: true,
});
const modes = ['casual', 'ranked', 'pro'];
const levels = ['any', 'bronze', 'silver', 'gold', 'platinum'];

// Placeholder LFG announcements
const lfgPosts = computed(() => [
  { id: '1', author: 'Mira', text: 'LFG ranked, gold+, EU', time: 'il y a 2 min', tag: 'ranked' },
  {
    id: '2',
    author: 'Kael',
    text: 'Cherche duo casual chill',
    time: 'il y a 8 min',
    tag: 'casual',
  },
  {
    id: '3',
    author: 'Zyn',
    text: 'Squad complète manquant 1 IGL',
    time: 'il y a 14 min',
    tag: 'pro',
  },
]);
</script>

<template>
  <UiFloatingWindow
    :title="channelName"
    :initial-width="780"
    :initial-height="620"
    :min-width="520"
    :min-height="420"
    :initial-x="initialX ?? null"
    :initial-y="initialY ?? null"
    :z-index="zIndex ?? 80"
    :close-on-escape="false"
    @close="emit('close')"
    @focus="emit('focus')"
    @drag-end="(x, y) => emit('drag-end', x, y)"
  >
    <div class="topic">
      <!-- Banner -->
      <div class="banner" :style="{ background: banner }">
        <div class="banner-overlay" />
        <div class="banner-content">
          <p class="game-title">{{ channelName }}</p>
          <div class="game-pills">
            <span class="pill"><span class="pill-dot" /> 3 joueurs en ligne</span>
            <span class="pill">42 messages</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="tab"
          :class="{ 'tab--active': activeTab === t.id }"
          @click="activeTab = t.id"
        >
          <component :is="t.icon" :size="14" />
          {{ t.label }}
        </button>
        <div class="tabs-spacer" />
        <button class="tab tab--icon" :title="`Paramètres de ${channelName}`">
          <Settings :size="14" />
        </button>
      </div>

      <!-- Tab content -->
      <div class="tab-body">
        <!-- Discussion: embed real ChatPane -->
        <div v-show="activeTab === 'discussion'" class="discussion">
          <ChatPane :channel-id="channelId" />
        </div>

        <!-- Squad finder -->
        <div v-show="activeTab === 'squad'" class="squad">
          <div class="squad-cta">
            <div class="cta-left">
              <p class="cta-title">Recherche de mate</p>
              <p class="cta-sub">Lance une queue ou parcours les annonces actives.</p>
            </div>
            <button
              class="cta-btn"
              :class="{ 'cta-btn--active': queueActive }"
              @click="toggleQueue"
            >
              <component :is="queueActive ? X : Zap" :size="14" />
              {{ queueActive ? `En queue · ${fmtTime(queueElapsed)}` : 'Lancer une queue' }}
            </button>
          </div>

          <div class="squad-criteria">
            <p class="section-label">Critères</p>
            <div class="criteria-row">
              <span class="criteria-label">Mode</span>
              <div class="chip-group">
                <button
                  v-for="m in modes"
                  :key="m"
                  class="chip"
                  :class="{ 'chip--active': squadCriteria.mode === m }"
                  @click="squadCriteria.mode = m"
                >
                  {{ m }}
                </button>
              </div>
            </div>
            <div class="criteria-row">
              <span class="criteria-label">Niveau</span>
              <div class="chip-group">
                <button
                  v-for="l in levels"
                  :key="l"
                  class="chip"
                  :class="{ 'chip--active': squadCriteria.level === l }"
                  @click="squadCriteria.level = l"
                >
                  {{ l }}
                </button>
              </div>
            </div>
            <div class="criteria-row">
              <span class="criteria-label">Vocal</span>
              <button
                class="toggle"
                :class="{ 'toggle--on': squadCriteria.voice }"
                @click="squadCriteria.voice = !squadCriteria.voice"
              >
                <span class="toggle-knob" />
              </button>
            </div>
          </div>

          <div class="squad-feed">
            <div class="feed-head">
              <Search :size="13" />
              <p class="section-label" style="margin: 0">Annonces ({{ lfgPosts.length }})</p>
            </div>
            <div v-for="post in lfgPosts" :key="post.id" class="lfg-card">
              <div class="lfg-avatar">{{ post.author[0] }}</div>
              <div class="lfg-body">
                <div class="lfg-head">
                  <span class="lfg-author">{{ post.author }}</span>
                  <span class="lfg-tag" :data-tag="post.tag">{{ post.tag }}</span>
                  <span class="lfg-time">
                    <Clock :size="9" />
                    {{ post.time }}
                  </span>
                </div>
                <p class="lfg-text">{{ post.text }}</p>
              </div>
              <button class="lfg-join">Join</button>
            </div>
          </div>
        </div>

        <!-- Highlights -->
        <div v-show="activeTab === 'highlights'" class="highlights">
          <div class="hl-empty">
            <Trophy :size="36" />
            <p class="hl-title">Pas de highlight encore</p>
            <p class="hl-sub">Bientôt : poste tes clips, screens et best moments du jeu.</p>
          </div>
        </div>
      </div>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.topic {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(8, 8, 12, 0.6);
}

/* Banner */
.banner {
  position: relative;
  height: 110px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.7) 100%);
}
.banner-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px 18px;
}
.game-title {
  font-size: 22px;
  font-weight: 800;
  color: white;
  margin-bottom: 6px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: -0.5px;
}
.game-pills {
  display: flex;
  gap: 6px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pill-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
}

/* Tabs */
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 14px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition:
    color 120ms,
    border-color 120ms;
}
.tab:hover {
  color: rgba(255, 255, 255, 0.7);
}
.tab--active {
  color: rgba(199, 210, 254, 1);
  border-bottom-color: rgb(99, 102, 241);
}
.tab--icon {
  padding: 10px;
}
.tabs-spacer {
  flex: 1;
}

/* Tab body */
.tab-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.discussion {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Squad */
.squad {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.squad-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 12px;
}
.cta-left {
  flex: 1;
}
.cta-title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 3px;
}
.cta-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.4);
  transition:
    transform 120ms,
    box-shadow 120ms;
}
.cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.55);
}
.cta-btn--active {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 2px 12px rgba(239, 68, 68, 0.4);
  animation: queue-pulse 1.4s ease-in-out infinite;
}
@keyframes queue-pulse {
  0%,
  100% {
    box-shadow: 0 2px 12px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 2px 24px rgba(239, 68, 68, 0.7);
  }
}

.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 8px;
}

.squad-criteria {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.criteria-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.criteria-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  min-width: 60px;
}
.chip-group {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.chip {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  text-transform: capitalize;
  transition: all 120ms;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.8);
}
.chip--active {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  color: rgb(199, 210, 254);
}
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 160ms;
}
.toggle--on {
  background: rgba(99, 102, 241, 0.6);
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.toggle--on .toggle-knob {
  transform: translateX(16px);
}

.squad-feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feed-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 4px;
}
.lfg-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: background 120ms;
}
.lfg-card:hover {
  background: rgba(255, 255, 255, 0.05);
}
.lfg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.lfg-body {
  flex: 1;
  min-width: 0;
}
.lfg-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
}
.lfg-author {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}
.lfg-tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.18);
  color: rgb(165, 180, 252);
}
.lfg-tag[data-tag='casual'] {
  background: rgba(34, 197, 94, 0.18);
  color: rgb(134, 239, 172);
}
.lfg-tag[data-tag='pro'] {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(252, 165, 165);
}
.lfg-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin-left: auto;
}
.lfg-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.lfg-join {
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.18);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: rgb(199, 210, 254);
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 120ms;
}
.lfg-join:hover {
  background: rgba(99, 102, 241, 0.3);
}

/* Highlights */
.highlights {
  height: 100%;
}
.hl-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.3);
}
.hl-title {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
}
.hl-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  max-width: 240px;
  text-align: center;
  line-height: 1.5;
}
</style>
