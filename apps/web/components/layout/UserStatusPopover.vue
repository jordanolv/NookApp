<script setup lang="ts">
import { computed } from 'vue';
import { Check, Circle, MinusCircle, MoonStar } from 'lucide-vue-next';
import type { Status } from '~/composables/useStatus';

const props = defineProps<{
  manualStatus: Status;
  effectiveStatus: Status;
  autoOverride: 'idle' | 'voice' | null;
}>();

const emit = defineEmits<{
  pick: [status: Status];
  close: [];
}>();

const OPTIONS: Array<{ value: Status; label: string; description: string; icon: typeof Circle }> = [
  {
    value: 'online',
    label: 'En ligne',
    description: 'Disponible',
    icon: Circle,
  },
  {
    value: 'busy',
    label: 'Occupé',
    description: 'Ne pas déranger',
    icon: MinusCircle,
  },
  {
    value: 'away',
    label: 'Absent',
    description: 'AFK',
    icon: MoonStar,
  },
];

const hint = computed(() => {
  if (props.autoOverride === 'idle') return 'Passé en absent automatiquement (inactivité).';
  if (props.autoOverride === 'voice') return 'Passé en occupé automatiquement (en vocal).';
  return null;
});
</script>

<template>
  <div class="status-popover" @click.stop>
    <header class="status-popover__head">Mon statut</header>
    <div class="status-popover__list">
      <button
        v-for="opt in OPTIONS"
        :key="opt.value"
        type="button"
        class="status-popover__item"
        :class="[
          `status-popover__item--${opt.value}`,
          { 'status-popover__item--active': manualStatus === opt.value },
        ]"
        @click="emit('pick', opt.value)"
      >
        <span class="status-popover__dot" :class="`status-popover__dot--${opt.value}`" />
        <span class="status-popover__meta">
          <span class="status-popover__label">{{ opt.label }}</span>
          <span class="status-popover__desc">{{ opt.description }}</span>
        </span>
        <Check v-if="manualStatus === opt.value" :size="14" class="status-popover__check" />
      </button>
    </div>
    <p v-if="hint" class="status-popover__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.status-popover {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 220px;
  padding: 8px;
  border-radius: 12px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 12px 36px rgba(20, 35, 25, 0.45);
}
.status-popover__head {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-muted);
  padding: 2px 6px;
}
.status-popover__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.status-popover__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  transition: background 120ms;
}
.status-popover__item:hover {
  background: var(--surface-tinted);
}
.status-popover__item--active {
  background: var(--surface-tinted-strong);
}
.status-popover__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}
.status-popover__dot--online {
  background: #34d399;
  color: rgba(52, 211, 153, 0.6);
}
.status-popover__dot--busy {
  background: #f87171;
  color: rgba(248, 113, 113, 0.6);
}
.status-popover__dot--away {
  background: #fbbf24;
  color: rgba(251, 191, 36, 0.55);
}
.status-popover__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}
.status-popover__label {
  font-size: 13px;
  font-weight: 600;
}
.status-popover__desc {
  font-size: 11px;
  color: var(--ink-muted);
}
.status-popover__check {
  color: var(--ink-muted);
  flex-shrink: 0;
}
.status-popover__hint {
  margin: 0;
  padding: 6px 8px 2px;
  font-size: 10px;
  color: var(--ink-muted);
  line-height: 1.3;
}
</style>
