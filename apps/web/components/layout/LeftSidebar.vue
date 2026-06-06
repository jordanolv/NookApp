<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Settings, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-vue-next';
import type { CategoryPublic, ChannelPublic } from '@nookapp/protocol';
import { useLocalActivity } from '~/composables/useLocalActivity';
import { useStatus, type Status } from '~/composables/useStatus';

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
const { appearance } = useCharacter();
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

const pingLevel = computed<'good' | 'ok' | 'bad' | 'unknown'>(() => {
  const ms = socket.latencyMs.value;
  if (typeof ms !== 'number') return 'unknown';
  if (ms < 80) return 'good';
  if (ms < 200) return 'ok';
  return 'bad';
});

const pingIcon = computed(() => {
  switch (pingLevel.value) {
    case 'good':
      return SignalHigh;
    case 'ok':
      return SignalMedium;
    case 'bad':
      return SignalLow;
    default:
      return SignalZero;
  }
});

const status = useStatus();
const statusPopoverOpen = ref(false);
const STATUS_LABELS: Record<Status, string> = {
  online: 'En ligne',
  busy: 'Occupé',
  away: 'Absent',
};
const statusTitle = computed(() => {
  const label = STATUS_LABELS[status.effectiveStatus.value];
  if (status.autoOverride.value === 'idle') return `${label} (inactivité)`;
  if (status.autoOverride.value === 'voice') return `${label} (en vocal)`;
  return label;
});

function toggleStatusPopover(e: MouseEvent) {
  e.stopPropagation();
  statusPopoverOpen.value = !statusPopoverOpen.value;
}
function pickStatus(s: Status) {
  status.setManualStatus(s);
  statusPopoverOpen.value = false;
}
function onDocumentClick() {
  statusPopoverOpen.value = false;
}
watch(statusPopoverOpen, (open) => {
  if (typeof window === 'undefined') return;
  if (open) window.addEventListener('click', onDocumentClick);
  else window.removeEventListener('click', onDocumentClick);
});
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('click', onDocumentClick);
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

    <div class="left-sidebar__user-wrapper">
      <button
        type="button"
        class="left-sidebar__user"
        :title="`${user?.name ?? ''} — Paramètres du compte`"
        @click="emit('open-user-settings')"
      >
        <span class="left-sidebar__user-avatar-wrap">
          <UserCharacterAvatar
            :appearance="appearance"
            :size="40"
            class="left-sidebar__user-avatar"
          />
        </span>
        <span class="left-sidebar__user-meta">
          <span class="left-sidebar__user-name">{{ user?.name }}</span>
          <span class="left-sidebar__user-where">
            <span v-if="localActivity" class="left-sidebar__user-emoji">{{ localActivity }}</span>
            {{ userWhere }}
          </span>
        </span>
        <span
          class="left-sidebar__user-ping"
          :class="`ping--${pingLevel}`"
          :title="`Latence ${pingLabel}`"
          :aria-label="`Latence ${pingLabel}`"
        >
          <component :is="pingIcon" :size="16" :stroke-width="2.25" />
        </span>
        <span class="left-sidebar__user-cog" aria-hidden="true">
          <Settings :size="14" />
        </span>
      </button>
      <button
        type="button"
        class="left-sidebar__status-dot"
        :class="`left-sidebar__status-dot--${status.effectiveStatus.value}`"
        :title="`Statut : ${statusTitle}`"
        :aria-label="`Statut : ${statusTitle}`"
        @click="toggleStatusPopover"
      />
      <LayoutUserStatusPopover
        v-if="statusPopoverOpen"
        class="left-sidebar__status-popover"
        :manual-status="status.manualStatus.value"
        :effective-status="status.effectiveStatus.value"
        :auto-override="status.autoOverride.value"
        @pick="pickStatus"
        @close="statusPopoverOpen = false"
      />
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

.left-sidebar__user-wrapper {
  position: relative;
  margin-top: 8px;
}
.left-sidebar__user {
  padding: 8px 10px 8px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  width: 100%;
  text-align: left;
  border-radius: 14px;
  background: var(--surface-tinted);
  color: var(--ink);
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}
.left-sidebar__user:hover {
  background: var(--surface-tinted-strong);
}
.left-sidebar__user:active {
  transform: scale(0.985);
}
.left-sidebar__user:focus-visible {
  outline: 2px solid var(--accent-leaf);
  outline-offset: 2px;
}

.left-sidebar__user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.left-sidebar__status-dot {
  position: absolute;
  bottom: 9px;
  left: 38px;
  z-index: 2;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--ink-muted);
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 3px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.left-sidebar__status-dot:hover {
  transform: scale(1.15);
}
.left-sidebar__status-dot:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px var(--accent-leaf);
}
.left-sidebar__status-dot--online {
  background: #34d399;
}
.left-sidebar__status-dot--busy {
  background: #f87171;
}
.left-sidebar__status-dot--away {
  background: #fbbf24;
}

.left-sidebar__status-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 50;
}

.left-sidebar__user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  gap: 1px;
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
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--ink-muted);
}
.left-sidebar__user-ping.ping--good {
  color: var(--accent-leaf);
}
.left-sidebar__user-ping.ping--ok {
  color: var(--accent-warm);
}
.left-sidebar__user-ping.ping--bad {
  color: var(--accent-rose);
}
.left-sidebar__user-ping.ping--unknown {
  color: var(--ink-muted);
  opacity: 0.5;
}

.left-sidebar__user-cog {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--ink-muted);
  opacity: 0.55;
  flex-shrink: 0;
  transition:
    opacity 0.15s ease,
    color 0.15s ease,
    transform 0.2s ease;
}
.left-sidebar__user:hover .left-sidebar__user-cog {
  opacity: 1;
  color: var(--ink);
  transform: rotate(35deg);
}
</style>
