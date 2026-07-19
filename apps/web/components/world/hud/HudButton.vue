<script setup lang="ts">
defineProps<{
  active?: boolean;
  badge?: number;
  title?: string;
}>();

defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    type="button"
    class="hud-btn"
    :class="{ 'hud-btn--active': active }"
    :title="title"
    @click="(e) => $emit('click', e)"
  >
    <slot />
    <span v-if="badge && badge > 0" class="hud-btn__badge">{{ badge > 99 ? '99+' : badge }}</span>
  </button>
</template>

<style scoped>
.hud-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.hud-btn:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}
.hud-btn--active {
  background: var(--ink);
  color: var(--ink-inverse);
}
.hud-btn__badge {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent-rose);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: -0.02em;
  border: 2px solid var(--surface-strong);
}
</style>
