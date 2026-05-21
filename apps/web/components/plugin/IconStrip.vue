<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useServerPlugins, type ActivePluginItem } from '~/composables/useServerPlugins';
import { usePluginPanelsStore } from '~/stores/pluginPanels';

const props = defineProps<{ serverId: string }>();

const { listActive } = useServerPlugins();
const panels = usePluginPanelsStore();
const plugins = ref<ActivePluginItem[]>([]);

interface IconEntry {
  pluginId: string;
  sidebarItemId: string;
  label: string;
  icon: string;
  connected: boolean;
  pluginName: string;
}

const sidebarItems = computed<IconEntry[]>(() =>
  plugins.value.flatMap((p) =>
    (p.capabilities?.sidebarItems ?? [])
      .filter((item) => (item.placement ?? 'menu') === 'sidebar')
      .map((item) => ({
        pluginId: p.id,
        sidebarItemId: item.id,
        label: item.label,
        icon: item.icon,
        connected: p.connected,
        pluginName: p.name,
      })),
  ),
);

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
    sidebarItemId: item.sidebarItemId,
    serverId: props.serverId,
    label: item.label,
    icon: item.icon,
  });
}

onMounted(load);
</script>

<template>
  <button
    v-for="item in sidebarItems"
    :key="`${item.pluginId}:${item.sidebarItemId}`"
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
