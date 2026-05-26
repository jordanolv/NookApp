<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { currentChannelId, voicePresence } from '~/composables/voice/state';

const { t } = useI18n();
const layout = useUiLayout();

const POS_KEY = 'voice:members-here:pos';
const VIEW_KEY = 'voice:members-here:view';
const PANEL_WIDTH = 200;
const COMPACT_WIDTH = 132;

const dismissedForChannel = ref<string | null>(null);
const compact = ref(false);

const x = ref<number | null>(null);
const y = ref<number | null>(null);

const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let origX = 0;
let origY = 0;

const channelId = computed(() => currentChannelId.value);
const participants = computed(() =>
  channelId.value ? (voicePresence.value.get(channelId.value) ?? []) : [],
);
const visible = computed(() => !!channelId.value && dismissedForChannel.value !== channelId.value);

watch(channelId, (next, prev) => {
  if (next !== prev) dismissedForChannel.value = null;
});

function applyDefaultPosition() {
  if (typeof window === 'undefined') return;
  const w = compact.value ? COMPACT_WIDTH : PANEL_WIDTH;
  x.value = window.innerWidth - w - 14;
  y.value = 220;
}

function clampPosition() {
  if (typeof window === 'undefined' || x.value === null || y.value === null) return;
  const w = compact.value ? COMPACT_WIDTH : PANEL_WIDTH;
  const maxX = window.innerWidth - w - 4;
  const maxY = window.innerHeight - 80;
  x.value = Math.max(4, Math.min(x.value, maxX));
  y.value = Math.max(4, Math.min(y.value, maxY));
}

function persistPosition() {
  if (x.value === null || y.value === null) return;
  layout.set(POS_KEY, { x: x.value, y: y.value });
}

function onHeaderMousedown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
  dragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  origX = x.value ?? 0;
  origY = y.value ?? 0;
  e.preventDefault();
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return;
  x.value = origX + (e.clientX - dragStartX);
  y.value = origY + (e.clientY - dragStartY);
  clampPosition();
}

function onMouseUp() {
  if (!dragging.value) return;
  dragging.value = false;
  persistPosition();
}

function toggleCompact() {
  compact.value = !compact.value;
  layout.set(VIEW_KEY, { compact: compact.value });
  clampPosition();
}

function dismiss() {
  dismissedForChannel.value = channelId.value;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

onMounted(() => {
  applyDefaultPosition();
  void layout.ensureLoaded().then(() => {
    const view = layout.get(VIEW_KEY);
    if (view && typeof view.compact === 'boolean') compact.value = view.compact;
    const pos = layout.get(POS_KEY);
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      x.value = pos.x;
      y.value = pos.y;
    }
    clampPosition();
  });
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', clampPosition);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('resize', clampPosition);
});

const panelStyle = computed(() => ({
  left: (x.value ?? 0) + 'px',
  top: (y.value ?? 0) + 'px',
  width: (compact.value ? COMPACT_WIDTH : PANEL_WIDTH) + 'px',
}));
</script>

<template>
  <div
    v-if="visible"
    class="voice-members"
    :class="{ 'voice-members--dragging': dragging }"
    :style="panelStyle"
  >
    <header
      class="voice-members__head"
      :title="t('voice.members.drag')"
      @mousedown="onHeaderMousedown"
    >
      <span class="voice-members__grip" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </span>
      <span class="voice-members__title">{{ t('voice.members.hereTitle') }}</span>
      <div class="voice-members__actions" data-no-drag>
        <button
          class="voice-members__btn"
          type="button"
          :title="compact ? t('voice.members.viewDetailed') : t('voice.members.viewCompact')"
          :aria-label="compact ? t('voice.members.viewDetailed') : t('voice.members.viewCompact')"
          :aria-pressed="compact"
          @click="toggleCompact"
        >
          <svg
            v-if="compact"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1.2" fill="currentColor" />
            <circle cx="4" cy="12" r="1.2" fill="currentColor" />
            <circle cx="4" cy="18" r="1.2" fill="currentColor" />
          </svg>
          <svg
            v-else
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="14" cy="6" r="2.5" />
            <circle cx="6" cy="14" r="2.5" />
            <circle cx="14" cy="14" r="2.5" />
          </svg>
        </button>
        <button
          class="voice-members__btn"
          type="button"
          :title="t('voice.members.hide')"
          @click="dismiss"
        >
          <X :size="12" :stroke-width="2.2" />
        </button>
      </div>
    </header>

    <ul v-if="compact && participants.length" class="voice-members__grid">
      <li v-for="p in participants" :key="p.userId" class="voice-members__tile" :title="p.name">
        {{ initials(p.name) }}
      </li>
    </ul>

    <ul v-else-if="participants.length" class="voice-members__list">
      <li v-for="p in participants" :key="p.userId" class="voice-members__row">
        <span class="voice-members__avatar">{{ initials(p.name) }}</span>
        <span class="voice-members__name">{{ p.name }}</span>
      </li>
    </ul>

    <p v-else class="voice-members__empty">{{ t('voice.members.hereEmpty') }}</p>
  </div>
</template>

<style scoped>
.voice-members {
  position: fixed;
  z-index: 38;
  padding: 8px 10px 10px;
  border-radius: 12px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  transition: width 0.18s ease;
  user-select: none;
}
.voice-members--dragging {
  cursor: grabbing;
}
.voice-members__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 2px 0;
  cursor: grab;
}
.voice-members--dragging .voice-members__head {
  cursor: grabbing;
}
.voice-members__grip {
  display: inline-grid;
  grid-template-columns: repeat(2, 2px);
  grid-template-rows: repeat(3, 2px);
  gap: 2px;
  flex-shrink: 0;
  opacity: 0.55;
}
.voice-members__grip > span {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--ink-muted);
}
.voice-members__title {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.voice-members__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.voice-members__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.voice-members__btn:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}
.voice-members__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.voice-members__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px;
}
.voice-members__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}
.voice-members__name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.voice-members__empty {
  margin: 0;
  font-size: 11px;
  font-style: italic;
  color: var(--ink-muted);
}

.voice-members__grid {
  list-style: none;
  margin: 0;
  padding: 2px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.voice-members__tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: white;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
