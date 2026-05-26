<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Mic } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { voicePresence } from '~/composables/voice/state';
import { useVoiceActiveTime } from '~/composables/useVoiceActiveTime';
import { useChannelEditing } from '~/composables/useChannelEditing';
import { useChannels } from '~/composables/useChannels';
import { accentRgb } from '~/utils/channel-theme';

const props = defineProps<{
  channel: ChannelPublic;
  isCurrent: boolean;
}>();

defineEmits<{ click: [event: MouseEvent] }>();

const { formatElapsed } = useVoiceActiveTime();

const participants = computed(() => voicePresence.value.get(props.channel.id) ?? []);
const count = computed(() => participants.value.length);
const capacity = 8;
const memberNames = computed(() => participants.value.map((p) => p.name).join(', '));
const elapsed = computed(() => formatElapsed(props.channel.id));
const subText = computed(() => memberNames.value || elapsed.value);

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
    /* ignore */
  }
}

function cancelEdit() {
  draftName.value = props.channel.name;
  channelEditing.stopEditing();
}

const accent = computed(() => accentRgb('voice', props.channel.id));
const iconStyle = computed(() => ({
  background: `linear-gradient(135deg, rgba(${accent.value}, 1) 0%, rgba(${accent.value}, 0.75) 100%)`,
  boxShadow: `inset 0 -2px 0 rgba(0, 0, 0, 0.18), 0 2px 6px rgba(${accent.value}, 0.35)`,
}));
const accentVar = computed(() => ({ '--accent': `rgb(${accent.value})` }));
</script>

<template>
  <button
    type="button"
    class="voice-entry"
    :class="{ 'voice-entry--active': isCurrent }"
    :style="accentVar"
    @click="$emit('click', $event)"
  >
    <span class="voice-entry__icon" :style="iconStyle">
      <Mic :size="12" :stroke-width="2.4" />
    </span>
    <span class="voice-entry__text">
      <input
        v-if="isEditingName"
        ref="inputEl"
        v-model="draftName"
        type="text"
        class="voice-entry__name-input"
        maxlength="100"
        @click.stop
        @keydown.enter.prevent="commitName"
        @keydown.esc.prevent="cancelEdit"
        @blur="commitName"
      />
      <span v-else class="voice-entry__name">{{ channel.name }}</span>
      <span v-if="subText && !isEditingName" class="voice-entry__sub">{{ subText }}</span>
    </span>
    <span class="voice-entry__count">{{ count }}/{{ capacity }}</span>
  </button>
</template>

<style scoped>
.voice-entry {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--ink-soft);
  transition:
    background 120ms,
    color 120ms;
}
.voice-entry::before {
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
.voice-entry:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}
.voice-entry--active {
  background: var(--surface-tinted-strong);
  color: var(--ink);
}
.voice-entry--active::before {
  background: var(--accent);
}
.voice-entry__icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 7px;
  color: #fff;
}
.voice-entry__text {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.voice-entry__name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.voice-entry__name-input {
  width: 100%;
  background: var(--surface-tinted-strong);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  outline: none;
}
.voice-entry--active .voice-entry__name {
  font-weight: 700;
}
.voice-entry__sub {
  font-size: 11px;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.voice-entry__count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
  background: var(--surface-tinted-strong);
  padding: 2px 8px;
  border-radius: 999px;
}
</style>
