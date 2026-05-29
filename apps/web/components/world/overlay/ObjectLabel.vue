<script setup lang="ts">
defineProps<{ label: string; x: number; y: number }>();
</script>

<template>
  <div
    class="pointer-events-none absolute z-10 -translate-x-1/2"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div
      class="rounded-md px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap"
      :style="{
        background: 'var(--surface)',
        color: 'var(--ink)',
        border: '1px solid var(--surface-border)',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        boxShadow: 'var(--shadow-soft)',
      }"
    >
      {{ label }}
    </div>
  </div>
</template>
