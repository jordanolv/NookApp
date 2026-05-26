<script setup lang="ts">
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { EMOJI_CATEGORIES } from '~/utils/emoji-data';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  pick: [emoji: string];
}>();

const wrapperEl = ref<HTMLElement | null>(null);
const activeCat = ref(0);

function toggle() {
  emit('update:open', !props.open);
}

function onPick(emoji: string) {
  emit('pick', emoji);
  emit('update:open', false);
}

onClickOutside(wrapperEl, () => {
  if (props.open) emit('update:open', false);
});
</script>

<template>
  <div ref="wrapperEl" class="relative">
    <button
      class="action-btn text-base"
      :class="open ? 'text-accent-violet' : ''"
      title="Emoji"
      @click="toggle"
    >
      😀
    </button>
    <div v-if="open" class="popup emoji-popup">
      <div class="flex gap-0.5 p-1.5 pb-1" style="border-bottom: 1px solid var(--surface-border)">
        <button
          v-for="(cat, i) in EMOJI_CATEGORIES"
          :key="i"
          class="text-sm px-1 py-0.5 rounded transition-colors"
          :class="
            activeCat === i
              ? 'bg-accent-violet/30 text-white'
              : 'opacity-60 hover:opacity-100 hover:bg-surface-tinted'
          "
          :title="cat.name"
          @click="activeCat = i"
        >
          {{ cat.label }}
        </button>
      </div>
      <div class="grid grid-cols-5 gap-0.5 p-1.5 overflow-y-auto" style="max-height: 170px">
        <button
          v-for="emoji in EMOJI_CATEGORIES[activeCat]?.emojis"
          :key="emoji"
          class="text-xl rounded hover:bg-surface-tinted-strong transition-colors p-1 flex items-center justify-center leading-none"
          @click="onPick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 0.75rem;
  transition:
    background 0.15s,
    color 0.15s;
  color: var(--ink-muted);
}
.action-btn:hover {
  background: var(--surface-border);
  color: var(--ink);
}

.popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  border-radius: 12px;
  overflow: hidden;
  z-index: 50;
  background: rgba(16, 16, 26, 0.96);
  border: 1px solid var(--surface-tinted);
  backdrop-filter: blur(24px);
  box-shadow: 0 12px 40px rgba(20, 35, 25, 0.55);
}
.emoji-popup {
  width: 232px;
}
</style>
