import { computed, ref } from 'vue';
import type { Component } from 'vue';

export type NotificationKind = 'info' | 'success' | 'warn' | 'error';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  /** Short headline shown by default (collapsed dynamic-island mode). */
  title: string;
  /** Optional longer detail shown when expanded / on hover. */
  detail?: string;
  /** Optional leading lucide icon. */
  icon?: Component;
  /** Auto-dismiss delay in ms. 0 or undefined = sticky until dismissed. */
  timeoutMs?: number;
  /** Hook fired when the user clicks the notification. */
  onClick?: () => void;
};

type InternalItem = NotificationItem & { _timer?: ReturnType<typeof setTimeout> };

const queue = ref<InternalItem[]>([]);

function genId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function dismiss(id: string): void {
  const idx = queue.value.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const item = queue.value[idx]!;
  if (item._timer) clearTimeout(item._timer);
  queue.value.splice(idx, 1);
}

function push(spec: Omit<NotificationItem, 'id'>): string {
  const id = genId();
  const item: InternalItem = { ...spec, id };
  if (spec.timeoutMs && spec.timeoutMs > 0) {
    item._timer = setTimeout(() => dismiss(id), spec.timeoutMs);
  }
  queue.value.push(item);
  return id;
}

function clear(): void {
  for (const n of queue.value) {
    if (n._timer) clearTimeout(n._timer);
  }
  queue.value = [];
}

/**
 * Global dynamic-island style notification queue.
 * Push transient notifications from anywhere; the NotificationDock component
 * renders the current head of queue near the top of the screen.
 */
export function useNotificationDock() {
  return {
    items: computed(() => queue.value as readonly NotificationItem[]),
    current: computed(() => (queue.value[0] ?? null) as NotificationItem | null),
    push,
    dismiss,
    clear,
  };
}
