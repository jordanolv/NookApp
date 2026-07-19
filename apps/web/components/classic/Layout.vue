<script setup lang="ts">
import { Hash, MessageSquare, X } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';

defineProps<{ serverId: string }>();

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
  if (channelById.value.has(channelId)) selectedChannelId.value = channelId;
}

function backToHome() {
  selectedChannelId.value = null;
}

defineExpose({ openChannel, backToHome });
</script>

<template>
  <div class="classic">
    <div class="classic__backdrop" aria-hidden="true">
      <div class="classic__backdrop-floor" />
      <div class="classic__backdrop-grid" />
      <div class="classic__backdrop-glow" />
      <span class="classic__backdrop-prop classic__backdrop-prop--1">🪴</span>
      <span class="classic__backdrop-prop classic__backdrop-prop--2">🛋️</span>
      <span class="classic__backdrop-prop classic__backdrop-prop--3">🪑</span>
      <span class="classic__backdrop-prop classic__backdrop-prop--4">🧸</span>
      <div class="classic__backdrop-haze" />
    </div>

    <main class="classic__stage">
      <Transition name="classic-window">
        <article v-if="selectedChannel" :key="selectedChannel.id" class="window">
          <header class="window__head">
            <span class="window__head-icon">
              <component
                :is="selectedChannel.type === 'forum' ? MessageSquare : Hash"
                :size="14"
                :stroke-width="2.2"
              />
            </span>
            <span class="window__head-name">{{ selectedChannel.name }}</span>
            <button class="window__head-close" title="Close" @click="backToHome">
              <X :size="14" :stroke-width="2.2" />
            </button>
          </header>
          <ChatPane :channel-id="selectedChannel.id" class="window__chat" />
        </article>

        <ClassicHome
          v-else
          key="home"
          class="home-stage"
          :server-id="serverId"
          @open-channel="openChannel"
        />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.classic {
  position: relative;
  width: 100%;
  height: 100%;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  overflow: hidden;
}

.classic__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.classic__backdrop-floor {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.18), transparent 65%),
    linear-gradient(180deg, #0c0d18 0%, #11121f 60%, #0a0a14 100%);
}

.classic__backdrop-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  background-position: 16px 16px;
  mask-image: radial-gradient(ellipse at 50% 60%, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 60%, black 30%, transparent 80%);
  filter: blur(0.4px);
}

.classic__backdrop-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 600px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.18), transparent 70%);
  filter: blur(40px);
}

.classic__backdrop-haze {
  position: absolute;
  inset: 0;
  background: rgba(7, 7, 11, 0.55);
}

.classic__backdrop-prop {
  position: absolute;
  font-size: 32px;
  opacity: 0.16;
  filter: blur(0.4px) grayscale(0.4);
  user-select: none;
}

.classic__backdrop-prop--1 {
  top: 12%;
  left: 8%;
  transform: rotate(-10deg) scale(1.4);
}
.classic__backdrop-prop--2 {
  bottom: 22%;
  left: 18%;
  font-size: 44px;
  transform: rotate(4deg) scale(1.8);
}
.classic__backdrop-prop--3 {
  bottom: 30%;
  right: 30%;
  font-size: 28px;
  transform: rotate(-8deg) scale(1.3);
}
.classic__backdrop-prop--4 {
  top: 22%;
  right: 14%;
  font-size: 32px;
  transform: rotate(8deg);
}

.classic__stage {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 28px;
}

.window {
  position: relative;
  width: 100%;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: rgba(15, 16, 24, 0.86);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(99, 102, 241, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.home-stage {
  position: relative;
  width: 100%;
  max-width: 1100px;
  flex: 1;
  min-height: 0;
}

.window__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
}

.window__head--ghost {
  border-bottom-color: transparent;
}

.window__head-icon {
  display: flex;
  align-items: center;
  color: rgba(165, 180, 252, 0.85);
}

.window__head-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
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
  color: rgba(255, 255, 255, 0.4);
  transition:
    background 120ms,
    color 120ms;
}

.window__head-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(248, 113, 113);
}

.window__chat {
  flex: 1;
  min-height: 0;
}

.classic-window-enter-active,
.classic-window-leave-active {
  transition:
    opacity 200ms,
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.classic-window-enter-from,
.classic-window-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
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
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.01em;
}

.welcome__line {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.welcome__hint {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}
</style>
