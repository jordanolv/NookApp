<script setup lang="ts">
import { computed } from 'vue';
import { Sparkles } from 'lucide-vue-next';
import { CHANNEL_COLOR_PRESETS } from '~/utils/channel-theme';
import { CHANNEL_ICON_LIBRARY, CHANNEL_ICON_NAMES } from '~/utils/channel-icons';

defineProps<{
  color: string | null;
  iconName: string | null;
}>();

const emit = defineEmits<{
  'update:color': [value: string | null];
  'update:iconName': [value: string | null];
}>();

const iconEntries = computed(() =>
  CHANNEL_ICON_NAMES.map((name) => ({ name, component: CHANNEL_ICON_LIBRARY[name]! })),
);
</script>

<template>
  <div class="style-picker">
    <section class="style-section">
      <header class="style-section__head">
        <span class="style-section__label">Couleur</span>
        <button
          v-if="color"
          type="button"
          class="style-section__reset"
          @click="emit('update:color', null)"
        >
          Auto
        </button>
      </header>
      <div class="swatches">
        <button
          type="button"
          class="swatch swatch--auto"
          :class="{ 'swatch--active': color === null }"
          title="Couleur automatique"
          @click="emit('update:color', null)"
        >
          <Sparkles :size="13" />
        </button>
        <button
          v-for="preset in CHANNEL_COLOR_PRESETS"
          :key="preset.hex"
          type="button"
          class="swatch"
          :class="{ 'swatch--active': color?.toLowerCase() === preset.hex }"
          :style="{ background: `rgb(${preset.rgb})` }"
          :title="preset.hex"
          @click="emit('update:color', preset.hex)"
        />
      </div>
    </section>

    <section class="style-section">
      <header class="style-section__head">
        <span class="style-section__label">Icône</span>
        <button
          v-if="iconName"
          type="button"
          class="style-section__reset"
          @click="emit('update:iconName', null)"
        >
          Auto
        </button>
      </header>
      <div class="icons">
        <button
          type="button"
          class="icon-btn icon-btn--auto"
          :class="{ 'icon-btn--active': iconName === null }"
          title="Icône automatique"
          @click="emit('update:iconName', null)"
        >
          <Sparkles :size="14" />
        </button>
        <button
          v-for="entry in iconEntries"
          :key="entry.name"
          type="button"
          class="icon-btn"
          :class="{ 'icon-btn--active': iconName === entry.name }"
          :title="entry.name"
          @click="emit('update:iconName', entry.name)"
        >
          <component :is="entry.component" :size="15" stroke-width="2.1" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.style-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.style-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.style-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.style-section__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
.style-section__reset {
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-faint);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition:
    background 0.12s,
    color 0.12s;
}
.style-section__reset:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.swatch {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: var(--surface-tinted);
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--ink-muted);
  transition:
    transform 0.12s,
    border-color 0.12s;
}
.swatch:hover {
  transform: translateY(-1px);
}
.swatch--active {
  border-color: var(--ink);
}
.swatch--auto {
  background: var(--surface-tinted);
}

.icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 6px;
}
.icon-btn {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--surface-tinted);
  color: var(--ink-soft);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}
.icon-btn:hover {
  background: var(--surface-tinted-strong);
  color: var(--ink);
}
.icon-btn--active {
  background: var(--ink);
  color: var(--ink-inverse);
  border-color: var(--ink);
}
.icon-btn--auto {
  color: var(--ink-muted);
}
</style>
