import { computed } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

type OrderEntry = UiLayoutEntry & { order: string[] };

export type SidebarScope = 'right' | 'left';

/**
 * Persist a per-scope section ordering (array of section keys) in the user's
 * ui_layout state. Apply it on the fly to reorder a sections array; missing
 * keys keep their author-defined order and new sections fall in at the end.
 */
export function useSidebarSectionOrder(scope: SidebarScope = 'right') {
  const layout = useUiLayout();
  const storageKey = `ui:sidebar:${scope}:order`;

  const order = computed<string[]>(() => {
    const entry = layout.get<OrderEntry>(storageKey);
    return Array.isArray(entry?.order) ? entry.order.filter((k) => typeof k === 'string') : [];
  });

  function setOrder(keys: string[]) {
    layout.set(storageKey, { order: keys } as OrderEntry);
  }

  function applyOrder<T extends { key: string }>(sections: T[]): T[] {
    const stored = order.value;
    if (!stored.length) return sections;
    const byKey = new Map(sections.map((s) => [s.key, s]));
    const out: T[] = [];
    for (const k of stored) {
      const s = byKey.get(k);
      if (s) {
        out.push(s);
        byKey.delete(k);
      }
    }
    for (const s of byKey.values()) out.push(s);
    return out;
  }

  function move(fromKey: string, toKey: string, allKeys: string[]) {
    if (fromKey === toKey) return;
    const base = order.value.length ? [...order.value] : [...allKeys];
    for (const k of allKeys) if (!base.includes(k)) base.push(k);
    const fromIdx = base.indexOf(fromKey);
    if (fromIdx === -1) return;
    base.splice(fromIdx, 1);
    let toIdx = base.indexOf(toKey);
    if (toIdx === -1) toIdx = base.length;
    base.splice(toIdx, 0, fromKey);
    setOrder(base);
  }

  return { order, setOrder, applyOrder, move };
}
