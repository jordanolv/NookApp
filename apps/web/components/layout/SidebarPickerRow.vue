<script setup lang="ts">
import { ArrowLeft, ArrowRight } from 'lucide-vue-next';
import type { Component } from 'vue';

const props = defineProps<{
  icon: Component;
  label: string;
  side: 'left' | 'right';
  lockOther?: boolean;
  lockReason?: string;
}>();

defineEmits<{ toggle: [] }>();

const leftTitle = computed(() =>
  props.side === 'right' && props.lockOther
    ? (props.lockReason ?? 'Indisponible')
    : 'Placer à gauche',
);
const rightTitle = computed(() =>
  props.side === 'left' && props.lockOther
    ? (props.lockReason ?? 'Indisponible')
    : 'Placer à droite',
);
</script>

<template>
  <li class="row">
    <component :is="icon" :size="13" class="row__icon" />
    <span class="row__label">{{ label }}</span>
    <span class="row__arrows">
      <button
        type="button"
        class="row__arrow"
        :class="{ 'row__arrow--active': side === 'left' }"
        :disabled="side === 'left' || (side === 'right' && lockOther)"
        :title="leftTitle"
        @click="$emit('toggle')"
      >
        <ArrowLeft :size="13" :stroke-width="2.4" />
      </button>
      <button
        type="button"
        class="row__arrow"
        :class="{ 'row__arrow--active': side === 'right' }"
        :disabled="side === 'right' || (side === 'left' && lockOther)"
        :title="rightTitle"
        @click="$emit('toggle')"
      >
        <ArrowRight :size="13" :stroke-width="2.4" />
      </button>
    </span>
  </li>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.row__icon {
  color: rgba(165, 180, 252, 0.85);
  flex-shrink: 0;
}

.row__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row__arrows {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 2px;
}

.row__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  border-radius: 5px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  transition:
    background 120ms,
    color 120ms;
}

.row__arrow:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}

.row__arrow--active {
  background: #5865f2;
  color: white;
  cursor: default;
}

.row__arrow:disabled {
  cursor: default;
}
</style>
