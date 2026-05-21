import { defineStore } from 'pinia';
import type { ComponentTree } from '@nookapp/protocol';

export interface ActivePanel {
  pluginId: string;
  sidebarItemId: string;
  serverId: string;
  label: string;
  icon: string;
}

function keyOf(pluginId: string, sidebarItemId: string): string {
  return `${pluginId}:${sidebarItemId}`;
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

  function setContent(pluginId: string, sidebarItemId: string, children: ComponentTree) {
    const next = new Map(content.value);
    next.set(keyOf(pluginId, sidebarItemId), children);
    content.value = next;
  }

  function contentFor(pluginId: string, sidebarItemId: string): ComponentTree | null {
    return content.value.get(keyOf(pluginId, sidebarItemId)) ?? null;
  }

  return { active, open, close, setContent, contentFor };
});
