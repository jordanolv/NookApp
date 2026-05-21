<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useServerPlugins, type ActivePluginItem } from '~/composables/useServerPlugins';
import { usePluginPanelsStore } from '~/stores/pluginPanels';
import { usePluginPins, type PinSide } from '~/composables/usePluginPins';

const props = defineProps<{ serverId: string; side: PinSide }>();

const { listActive } = useServerPlugins();
const panels = usePluginPanelsStore();
const pins = usePluginPins(() => props.serverId);
const plugins = ref<ActivePluginItem[]>([]);

interface IconEntry {
  pluginId: string;
  featureId: string;
  menuId: string;
  label: string;
  icon: string;
  connected: boolean;
  pluginName: string;
}

const pinnedIcons = computed<IconEntry[]>(() => {
  const out: IconEntry[] = [];
  for (const pin of pins.pinsForSide(props.side)) {
    const plugin = plugins.value.find((p) => p.id === pin.pluginId);
    if (!plugin) continue;
    const feature = plugin.capabilities?.features.find((f) => f.id === pin.featureId);
    if (!feature) continue;
    const menu = feature.menus.find((m) => m.id === pin.menuId);
    if (!menu) continue;
    out.push({
      pluginId: plugin.id,
      featureId: feature.id,
      menuId: menu.id,
      label: menu.label,
      icon: menu.icon,
      connected: plugin.connected,
      pluginName: plugin.name,
    });
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

function open(item: IconEntry) {
  if (!item.connected) return;
  panels.open({
    pluginId: item.pluginId,
    featureId: item.featureId,
    menuId: item.menuId,
    serverId: props.serverId,
    label: item.label,
    icon: item.icon,
  });
}

onMounted(load);
</script>

<template>
  <button
    v-for="item in pinnedIcons"
    :key="`${item.pluginId}:${item.featureId}:${item.menuId}`"
    type="button"
    class="plugin-icon-btn"
    :class="{ 'plugin-icon-btn--offline': !item.connected }"
    :title="`${item.label} — ${item.pluginName}${item.connected ? '' : ' (offline)'}`"
    :disabled="!item.connected"
    @click="open(item)"
  >
    <span class="plugin-icon-btn__emoji">{{ item.icon }}</span>
  </button>
</template>

<style scoped>
.plugin-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 2px 0;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 120ms;
}
.plugin-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.plugin-icon-btn--offline {
  opacity: 0.35;
  cursor: not-allowed;
}
.plugin-icon-btn__emoji {
  font-size: 15px;
  line-height: 1;
}
</style>
