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
    class="pointer-events-none absolute z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold text-white/95 whitespace-nowrap shadow-[0_4px_10px_rgba(0,0,0,0.45)] backdrop-blur-md bg-zinc-900/70 ring-1 ring-white/10"
    :style="{ left: x + 'px', top: y + 'px' }"
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
