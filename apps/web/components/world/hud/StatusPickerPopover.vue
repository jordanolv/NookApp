<script setup lang="ts">
import { ACTIVITY_PRESETS } from '~/components/world/name-tag/constants';
import { useLocalActivity } from '~/composables/useLocalActivity';

defineEmits<{ close: [] }>();

const { localActivity, setLocalActivity } = useLocalActivity();

function pick(emoji: string) {
  setLocalActivity(localActivity.value === emoji ? null : emoji);
}
function clear() {
  setLocalActivity(null);
}
</script>

<template>
  <div class="status-popover" @click.stop>
    <header class="status-popover__head">
      <span>Mon statut</span>
      <button v-if="localActivity" type="button" class="status-popover__clear" @click="clear">
        Effacer
      </button>
    </header>
    <div class="status-popover__grid">
      <button
        v-for="emoji in ACTIVITY_PRESETS"
        :key="emoji"
        type="button"
        class="status-popover__item"
        :class="{ 'status-popover__item--active': localActivity === emoji }"
        @click="pick(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 220px;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 12px 36px rgba(20, 35, 25, 0.45);
}
.status-popover__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
.status-popover__clear {
  border: none;
  background: transparent;
  font-size: 10px;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  color: var(--ink-muted);
  cursor: pointer;
}
.status-popover__clear:hover {
  color: var(--ink);
}
.status-popover__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.status-popover__item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--surface-tinted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition:
    background 120ms,
    border-color 120ms;
}
.status-popover__item:hover {
  background: var(--surface-tinted);
}
.status-popover__item--active {
  background: rgba(99, 102, 241, 0.18);
  border-color: rgba(99, 102, 241, 0.5);
}
</style>
