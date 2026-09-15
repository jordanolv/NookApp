<script setup lang="ts">
import { Hash, MessageSquare, Sticker, X } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { getWidget } from '~/widgets/registry';

defineProps<{ serverId: string; canManage?: boolean }>();
const emit = defineEmits<{
  'join-voice': [channel: ChannelPublic];
  'create-channel': [type: 'text' | 'voice'];
  'open-user-settings': [];
}>();

const { store } = useServers();

const selectedChannelId = ref<string | null>(null);

const channelById = computed(() => {
  const map = new Map<string, ChannelPublic>();
  for (const c of store.channels) map.set(c.id, c);
  return map;
});

const selectedChannel = computed(() =>
  selectedChannelId.value ? (channelById.value.get(selectedChannelId.value) ?? null) : null,
);

function openChannel(channelId: string) {
  const channel = channelById.value.get(channelId);
  if (!channel) return;
  // voice has no window: hand it back to the page, which owns the voice session
  if (channel.type === 'voice') emit('join-voice', channel);
  else selectedChannelId.value = channelId;
}

function backToHome() {
  selectedChannelId.value = null;
}

defineExpose({ openChannel, backToHome });
</script>

<template>
  <div class="classic">
    <div class="classic__backdrop" aria-hidden="true" />
    <VoiceMediaPanel />

    <main class="classic__stage" :class="{ 'classic__stage--split': selectedChannel }">
      <ClassicHome
        class="home-stage"
        :server-id="serverId"
        :can-manage="canManage"
        @open-channel="openChannel"
        @create-channel="(type) => emit('create-channel', type)"
        @open-user-settings="emit('open-user-settings')"
      />

      <Transition name="classic-window">
        <article v-if="selectedChannel" class="window">
          <header class="window__head">
            <span class="window__head-icon">
              <component
                :is="
                  selectedChannel.type === 'forum'
                    ? MessageSquare
                    : selectedChannel.type === 'widget'
                      ? Sticker
                      : Hash
                "
                :size="14"
                :stroke-width="2.2"
              />
            </span>
            <span class="window__head-name">{{ selectedChannel.name }}</span>
            <button class="window__head-close" title="Close" @click="backToHome">
              <X :size="14" :stroke-width="2.2" />
            </button>
          </header>
          <component
            :is="getWidget(selectedChannel.widgetKind)?.component"
            v-if="selectedChannel.type === 'widget'"
            :server-id="serverId"
            :channel-id="selectedChannel.id"
            :channel-name="selectedChannel.name"
            class="window__chat"
          />
          <ChatPane v-else :channel-id="selectedChannel.id" class="window__chat" />
        </article>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.classic {
  position: relative;
  width: 100%;
  height: 100%;
  font-family: var(--font-body);
  overflow: hidden;
}

.classic__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--page-bg);
}

.classic__stage {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}

.window {
  position: relative;
  flex: 0 0 440px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--surface-strong);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lift);
  overflow: hidden;
}

.home-stage {
  position: relative;
  width: 100%;
  max-width: 1100px;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1100px) {
  .classic__stage--split .home-stage {
    display: none;
  }
  .window {
    flex: 1;
  }
}

.window__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-divider);
  background: var(--surface-tinted);
}

.window__head--ghost {
  border-bottom-color: transparent;
}

.window__head-icon {
  display: flex;
  align-items: center;
  color: var(--ink-muted);
}

.window__head-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window__head-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: var(--ink-faint);
  transition:
    background 120ms,
    color 120ms;
}

.window__head-close:hover {
  background: color-mix(in srgb, var(--accent-rose) 18%, transparent);
  color: var(--accent-rose);
}

.window__chat {
  flex: 1;
  min-height: 0;
}

.classic-window-enter-active,
.classic-window-leave-active {
  transition: opacity 160ms;
}

.classic-window-enter-from,
.classic-window-leave-to {
  opacity: 0;
}

.welcome {
  padding: 28px 32px 36px;
  text-align: center;
}

.welcome__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  margin-bottom: 14px;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.25), transparent 60%),
    linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.45);
}

.welcome__title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.welcome__line {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-muted);
}

.welcome__hint {
  margin: 0;
  font-size: 11px;
  color: var(--ink-faint);
  font-style: italic;
}
</style>
