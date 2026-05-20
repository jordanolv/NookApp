<script setup lang="ts">
import { computed, toRef } from 'vue';
import { Hash, MessageSquare, Volume2, Sparkles, Pin, ChevronRight } from 'lucide-vue-next';
import { useServerHomeData } from '~/composables/useServerHomeData';
import HomeBanner from './HomeBanner.vue';

const props = defineProps<{
  serverId: string;
}>();

const emit = defineEmits<{
  'open-channel': [channelId: string];
}>();

const home = useServerHomeData(toRef(props, 'serverId'));

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

    <section class="grid">
      <div class="grid__col grid__col--main">
        <ClassicHomeCard :icon="Hash" title="Salons actifs" :count="home.textChannels.value.length">
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
      </div>

      <div class="grid__col grid__col--side">
        <ClassicHomeCard
          v-if="home.voiceChannels.value.length"
          :icon="Volume2"
          title="Vocaux"
          :count="`${liveVoiceCount}/${home.voiceChannels.value.length}`"
        >
          <ul class="list">
            <li
              v-for="v in home.liveVoiceChannels.value"
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
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
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
