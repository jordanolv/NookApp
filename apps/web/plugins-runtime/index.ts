import type { Component } from 'vue';

export interface PanelEntry {
  pluginId: string;
  id: string;
  label: string;
  icon: string;
  component: Component;
}

const registry = new Map<string, Component>();
const activePanels: PanelEntry[] = [];

export function registerPluginComponent(name: string, component: Component) {
  registry.set(name, component);
}

export function mountPluginPanels(
  pluginId: string,
  panels: { id: string; label: string; icon: string; component: string }[],
) {
  // Remove any previously registered panels for this plugin
  const existing = activePanels.findIndex((p) => p.pluginId === pluginId);
  if (existing !== -1) activePanels.splice(existing, 1);

  for (const spec of panels) {
    const component = registry.get(spec.component);
    if (!component) continue;
    activePanels.push({ pluginId, ...spec, component });
  }
}

export function unmountPluginPanels(pluginId: string) {
  const idx = activePanels.findIndex((p) => p.pluginId === pluginId);
  while (idx !== -1) {
    activePanels.splice(idx, 1);
  }
}

export function getActivePanels(): PanelEntry[] {
  return activePanels;
}
