<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Settings } from 'lucide-vue-next';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import { useLocalActivity } from '~/composables/useLocalActivity';

defineProps<{
  channels: ChannelPublic[];
  voiceChannels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
  serverId: string;
  serverName: string;
  bannerUrl?: string | null;
}>();

const emit = defineEmits<{
  'select-channel': [channel: ChannelPublic, e: MouseEvent | KeyboardEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
  'open-server-switcher': [event: MouseEvent];
  'open-server-menu': [event: MouseEvent];
  'create-channel': [opts: { type: 'text' | 'voice'; categoryId: string | null }];
  'open-user-settings': [];
}>();

const { t } = useI18n({ useScope: 'global' });
const { user } = useAuth();
const { store } = useServers();
const voice = useVoice();
const socket = useSocket();
const { localActivity } = useLocalActivity();
const interfacePrefs = useInterfacePreferences();

const currentVoiceChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === voice.currentChannelId.value) ?? null,
);
const userWhere = computed(() => {
  if (currentVoiceChannel.value) return `# ${currentVoiceChannel.value.name}`;
  return t('voice.status.inNook');
});

const pingLabel = computed(() => {
  const ms = socket.latencyMs.value;
  return typeof ms === 'number' ? `${ms} ms` : '— ms';
});
</script>

<template>
  <aside
    class="left-sidebar"
    :class="{ 'left-sidebar--swapped': interfacePrefs.prefs.value.swapSidebars }"
  >
    <div class="left-sidebar__scroll">
      <LayoutChannelsList
        :channels="channels"
        :categories="categories"
        :active-channel-ids="activeChannelIds"
        :current-voice-id="currentVoiceId"
        :can-manage="canManage"
        @select="(ch, e) => emit('select-channel', ch, e)"
        @edit-channel="(id) => emit('edit-channel', id)"
        @edit-category="(id) => emit('edit-category', id)"
        @create-channel="(categoryId) => emit('create-channel', { type: 'text', categoryId })"
      />
      <LayoutVoiceChannelsList
        :channels="voiceChannels"
        :current-voice-id="currentVoiceId"
        :can-manage="canManage"
        @select="(ch, e) => emit('select-channel', ch, e)"
        @create-voice="emit('create-channel', { type: 'voice', categoryId: null })"
      />
    </div>

    <div class="left-sidebar__user" :title="user?.name ?? ''">
      <span class="left-sidebar__user-avatar">
        {{ user?.name?.[0]?.toUpperCase() ?? '?' }}
      </span>
      <span class="left-sidebar__user-meta">
        <span class="left-sidebar__user-name">{{ user?.name }}</span>
        <span class="left-sidebar__user-where">
          <span v-if="localActivity" class="left-sidebar__user-emoji">{{ localActivity }}</span>
          {{ userWhere }}
        </span>
      </span>
      <span class="left-sidebar__user-ping" :title="`Latence ${pingLabel}`">{{ pingLabel }}</span>
      <button
        type="button"
        class="left-sidebar__user-cog"
        title="Paramètres du compte"
        @click="emit('open-user-settings')"
      >
        <Settings :size="14" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.left-sidebar {
  position: fixed;
  top: 20px;
  bottom: 20px;
  left: 20px;
  right: auto;
  width: 256px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  color: var(--ink);
}

.left-sidebar--swapped {
  left: auto;
  right: 20px;
}

.left-sidebar__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-divider) transparent;
}
.left-sidebar__scroll::-webkit-scrollbar {
  width: 6px;
}
.left-sidebar__scroll::-webkit-scrollbar-thumb {
  background: var(--surface-divider);
  border-radius: 999px;
}

.left-sidebar__user {
  margin-top: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  background: var(--surface-tinted);
  color: var(--ink);
}
.left-sidebar__user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: grid;
  place-items: center;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}
.left-sidebar__user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.left-sidebar__user-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.left-sidebar__user-where {
  font-size: 11px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.left-sidebar__user-emoji {
  margin-right: 3px;
}
.left-sidebar__user-ping {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--surface-tinted-strong);
  font-size: 10px;
  font-weight: 700;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.left-sidebar__user-ping::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-leaf);
  animation: lsb-ping-pulse 2s infinite;
}
@keyframes lsb-ping-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--accent-leaf-soft);
  }
  70% {
    box-shadow: 0 0 0 5px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
.left-sidebar__user-cog {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  color: var(--ink-muted);
  opacity: 0.7;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    opacity 0.15s,
    background 0.15s,
    color 0.15s;
}
.left-sidebar__user-cog:hover {
  opacity: 1;
  background: var(--surface-tinted-strong);
  color: var(--ink);
}
</style>
