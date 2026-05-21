import { computed } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export type PinSide = 'left' | 'right';

export interface PluginPin {
  pluginId: string;
  featureId: string;
  menuId: string;
  side?: PinSide;
}

function keyOf(p: PluginPin): string {
  return `${p.pluginId}:${p.featureId}:${p.menuId}`;
}

export function usePluginPins(serverId: () => string) {
  const layout = useUiLayout();

  const storageKey = computed(() => `pluginPins:${serverId()}`);

  const pins = computed<PluginPin[]>(() => {
    const entry = layout.get<UiLayoutEntry>(storageKey.value);
    const raw = (entry as Record<string, unknown> | null)?.json;
    if (typeof raw !== 'string') return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PluginPin[]) : [];
    } catch {
      return [];
    }
  });

  function isPinned(p: PluginPin): boolean {
    const k = keyOf(p);
    return pins.value.some((pin) => keyOf(pin) === k);
  }

  function pinsForSide(side: PinSide): PluginPin[] {
    return pins.value.filter((p) => (p.side ?? 'left') === side);
  }

  function persist(next: PluginPin[]) {
    layout.set(storageKey.value, { json: JSON.stringify(next) } as UiLayoutEntry);
  }

  function toggle(p: PluginPin) {
    const k = keyOf(p);
    const next = pins.value.filter((pin) => keyOf(pin) !== k);
    if (next.length === pins.value.length) next.push({ ...p, side: p.side ?? 'left' });
    persist(next);
  }

  function setSide(p: PluginPin, side: PinSide) {
    const k = keyOf(p);
    const next = pins.value.map((pin) => (keyOf(pin) === k ? { ...pin, side } : pin));
    persist(next);
  }

  return { pins, isPinned, pinsForSide, toggle, setSide };
}
