<script setup lang="ts">
import { MAP_TEMPLATES } from './scene/map-templates';

defineProps<{
  /** Currently highlighted template id (for selection use cases). */
  modelValue?: string;
  /** Tighter card layout for the build panel. */
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [id: string];
  select: [id: string];
}>();

function pick(id: string) {
  emit('update:modelValue', id);
  emit('select', id);
}
</script>

<template>
  <div class="grid gap-2" :class="compact ? 'grid-cols-1' : 'grid-cols-2'" @mousedown.stop>
    <button
      v-for="tpl in MAP_TEMPLATES"
      :key="tpl.id"
      type="button"
      class="flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-transform active:scale-[0.98]"
      :style="{
        background: modelValue === tpl.id ? `${tpl.accent}22` : 'rgba(255,255,255,0.04)',
        boxShadow:
          modelValue === tpl.id
            ? `inset 0 0 0 1.5px ${tpl.accent}`
            : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }"
      @click="pick(tpl.id)"
    >
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-lg"
        :style="{ background: `${tpl.accent}26` }"
      >
        {{ tpl.emoji }}
      </span>
      <span class="min-w-0">
        <span class="block text-[12px] font-semibold leading-tight">{{ tpl.label }}</span>
        <span class="block text-[10px] leading-tight" style="color: var(--ink-faint)">
          {{ tpl.description }}
        </span>
      </span>
    </button>
  </div>
</template>
