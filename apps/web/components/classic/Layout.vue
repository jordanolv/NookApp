<script setup lang="ts">
import { Hash, MessageSquare, X, Plus, Sparkles } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';

const props = defineProps<{
  serverId: string;
}>();

const { store } = useServers();
const { user } = useAuth();
const voice = useVoice();

const selectedChannelId = ref<string | null>(null);
const widgetIds = ref<string[]>([]);
const dropActive = ref(false);
const showPicker = ref(false);

const channelById = computed(() => {
  const map = new Map<string, ChannelPublic>();
  for (const c of store.channels) map.set(c.id, c);
  return map;
});

const selectedChannel = computed(() =>
  selectedChannelId.value ? (channelById.value.get(selectedChannelId.value) ?? null) : null,
);

const pickableChannels = computed(() =>
  store.channels.filter(
    (c) =>
      c.serverId === props.serverId &&
      (c.type === 'text' || c.type === 'forum') &&
      !widgetIds.value.includes(c.id),
  ),
);

function openChannel(channelId: string) {
  const ch = channelById.value.get(channelId);
  if (!ch) return;
  selectedChannelId.value = ch.id;
}

function pinAsWidget(channelId: string) {
  if (widgetIds.value.includes(channelId)) return;
  widgetIds.value = [...widgetIds.value, channelId];
  if (selectedChannelId.value === channelId) selectedChannelId.value = null;
}

function unpinWidget(channelId: string) {
  widgetIds.value = widgetIds.value.filter((id) => id !== channelId);
}

function reorderWidgets(ids: string[]) {
  widgetIds.value = ids;
}

function pickAndPin(channelId: string) {
  pinAsWidget(channelId);
  showPicker.value = false;
}

function backToHome() {
  selectedChannelId.value = null;
}

// ── Drag-and-drop from the sidebar onto the widget bar ──────────────
//
// Channel rows in the sidebar carry a `data-channel-id` attribute. When the
// user drags one anywhere within the classic shell, we listen at the root
// level — no need to modify the shared sidebar component.

function onRootDragOver(e: DragEvent) {
  if (e.dataTransfer?.types?.includes('text/x-nookapp-channel-id')) {
    e.preventDefault();
    dropActive.value = true;
  }
}

function onRootDragLeave(e: DragEvent) {
  const related = e.relatedTarget as Node | null;
  if (related && (e.currentTarget as HTMLElement).contains(related)) return;
  dropActive.value = false;
}

function onWidgetBarDrop(e: DragEvent) {
  const id = e.dataTransfer?.getData('text/x-nookapp-channel-id');
  dropActive.value = false;
  if (id) pinAsWidget(id);
}

defineExpose({
  openChannel,
  pinAsWidget,
  backToHome,
});
</script>

<template>
  <div class="classic" @dragover="onRootDragOver" @dragleave="onRootDragLeave">
    <!-- Ambient Phaser-ish backdrop -->
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

    <!-- Center: floating chat window or welcome -->
    <main class="classic__stage">
      <Transition name="classic-window">
        <article v-if="selectedChannel" :key="selectedChannel.id" class="window">
          <header class="window__head">
            <span class="window__head-dots" aria-hidden="true"> <span /><span /><span /> </span>
            <span class="window__head-icon">
              <component
                :is="selectedChannel.type === 'forum' ? MessageSquare : Hash"
                :size="14"
                :stroke-width="2.2"
              />
            </span>
            <span class="window__head-name">{{ selectedChannel.name }}</span>
            <button
              class="window__head-pin"
              title="Pin to widget bar"
              @click="pinAsWidget(selectedChannel.id)"
            >
              <Plus :size="13" :stroke-width="2.2" />
            </button>
            <button class="window__head-close" title="Close" @click="backToHome">
              <X :size="14" :stroke-width="2.2" />
            </button>
          </header>
          <ChatPane :channel-id="selectedChannel.id" class="window__chat" />
        </article>

        <article v-else class="window window--welcome">
          <header class="window__head window__head--ghost">
            <span class="window__head-dots" aria-hidden="true"> <span /><span /><span /> </span>
            <span class="window__head-name">{{ store.current?.name ?? 'Nook' }} · classic</span>
          </header>
          <div class="welcome">
            <div class="welcome__badge">
              <Sparkles :size="18" :stroke-width="2" />
            </div>
            <h1 class="welcome__title">Hey {{ user?.name ?? 'there' }}.</h1>
            <p class="welcome__line">
              Pick a channel on the left to chat here, or drag any channel to the right rail to keep
              an eye on it while you focus.
            </p>
            <p class="welcome__hint">
              The faint room behind these windows is your Nook — we're just keeping things quiet for
              now.
            </p>
          </div>
        </article>
      </Transition>
    </main>

    <!-- Right: voice column (when joined) + widget bar -->
    <div class="classic__rail" @dragover.prevent @drop="onWidgetBarDrop">
      <div v-if="voice.currentChannelId.value" class="classic__rail-voice">
        <ClassicVoiceColumn />
      </div>
      <ClassicWidgetBar
        :server-id="serverId"
        :widget-ids="widgetIds"
        :drop-active="dropActive"
        @close="unpinWidget"
        @reorder="reorderWidgets"
        @pick="showPicker = true"
      />
    </div>

    <!-- Channel picker modal -->
    <Teleport to="body">
      <div v-if="showPicker" class="picker-veil" @click="showPicker = false">
        <div class="picker" @click.stop>
          <header class="picker__head">
            <h3>Pin a channel</h3>
            <button class="picker__close" @click="showPicker = false">
              <X :size="14" :stroke-width="2.2" />
            </button>
          </header>
          <div v-if="!pickableChannels.length" class="picker__empty">No more channels to pin.</div>
          <ul v-else class="picker__list">
            <li v-for="ch in pickableChannels" :key="ch.id">
              <button class="picker__row" @click="pickAndPin(ch.id)">
                <component
                  :is="ch.type === 'forum' ? MessageSquare : Hash"
                  :size="13"
                  :stroke-width="2.2"
                  class="picker__row-icon"
                />
                <span>{{ ch.name }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.classic {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 360px;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .classic {
    grid-template-columns: 1fr 300px;
  }
}

/* ── Ambient backdrop ─────────────────────────────── */
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
  backdrop-filter: blur(0.5px);
  -webkit-backdrop-filter: blur(0.5px);
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

/* ── Center stage with floating window ────────────────── */
.classic__stage {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 28px 28px 28px 28px;
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

.window--welcome {
  align-self: center;
  max-width: 540px;
  flex: 0 0 auto;
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

.window__head-dots {
  display: flex;
  gap: 4px;
}

.window__head-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.window__head-dots span:first-child {
  background: rgba(239, 68, 68, 0.6);
}

.window__head-dots span:nth-child(2) {
  background: rgba(234, 179, 8, 0.6);
}

.window__head-dots span:nth-child(3) {
  background: rgba(34, 197, 94, 0.6);
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

.window__head-pin,
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

.window__head-pin:hover {
  background: rgba(99, 102, 241, 0.2);
  color: rgb(199, 210, 254);
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

/* ── Welcome card ─────────────────────────────────── */
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

/* ── Right rail ───────────────────────────────────── */
.classic__rail {
  position: relative;
  z-index: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.classic__rail-voice {
  flex: 0 0 auto;
  max-height: 50%;
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* ── Channel picker modal ─────────────────────────── */
.picker-veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker {
  width: min(380px, 90vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(15, 16, 24, 0.96);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.picker__head {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.picker__head h3 {
  flex: 1;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.picker__close {
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

.picker__close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}

.picker__empty {
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.picker__list {
  list-style: none;
  padding: 6px;
  margin: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
  transition: background 120ms;
}

.picker__row:hover {
  background: rgba(99, 102, 241, 0.18);
}

.picker__row-icon {
  color: rgba(165, 180, 252, 0.85);
}
</style>
