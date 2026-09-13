<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  icon: Component;
  title: string;
  count?: number | string;
  ghost?: boolean;
}>();
</script>

<template>
  <article class="card" :class="{ 'card--ghost': ghost }">
    <header class="card__head">
      <component :is="icon" :size="13" :stroke-width="2.2" class="card__head-icon" />
      <h2 class="card__title">{{ title }}</h2>
      <span v-if="count !== undefined" class="card__count">{{ count }}</span>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.card {
  border-radius: 14px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.card--ghost {
  background: var(--surface);
  border-style: dashed;
}

.card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--surface-divider);
  background: var(--surface-tinted);
}

.card__head-icon {
  color: var(--ink-muted);
}

.card__title {
  flex: 1;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.card__count {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-muted);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-tinted);
}
</style>
