<script setup lang="ts">
defineProps<{ label: string; x: number; y: number }>();
</script>

<template>
  <div
    class="pointer-events-none absolute z-10 -translate-x-1/2 rounded-full bg-indigo-600/90 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shadow-lg"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    {{ label }}
  </div>
</template>
