<script setup lang="ts">
import {
  Hash,
  MessageSquare,
  Volume2,
  Sparkles,
  Pencil,
  Users,
  Pin,
  ChevronRight,
} from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';
import { useHomePins } from '~/composables/useHomePins';

const props = defineProps<{
  serverId: string;
}>();

const emit = defineEmits<{
  'open-channel': [channelId: string];
}>();

const { store } = useServers();
const { user } = useAuth();
const voice = useVoice();
const messagesStore = useMessagesStore();
const homePins = useHomePins(computed(() => props.serverId));

const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;
function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${apiOrigin}${url}` : url;
}

const bannerUrl = computed(() => resolveUrl(store.current?.bannerUrl) ?? null);
const iconUrl = computed(() => resolveUrl(store.current?.iconUrl) ?? null);

const onlineCount = computed(() =>
  Array.from(voice.voicePresence.value.values()).reduce((sum, list) => sum + list.length, 0),
);

const allChannels = computed(() => store.channels.filter((c) => c.serverId === props.serverId));

const textChannels = computed(() =>
  allChannels.value
    .filter((c) => c.type === 'text' && !c.parentId)
    .sort(
      (a, b) =>
        (messagesStore.countFor(b.id) ?? 0) - (messagesStore.countFor(a.id) ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5),
);

const voiceChannels = computed(() =>
  allChannels.value.filter((c) => c.type === 'voice' && !c.parentId),
);

const liveVoiceChannels = computed(() =>
  voiceChannels.value
    .map((c) => ({ ch: c, members: voice.voicePresence.value.get(c.id) ?? [] }))
    .sort((a, b) => b.members.length - a.members.length),
);

const forumChannels = computed(() =>
  allChannels.value.filter((c) => c.type === 'forum' && !c.parentId),
);

function forumThreadCount(channelId: string): number {
  return allChannels.value.filter((c) => c.parentId === channelId).length;
}

const pinnedChannels = computed<ChannelPublic[]>(() => {
  const ids = homePins.pins.value.filter((p) => p.kind === 'channel').map((p) => p.channelId);
  const byId = new Map(allChannels.value.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is ChannelPublic => !!c);
});

function lastSnippet(channelId: string): string | null {
  const msgs = messagesStore.forChannel(channelId);
  const last = msgs[msgs.length - 1];
  if (!last) return null;
  const author = last.authorId === user.value?.id ? 'toi' : last.authorId.slice(0, 6);
  const text = last.content.replace(/\s+/g, ' ').slice(0, 64);
  return `${author}: ${text}${last.content.length > 64 ? '…' : ''}`;
}

function open(channelId: string) {
  emit('open-channel', channelId);
}
</script>

<template>
  <div class="home">
    <header class="banner">
      <div class="banner__media">
        <img v-if="bannerUrl" :src="bannerUrl" :alt="store.current?.name ?? ''" />
        <div v-else class="banner__media-fallback">
          <Sparkles :size="28" :stroke-width="1.5" />
        </div>
      </div>
      <div class="banner__overlay" />
      <div class="banner__content">
        <div class="banner__row">
          <div class="banner__icon">
            <img v-if="iconUrl" :src="iconUrl" :alt="store.current?.name ?? ''" />
            <span v-else>{{ store.current?.name?.[0]?.toUpperCase() ?? '?' }}</span>
          </div>
          <div class="banner__title">
            <h1>{{ store.current?.name ?? 'Server' }}</h1>
            <p class="banner__stats">
              <span class="banner__stat">
                <span class="banner__stat-dot banner__stat-dot--green" />
                {{ onlineCount }} en ligne
              </span>
              <span class="banner__stat-sep">·</span>
              <span class="banner__stat">
                <Users :size="11" :stroke-width="2.2" />
                {{ allChannels.length }} canaux
              </span>
            </p>
          </div>
          <button
            class="banner__edit"
            type="button"
            disabled
            title="Bientôt — personnaliser ta home"
          >
            <Pencil :size="13" :stroke-width="2" />
            <span>Personnaliser</span>
          </button>
        </div>
      </div>
    </header>

    <section class="grid">
      <div class="grid__col grid__col--main">
        <ClassicHomeCard :icon="Hash" title="Salons actifs" :count="textChannels.length">
          <ul v-if="textChannels.length" class="list">
            <li v-for="ch in textChannels" :key="ch.id" class="row" @click="open(ch.id)">
              <span class="row__hash">#</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
                <p class="row__meta">
                  <span v-if="lastSnippet(ch.id)" class="row__snippet">
                    {{ lastSnippet(ch.id) }}
                  </span>
                  <span v-else class="row__snippet row__snippet--muted">Aucun message</span>
                </p>
              </div>
              <span class="row__count">{{ messagesStore.countFor(ch.id) ?? 0 }}</span>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
          <p v-else class="empty">Aucun salon texte pour l'instant.</p>
        </ClassicHomeCard>

        <ClassicHomeCard
          v-if="forumChannels.length"
          :icon="MessageSquare"
          title="Forums"
          :count="forumChannels.length"
        >
          <ul class="list">
            <li v-for="ch in forumChannels" :key="ch.id" class="row" @click="open(ch.id)">
              <span class="row__hash">::</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
                <p class="row__meta">
                  <span class="row__snippet">
                    {{ forumThreadCount(ch.id) }} thread{{ forumThreadCount(ch.id) > 1 ? 's' : '' }}
                  </span>
                </p>
              </div>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
        </ClassicHomeCard>
      </div>

      <div class="grid__col grid__col--side">
        <ClassicHomeCard
          v-if="voiceChannels.length"
          :icon="Volume2"
          title="Vocaux"
          :count="`${liveVoiceChannels.filter((v) => v.members.length).length}/${voiceChannels.length}`"
        >
          <ul class="list">
            <li
              v-for="v in liveVoiceChannels"
              :key="v.ch.id"
              class="row row--voice"
              :class="{ 'row--voice-live': v.members.length }"
            >
              <span class="row__hash row__hash--voice">»</span>
              <div class="row__body">
                <p class="row__name">{{ v.ch.name }}</p>
                <p class="row__meta">
                  <span v-if="v.members.length" class="row__snippet">
                    {{
                      v.members
                        .map((m) => m.name)
                        .slice(0, 3)
                        .join(', ')
                    }}{{ v.members.length > 3 ? '…' : '' }}
                  </span>
                  <span v-else class="row__snippet row__snippet--muted">vide</span>
                </p>
              </div>
              <span v-if="v.members.length" class="row__live-pill">
                <span class="row__live-dot" />
                {{ v.members.length }}
              </span>
            </li>
          </ul>
        </ClassicHomeCard>

        <ClassicHomeCard
          v-if="pinnedChannels.length"
          :icon="Pin"
          title="Épinglés"
          :count="pinnedChannels.length"
        >
          <ul class="list">
            <li v-for="ch in pinnedChannels" :key="ch.id" class="row" @click="open(ch.id)">
              <span class="row__hash">{{ ch.type === 'forum' ? '::' : '#' }}</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
              </div>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
        </ClassicHomeCard>

        <ClassicHomeCard :icon="Sparkles" title="À propos" ghost>
          <p class="about-text">
            Bienvenue sur <strong>{{ store.current?.name ?? 'ton Nook' }}</strong
            >. Tu peux personnaliser cette page d'accueil bientôt — choisir tes widgets, leur ordre,
            et ce que tu veux voir au premier coup d'œil.
          </p>
        </ClassicHomeCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

/* ── Banner ─────────────────────────────── */
.banner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  background: rgba(15, 16, 24, 0.9);
}

.banner__media {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #4338ca, #6366f1);
  position: relative;
}

.banner__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner__media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

.banner__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.55) 75%, rgba(0, 0, 0, 0.85)),
    linear-gradient(180deg, rgba(15, 16, 24, 0) 50%, rgba(15, 16, 24, 0.4));
  pointer-events: none;
}

.banner__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 22px;
}

.banner__row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.banner__icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 22px;
  font-weight: 700;
  border: 2px solid rgba(0, 0, 0, 0.5);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.banner__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner__title {
  flex: 1;
  min-width: 0;
}

.banner__title h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.banner__stats {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.banner__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.banner__stat-sep {
  color: rgba(255, 255, 255, 0.3);
}

.banner__stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.banner__stat-dot--green {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.banner__edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}

.banner__edit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.banner__edit:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.16);
}

/* ── Grid ─────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 16px;
}

@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.grid__col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ── Card ─────────────────────────────── */
.about-text {
  margin: 0;
  padding: 14px 16px 16px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.65);
}

.about-text strong {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.list {
  list-style: none;
  margin: 0;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms;
}

.row:hover {
  background: rgba(99, 102, 241, 0.1);
}

.row:hover .row__arrow {
  color: rgb(199, 210, 254);
  transform: translateX(2px);
}

.row__hash {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.row__hash--voice {
  color: rgba(74, 222, 128, 0.7);
}

.row__body {
  flex: 1;
  min-width: 0;
}

.row__name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  gap: 6px;
}

.row__snippet {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.row__snippet--muted {
  color: rgba(255, 255, 255, 0.25);
  font-style: italic;
}

.row__count {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

.row__arrow {
  color: rgba(255, 255, 255, 0.3);
  transition:
    color 120ms,
    transform 120ms;
}

.row__live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.18);
  color: rgb(134, 239, 172);
  font-size: 10px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}

.row__live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 4px rgba(34, 197, 94, 0.7);
  animation: row-live 1.4s ease-in-out infinite;
}

@keyframes row-live {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.empty {
  padding: 20px 14px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  margin: 0;
}
</style>
