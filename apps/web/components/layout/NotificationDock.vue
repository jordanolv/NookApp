<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNotificationDock } from '~/composables/useNotificationDock';

const dock = useNotificationDock();
const current = computed(() => dock.current.value);

const expanded = ref(false);

const kindAccent = computed(() => {
  switch (current.value?.kind) {
    case 'success':
      return 'var(--accent-leaf)';
    case 'warn':
      return 'var(--accent-warm)';
    case 'error':
      return 'var(--accent-rose)';
    case 'info':
    default:
      return 'var(--accent-cool)';
  }
});

function onClick() {
  if (!current.value) return;
  current.value.onClick?.();
  dock.dismiss(current.value.id);
}
</script>

<template>
  <Transition name="island">
    <button
      v-if="current"
      type="button"
      class="island"
      :class="{ 'island--expanded': expanded }"
      :title="current.detail ?? current.title"
      @mouseenter="expanded = true"
      @mouseleave="expanded = false"
      @click="onClick"
    >
      <span class="island__dot" :style="{ background: kindAccent }" />
      <span class="island__title">{{ current.title }}</span>
      <Transition name="detail">
        <span v-if="expanded && current.detail" class="island__detail">
          {{ current.detail }}
        </span>
      </Transition>
    </button>
  </Transition>
</template>

<style scoped>
.island {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 12px;
  max-width: 70vw;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--tooltip-bg);
  color: var(--tooltip-ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: var(--shadow-lift);
  transition:
    padding 180ms ease,
    max-width 180ms ease;
}
.island--expanded {
  padding-right: 18px;
}
.island__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 0 currentColor;
  animation: island-pulse 1.8s infinite;
}
@keyframes island-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
  }
}
.island__title {
  white-space: nowrap;
}
.island__detail {
  font-weight: 500;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-left: 1px solid currentColor;
  padding-left: 10px;
  margin-left: 2px;
  max-width: 320px;
}

.island-enter-active,
.island-leave-active {
  transition:
    opacity 200ms ease,
    transform 220ms cubic-bezier(0.4, 1.6, 0.6, 1);
}
.island-enter-from,
.island-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.92);
}

.detail-enter-active,
.detail-leave-active {
  transition:
    opacity 140ms ease,
    max-width 180ms ease;
}
.detail-enter-from,
.detail-leave-to {
  opacity: 0;
  max-width: 0;
}
</style>
