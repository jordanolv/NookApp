<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { useHudVisibility } from '~/composables/useHudVisibility';

const props = defineProps<{
  channels: ChannelPublic[];
  currentVoiceId: string | null;
  canManage?: boolean;
}>();

const emit = defineEmits<{
  select: [channel: ChannelPublic, event: MouseEvent];
  'create-voice': [];
}>();

const hudVis = useHudVisibility();
const hidden = hudVis.isHidden('ui:voiceHidden');

function toggle() {
  hudVis.toggle('ui:voiceHidden');
}

const sorted = computed(() => [...props.channels].sort((a, b) => a.position - b.position));
</script>

<template>
  <section class="voice-section">
    <header class="voice-section__header" :class="{ 'voice-section__header--collapsed': hidden }">
      <button type="button" class="voice-section__toggle" @click="toggle">
        <ChevronDown
          :size="12"
          class="voice-section__chevron"
          :class="{ 'voice-section__chevron--collapsed': hidden }"
        />
        <span>Salons vocaux</span>
      </button>
      <button
        v-if="canManage"
        type="button"
        class="voice-section__add"
        title="Créer un salon vocal"
        @click.stop="emit('create-voice')"
      >
        +
      </button>
    </header>
    <div v-if="!hidden" class="voice-section__body">
      <LayoutVoiceChannelEntry
        v-for="ch in sorted"
        :key="ch.id"
        :channel="ch"
        :is-current="ch.id === currentVoiceId"
        @click="(e) => emit('select', ch, e)"
      />
    </div>
  </section>
</template>

<style scoped>
.voice-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.voice-section__header {
  display: flex;
  align-items: center;
  padding: 8px 6px 4px 8px;
  gap: 4px;
}
.voice-section__toggle {
  flex: 1;
}
.voice-section__add {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
  transition:
    background 0.12s,
    color 0.12s,
    opacity 0.15s;
}
.voice-section__add:hover {
  background: var(--surface-tinted);
  color: var(--ink);
  opacity: 1;
}
.voice-section__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s;
}
.voice-section__toggle:hover {
  color: var(--ink);
}
.voice-section__chevron {
  transition: transform 120ms;
}
.voice-section__chevron--collapsed {
  transform: rotate(-90deg);
}
.voice-section__body {
  display: flex;
  flex-direction: column;
  padding-bottom: 4px;
}
</style>
