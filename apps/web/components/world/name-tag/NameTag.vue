<script setup lang="ts">
import { computed } from 'vue';
import { NAME_TAG_STATUS_COLORS, type NameTagStatus } from './constants';

const props = defineProps<{
  name: string;
  status: NameTagStatus;
  mediaIconHtml?: string;
  activity?: string | null;
  x: number;
  y: number;
}>();

const dotStyle = computed(() => {
  const c = NAME_TAG_STATUS_COLORS[props.status];
  return { backgroundColor: c.bg, boxShadow: `0 0 5px ${c.glow}` };
});
</script>

<template>
  <div
    class="pointer-events-none absolute z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-md px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap"
    :style="{
      left: x + 'px',
      top: y + 'px',
      background: 'var(--surface)',
      color: 'var(--ink)',
      border: '1px solid var(--surface-border)',
      backdropFilter: 'blur(28px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
      boxShadow: 'var(--shadow-soft)',
    }"
  >
    <span
      v-if="activity"
      class="flex items-center justify-center text-[11px] leading-none flex-shrink-0"
    >
      {{ activity }}
    </span>
    <span
      v-else
      class="w-[7px] h-[7px] rounded-full flex-shrink-0 transition-colors duration-150"
      :style="dotStyle"
    />
    <span class="tracking-wide">{{ name }}</span>
    <span v-if="mediaIconHtml" class="flex items-center gap-0.5" v-html="mediaIconHtml" />
  </div>
</template>
