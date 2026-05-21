<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import type { ComponentTree } from '@nookapp/protocol';
import { usePluginPanelsStore } from '~/stores/pluginPanels';

const panels = usePluginPanelsStore();
const socket = useSocket();

const activeChildren = computed<ComponentTree | null>(() => {
  if (!panels.active) return null;
  return panels.contentFor(panels.active.pluginId, panels.active.featureId, panels.active.menuId);
});

function onPanelUpdate(payload: {
  pluginId: string;
  featureId: string;
  menuId: string;
  serverId: string;
  children: ComponentTree;
}) {
  panels.setContent(payload.pluginId, payload.featureId, payload.menuId, payload.children);
}

function emitInteraction(actionId: string) {
  const p = panels.active;
  if (!p) return;
  raw?.emit('plugin:interaction', {
    surface: 'panel',
    surfaceId: `panel:${p.pluginId}:${p.featureId}:${p.menuId}`,
    featureId: p.featureId,
    actionId,
    serverId: p.serverId,
  });
}

function close() {
  panels.close();
}

let raw: ReturnType<typeof socket.connect> | null = null;

watch(
  () => panels.active,
  (p) => {
    if (!p || !raw) return;
    raw.emit('plugin:panel:open', {
      pluginId: p.pluginId,
      featureId: p.featureId,
      menuId: p.menuId,
      serverId: p.serverId,
    });
  },
);

onMounted(() => {
  raw = socket.connect();
  raw.on('plugin:panel:update', onPanelUpdate);
});

onUnmounted(() => {
  raw?.off('plugin:panel:update', onPanelUpdate);
});
</script>

<template>
  <UiFloatingWindow
    v-if="panels.active"
    :title="`${panels.active.icon} ${panels.active.label}`"
    :initial-width="420"
    :initial-height="480"
    :min-width="320"
    :min-height="240"
    @close="close"
  >
    <div class="p-5 flex flex-col gap-3 h-full overflow-y-auto">
      <PluginComponentRenderer
        v-for="(child, i) in activeChildren ?? []"
        :key="i"
        :node="child"
        @action="emitInteraction"
      />
      <div
        v-if="!activeChildren || activeChildren.length === 0"
        class="text-center py-8 text-xs"
        style="color: rgba(255, 255, 255, 0.4)"
      >
        Loading…
      </div>
    </div>
  </UiFloatingWindow>
</template>
