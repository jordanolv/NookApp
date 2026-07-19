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
  background: rgba(15, 16, 24, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.card--ghost {
  background: rgba(255, 255, 255, 0.02);
  border-style: dashed;
}

.card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

.card__head-icon {
  color: rgba(165, 180, 252, 0.85);
}

.card__title {
  flex: 1;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.85);
}

.card__count {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}
</style>
