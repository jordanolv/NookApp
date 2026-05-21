<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, ArrowRight } from 'lucide-vue-next';
import { useServerPlugins, type ActivePluginItem } from '~/composables/useServerPlugins';
import { usePluginPins, type PinSide, type PluginPin } from '~/composables/usePluginPins';

const props = defineProps<{ serverId: string; side: PinSide }>();

const { listActive } = useServerPlugins();
const pins = usePluginPins(() => props.serverId);
const plugins = ref<ActivePluginItem[]>([]);

interface Row {
  pin: PluginPin;
  label: string;
  icon: string;
}

const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  for (const pin of pins.pinsForSide(props.side)) {
    const plugin = plugins.value.find((p) => p.id === pin.pluginId);
    if (!plugin) continue;
    const feature = plugin.capabilities?.features.find((f) => f.id === pin.featureId);
    if (!feature) continue;
    const menu = feature.menus.find((m) => m.id === pin.menuId);
    if (!menu) continue;
    out.push({ pin, label: menu.label, icon: menu.icon });
  }
  return out;
});

async function load() {
  try {
    plugins.value = await listActive(props.serverId);
  } catch {
    plugins.value = [];
  }
}

onMounted(load);
</script>

<template>
  <li
    v-for="row in rows"
    :key="`${row.pin.pluginId}:${row.pin.featureId}:${row.pin.menuId}`"
    class="row"
  >
    <span class="row__icon">{{ row.icon }}</span>
    <span class="row__label">{{ row.label }}</span>
    <span class="row__arrows">
      <button
        type="button"
        class="row__arrow"
        :class="{ 'row__arrow--active': side === 'left' }"
        :disabled="side === 'left'"
        title="Placer à gauche"
        @click="pins.setSide(row.pin, 'left')"
      >
        <ArrowLeft :size="13" :stroke-width="2.4" />
      </button>
      <button
        type="button"
        class="row__arrow"
        :class="{ 'row__arrow--active': side === 'right' }"
        :disabled="side === 'right'"
        title="Placer à droite"
        @click="pins.setSide(row.pin, 'right')"
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
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}
.row__icon {
  width: 16px;
  text-align: center;
}
.row__label {
  flex: 1;
}
.row__arrows {
  display: inline-flex;
  gap: 2px;
}
.row__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: background 120ms;
}
.row__arrow:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.95);
}
.row__arrow--active {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
  cursor: default;
}
.row__arrow:disabled:not(.row__arrow--active) {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
