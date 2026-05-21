import { defineStore } from 'pinia';
import type { ComponentTree } from '@nookapp/protocol';

export interface ActivePanel {
  pluginId: string;
  featureId: string;
  menuId: string;
  serverId: string;
  label: string;
  icon: string;
}

function keyOf(pluginId: string, featureId: string, menuId: string): string {
  return `${pluginId}:${featureId}:${menuId}`;
}

export const usePluginPanelsStore = defineStore('pluginPanels', () => {
  const active = ref<ActivePanel | null>(null);
  const content = ref<Map<string, ComponentTree>>(new Map());

  function open(panel: ActivePanel) {
    active.value = panel;
  }

  function close() {
    active.value = null;
  }

  function setContent(
    pluginId: string,
    featureId: string,
    menuId: string,
    children: ComponentTree,
  ) {
    const next = new Map(content.value);
    next.set(keyOf(pluginId, featureId, menuId), children);
    content.value = next;
  }

  function contentFor(pluginId: string, featureId: string, menuId: string): ComponentTree | null {
    return content.value.get(keyOf(pluginId, featureId, menuId)) ?? null;
  }

  return { active, open, close, setContent, contentFor };
});
