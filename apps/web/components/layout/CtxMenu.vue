<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

defineProps<{ x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();

function close() {
  emit('close');
}
onMounted(() => window.addEventListener('mousedown', close));
onUnmounted(() => window.removeEventListener('mousedown', close));
</script>

<template>
  <Teleport to="body">
    <div class="ctx-menu" :style="{ left: x + 'px', top: y + 'px' }" @mousedown.stop>
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 140px;
  padding: 4px;
  border-radius: 10px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lift);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.ctx-menu :deep(.ctx-menu__item) {
  display: block;
  width: 100%;
  padding: 6px 10px;
  text-align: left;
  font-size: 12px;
  color: var(--ink-soft);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 100ms;
}
.ctx-menu :deep(.ctx-menu__item:hover) {
  background: var(--surface-tinted-strong);
  color: var(--ink);
}
</style>
