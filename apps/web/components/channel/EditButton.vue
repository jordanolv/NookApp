<script setup lang="ts">
import { Settings } from 'lucide-vue-next';

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-tinted"
    style="color: var(--ink-muted)"
    @click.stop="$emit('click')"
  >
    <Settings :size="12" :stroke-width="1.75" />
  </button>
</template>
