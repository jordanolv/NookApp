<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { ChevronDown } from 'lucide-vue-next';
import { CHANNEL_CARD_DATA } from '~/composables/useChannelCardData';
import { useChannelReadState } from '~/composables/useChannelReadState';
import { useChannelEditing } from '~/composables/useChannelEditing';
import { useChannels } from '~/composables/useChannels';
import { iconForChannel, formatCount } from '~/utils/channel-format';

const props = defineProps<{
  channel: ChannelPublic;
  active: boolean;
  isChild?: boolean;
  forumOpen?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent | KeyboardEvent];
  contextmenu: [event: MouseEvent];
}>();

const data = inject(CHANNEL_CARD_DATA);
if (!data) throw new Error('ChannelCard must be used inside a provider of CHANNEL_CARD_DATA');

const readState = useChannelReadState();
const lastMessage = computed(() => data.lastMessageOf(props.channel.id));
const stat = computed(() => data.statOf(props.channel));
const isForumHeader = computed(() => props.channel.type === 'forum' && !props.isChild);
const unread = computed(() =>
  readState.unreadCount(props.channel.id, lastMessage.value?.createdAt),
);
const unreadLabel = computed(() => (unread.value > 99 ? '99+' : String(unread.value)));
const accent = computed(() => data.accent(props.channel));
const cardVars = computed(() => ({ '--accent': `rgba(${accent.value}, 1)` }));

const channelEditing = useChannelEditing();
const { updateChannel } = useChannels();
const isEditingName = computed(() => channelEditing.isEditing(props.channel.id));
const draftName = ref(props.channel.name);
const inputEl = ref<HTMLInputElement | null>(null);

watch(isEditingName, async (v) => {
  if (v) {
    draftName.value = props.channel.name;
    await nextTick();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
});

async function commitName() {
  if (!isEditingName.value) return;
  const trimmed = draftName.value.trim();
  channelEditing.stopEditing();
  if (!trimmed || trimmed === props.channel.name) return;
  try {
    await updateChannel(props.channel.serverId, props.channel.id, { name: trimmed });
  } catch {
    /* swallow — revert by leaving channel.name as-is */
  }
}

function cancelEdit() {
  draftName.value = props.channel.name;
  channelEditing.stopEditing();
}

const stylePickerOpen = ref(false);
const stylePickerPos = ref<{ left: number; top: number } | null>(null);

function openStylePicker(e: MouseEvent) {
  if (!import.meta.client) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  stylePickerPos.value = { left: rect.right + 8, top: rect.top };
  stylePickerOpen.value = true;
}

function closeStylePicker() {
  stylePickerOpen.value = false;
  stylePickerPos.value = null;
}

async function updateChannelStyle(patch: { color?: string | null; iconName?: string | null }) {
  try {
    await updateChannel(props.channel.serverId, props.channel.id, patch);
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="card"
    :class="{
      'card--child': isChild,
      'card--active': active,
      'card--forum-open': isForumHeader && forumOpen,
    }"
    :data-channel-type="channel.type"
    :style="[data.cardStyle(channel), cardVars]"
    @click="$emit('click', $event)"
    @keydown.enter.prevent="$emit('click', $event)"
    @keydown.space.prevent="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <button
      type="button"
      class="card__icon"
      :style="data.iconStyle(channel)"
      :title="'Couleur & icône'"
      @click.stop="openStylePicker($event)"
    >
      <component :is="iconForChannel(channel)" :size="13" stroke-width="2.4" />
    </button>

    <div class="card__text">
      <input
        v-if="isEditingName"
        ref="inputEl"
        v-model="draftName"
        type="text"
        class="card__name-input"
        maxlength="100"
        @click.stop
        @keydown.enter.prevent="commitName"
        @keydown.esc.prevent="cancelEdit"
        @blur="commitName"
      />
      <span v-else class="card__name">
        {{ channel.name }}
        <ChevronDown
          v-if="isForumHeader"
          :size="11"
          class="card__forum-chevron"
          :class="{ 'card__forum-chevron--open': forumOpen }"
        />
      </span>
    </div>

    <span v-if="unread > 0" class="card__unread" :title="`${unread} non lus`">
      {{ unreadLabel }}
    </span>

    <div v-if="channel.showStat && stat.label" class="card__stat">
      <span class="card__stat-num">{{ formatCount(stat.num) }}</span>
      <span class="card__stat-label">{{ stat.label }}</span>
    </div>
  </div>

  <Teleport to="body">
    <template v-if="stylePickerOpen && stylePickerPos">
      <div class="style-picker__veil" @click="closeStylePicker" @mousedown.stop />
      <div
        class="style-picker__pop"
        :style="{ left: stylePickerPos.left + 'px', top: stylePickerPos.top + 'px' }"
        @mousedown.stop
        @click.stop
      >
        <ChannelStylePicker
          :color="channel.color"
          :icon-name="channel.iconName"
          @update:color="(v) => updateChannelStyle({ color: v })"
          @update:icon-name="(v) => updateChannelStyle({ iconName: v })"
        />
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 160ms;
}

.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background 160ms;
}

.card:hover::before {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
}

.card--active::before {
  background: var(--accent);
}

.card--child {
  margin-left: 20px;
}

.card__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}
.card__icon svg {
  width: 13px;
  height: 13px;
}

.card__text {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card__name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.card:hover .card__name {
  color: var(--ink);
}
.card--active .card__name {
  color: var(--ink);
  font-weight: 700;
}

.card__name-input {
  flex: 1 1 0;
  min-width: 0;
  background: var(--surface-tinted-strong);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  outline: none;
  letter-spacing: -0.01em;
}

.card__icon {
  border: none;
  cursor: pointer;
}
.card__icon:hover {
  transform: scale(1.06);
  transition: transform 0.12s;
}

.card__forum-chevron {
  flex-shrink: 0;
  opacity: 0.55;
  transition: transform 160ms;
}
.card__forum-chevron--open {
  transform: rotate(0deg);
  opacity: 0.9;
}
.card__forum-chevron:not(.card__forum-chevron--open) {
  transform: rotate(-90deg);
}

.card__unread {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  background: var(--accent-rose);
  color: #fff;
  letter-spacing: -0.02em;
}

.card__stat {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 36px;
  line-height: 1;
}
.card__stat-num {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.card__stat-label {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-top: 2px;
}
</style>

<style>
.style-picker__veil {
  position: fixed;
  inset: 0;
  z-index: 80;
}
.style-picker__pop {
  position: fixed;
  z-index: 81;
  width: 220px;
  padding: 14px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-tile);
  box-shadow: var(--shadow-lift);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  color: var(--ink);
}
</style>
