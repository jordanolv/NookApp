<script setup lang="ts">
import { computed, toRef } from 'vue';
import {
  Hash,
  MessageSquare,
  Volume2,
  Sparkles,
  Pin,
  ChevronRight,
  Plus,
  Settings,
  Sticker,
} from 'lucide-vue-next';
import { useServerHomeData } from '~/composables/useServerHomeData';
import HomeBanner from './HomeBanner.vue';

const props = defineProps<{
  serverId: string;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  'open-channel': [channelId: string];
  'create-channel': [type: 'text' | 'voice'];
  'open-user-settings': [];
}>();

const home = useServerHomeData(toRef(props, 'serverId'));
const { user } = useAuth();
const { currentChannelId } = useVoice();

const liveVoiceCount = computed(
  () => home.liveVoiceChannels.value.filter((v) => v.members.length).length,
);

function open(channelId: string) {
  emit('open-channel', channelId);
}
</script>

<template>
  <div class="home">
    <HomeBanner
      :name="home.store.current?.name"
      :banner-url="home.bannerUrl.value"
      :icon-url="home.iconUrl.value"
      :online-count="home.onlineCount.value"
      :channel-count="home.allChannels.value.length"
    />

    <div class="me">
      <span class="me__avatar">{{ (user?.name ?? '?').slice(0, 1).toUpperCase() }}</span>
      <span class="me__name">{{ user?.name }}</span>
      <button
        type="button"
        class="me__settings"
        title="Paramètres du compte"
        @click="emit('open-user-settings')"
      >
        <Settings :size="15" :stroke-width="2" />
      </button>
    </div>

    <section class="grid">
      <div class="grid__col grid__col--main">
        <ClassicHomeCard :icon="Hash" title="Salons actifs" :count="home.textChannels.value.length">
          <template v-if="canManage" #actions>
            <button
              type="button"
              class="card-add"
              title="Créer un salon"
              @click="emit('create-channel', 'text')"
            >
              <Plus :size="13" :stroke-width="2.4" />
            </button>
          </template>
          <ul v-if="home.textChannels.value.length" class="list">
            <li v-for="ch in home.textChannels.value" :key="ch.id" class="row" @click="open(ch.id)">
              <span class="row__hash">#</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
                <p class="row__meta">
                  <span v-if="home.lastSnippet(ch.id)" class="row__snippet">
                    {{ home.lastSnippet(ch.id) }}
                  </span>
                  <span v-else class="row__snippet row__snippet--muted">Aucun message</span>
                </p>
              </div>
              <span class="row__count">{{ home.messageCount(ch.id) }}</span>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
          <p v-else class="empty">Aucun salon texte pour l'instant.</p>
        </ClassicHomeCard>

        <ClassicHomeCard
          v-if="home.forumChannels.value.length"
          :icon="MessageSquare"
          title="Forums"
          :count="home.forumChannels.value.length"
        >
          <ul class="list">
            <li
              v-for="ch in home.forumChannels.value"
              :key="ch.id"
              class="row"
              @click="open(ch.id)"
            >
              <span class="row__hash">::</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
                <p class="row__meta">
                  <span class="row__snippet">
                    {{ home.forumThreadCount(ch.id) }} thread{{
                      home.forumThreadCount(ch.id) > 1 ? 's' : ''
                    }}
                  </span>
                </p>
              </div>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
        </ClassicHomeCard>

        <ClassicHomeCard
          v-if="home.widgetChannels.value.length"
          :icon="Sticker"
          title="Widgets"
          :count="home.widgetChannels.value.length"
        >
          <ul class="list">
            <li
              v-for="ch in home.widgetChannels.value"
              :key="ch.id"
              class="row"
              @click="open(ch.id)"
            >
              <span class="row__hash">*</span>
              <div class="row__body">
                <p class="row__name">{{ ch.name }}</p>
              </div>
              <ChevronRight :size="13" :stroke-width="2" class="row__arrow" />
            </li>
          </ul>
        </ClassicHomeCard>
      </div>

      <div class="grid__col grid__col--side">
        <ClassicHomeCard
          v-if="home.voiceChannels.value.length"
          :icon="Volume2"
          title="Vocaux"
          :count="`${liveVoiceCount}/${home.voiceChannels.value.length}`"
        >
          <template v-if="canManage" #actions>
            <button
              type="button"
              class="card-add"
              title="Créer un salon vocal"
              @click="emit('create-channel', 'voice')"
            >
              <Plus :size="13" :stroke-width="2.4" />
            </button>
          </template>
          <ul class="list">
            <li
              v-for="v in home.liveVoiceChannels.value"
              :key="v.ch.id"
              class="row row--voice"
              :class="{
                'row--voice-live': v.members.length,
                'row--voice-current': v.ch.id === currentChannelId,
              }"
              :title="
                v.ch.id === currentChannelId ? 'Cliquer pour quitter' : 'Cliquer pour rejoindre'
              "
              @click="open(v.ch.id)"
            >
              <span class="row__hash row__hash--voice">»</span>
              <div class="row__body">
                <p class="row__name">{{ v.ch.name }}</p>
                <div v-if="v.members.length" class="row__chips">
                  <span
                    v-for="m in v.members"
                    :key="m.userId"
                    class="row__chip"
                    :class="{ 'row__chip--me': m.userId === user?.id }"
                  >
                    <span class="row__chip-initial">{{ m.name.slice(0, 1).toUpperCase() }}</span>
                    {{ m.name }}
                  </span>
                </div>
                <p v-else class="row__meta">
                  <span class="row__snippet row__snippet--muted">vide</span>
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
          v-if="home.pinnedChannels.value.length"
          :icon="Pin"
          title="Épinglés"
          :count="home.pinnedChannels.value.length"
        >
          <ul class="list">
            <li
              v-for="ch in home.pinnedChannels.value"
              :key="ch.id"
              class="row"
              @click="open(ch.id)"
            >
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
            Bienvenue sur <strong>{{ home.store.current?.name ?? 'ton Nook' }}</strong
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
  font-family: var(--font-body);
  scrollbar-width: thin;
  scrollbar-color: var(--surface-tinted-strong) transparent;
}

.me {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}
.me__avatar {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-inverse);
  background: var(--ink-muted);
}
.me__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.me__settings,
.card-add {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.me__settings:hover,
.card-add:hover {
  background: var(--surface-tinted-strong);
  color: var(--ink);
}
.card-add {
  width: 22px;
  height: 22px;
}

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

.about-text {
  margin: 0;
  padding: 14px 16px 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-muted);
}

.about-text strong {
  color: var(--ink);
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
  background: var(--surface-tinted);
}

.row:hover .row__arrow {
  color: var(--ink);
  transform: translateX(2px);
}

.row__hash {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 13px;
  color: var(--ink-faint);
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.row__hash--voice {
  color: var(--accent-leaf);
}

.row__body {
  flex: 1;
  min-width: 0;
}

.row__name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--ink-muted);
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
  color: var(--ink-faint);
  font-style: italic;
}

.row__count {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: var(--ink-muted);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-tinted);
}

.row__arrow {
  color: var(--ink-faint);
  transition:
    color 120ms,
    transform 120ms;
}

.row--voice-current {
  background: color-mix(in srgb, var(--accent-leaf) 10%, transparent);
}

.row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.row__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 2px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--ink-soft);
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
}

.row__chip--me {
  color: var(--ink);
  border-color: var(--accent-leaf);
  background: color-mix(in srgb, var(--accent-leaf) 14%, transparent);
}

.row__chip-initial {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: var(--ink-inverse);
  background: var(--ink-muted);
}

.row__chip--me .row__chip-initial {
  background: var(--accent-leaf);
}

.row__live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-leaf) 18%, transparent);
  color: var(--accent-leaf);
  font-size: 10px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}

.row__live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-leaf);
  box-shadow: 0 0 4px var(--accent-leaf);
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
  color: var(--ink-faint);
  font-style: italic;
  margin: 0;
}
</style>
