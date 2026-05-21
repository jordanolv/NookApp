<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useServerPlugins, type ActivePluginItem } from '~/composables/useServerPlugins';
import { usePluginPanelsStore } from '~/stores/pluginPanels';

const props = defineProps<{ serverId: string }>();

const { listActive } = useServerPlugins();
const panels = usePluginPanelsStore();

const plugins = ref<ActivePluginItem[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    plugins.value = await listActive(props.serverId);
  } finally {
    loading.value = false;
  }
}

function shouldShowItem(item: { placement?: 'sidebar' | 'menu' }): boolean {
  return (item.placement ?? 'menu') === 'menu';
}

function open(plugin: ActivePluginItem, item: { id: string; label: string; icon: string }) {
  if (!plugin.connected) return;
  panels.open({
    pluginId: plugin.id,
    sidebarItemId: item.id,
    serverId: props.serverId,
    label: item.label,
    icon: item.icon,
  });
}

onMounted(load);

defineExpose({ refresh: load });
</script>

<template>
  <div class="px-2 py-1 flex flex-col gap-0.5">
    <template v-for="plugin in plugins" :key="plugin.id">
      <button
        v-for="item in (plugin.capabilities?.sidebarItems ?? []).filter(shouldShowItem)"
        :key="`${plugin.id}:${item.id}`"
        type="button"
        class="entry"
        :disabled="!plugin.connected"
        :class="{ 'entry--offline': !plugin.connected }"
        @click="open(plugin, item)"
      >
        <span class="entry__icon">{{ item.icon }}</span>
        <span class="entry__label">{{ item.label }}</span>
        <span class="entry__plugin">{{ plugin.name }}</span>
        <span v-if="!plugin.connected" class="entry__badge">offline</span>
      </button>
    </template>

    <p
      v-if="!loading && plugins.length === 0"
      class="text-[11px] py-2 px-1"
      style="color: rgba(255, 255, 255, 0.35)"
    >
      Aucun plugin installé.
    </p>
  </div>
</template>

<style scoped>
.entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  transition: background 120ms;
}
.entry:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}
.entry--offline {
  opacity: 0.4;
  cursor: not-allowed;
}
.entry__icon {
  width: 18px;
  text-align: center;
  font-size: 13px;
}
.entry__label {
  flex: 1;
  font-weight: 500;
}
.entry__plugin {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
}
.entry__badge {
  font-size: 9px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
</style>
