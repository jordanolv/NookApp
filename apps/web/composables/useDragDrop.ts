import { computed, ref } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';

export interface DragItem {
  id: string;
  name: string;
  iconUrl: string | null;
  type: ChannelPublic['type'];
}

// Pointer must move past this distance before a click becomes a drag.
const DRAG_THRESHOLD_PX = 5;

/**
 * Pointer-based drag and drop. Drop zones are any element with a
 * `data-drop-target` attribute; its value is passed back to `onDrop`
 * (use 'none' for the uncategorized zone, a category id otherwise).
 */
export function useDragDrop(
  onDrop: (channelId: string, categoryId: string | null) => Promise<void>,
) {
  const draggingItem = ref<DragItem | null>(null);
  const dropTargetId = ref<string | null>(null);
  const pointerX = ref(0);
  const pointerY = ref(0);
  const justDragged = ref(false);

  const isDragging = computed(() => draggingItem.value !== null);

  let pending: { item: DragItem; startX: number; startY: number } | null = null;

  function start(e: PointerEvent, item: DragItem) {
    if (e.button !== 0) return;
    pending = { item, startX: e.clientX, startY: e.clientY };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
  }

  function onMove(e: PointerEvent) {
    if (!pending) return;

    // Wait until the threshold is crossed before showing drag UI.
    if (!draggingItem.value) {
      const dx = e.clientX - pending.startX;
      const dy = e.clientY - pending.startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      draggingItem.value = pending.item;
    }

    pointerX.value = e.clientX;
    pointerY.value = e.clientY;
    dropTargetId.value = findDropTarget(e.clientX, e.clientY);
  }

  function findDropTarget(x: number, y: number): string | null {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const id = (el as HTMLElement).dataset?.dropTarget;
      if (id !== undefined) return id;
    }
    return null;
  }

  async function onUp() {
    const item = draggingItem.value;
    const target = dropTargetId.value;
    const wasDragging = item !== null;

    cleanup();
    draggingItem.value = null;
    dropTargetId.value = null;
    pending = null;

    if (wasDragging) {
      // Suppress the click event the browser may fire on pointerup.
      justDragged.value = true;
      setTimeout(() => {
        justDragged.value = false;
      }, 50);
    }

    if (item && target !== null) {
      const categoryId = target === 'none' ? null : target;
      await onDrop(item.id, categoryId);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    cleanup();
    draggingItem.value = null;
    dropTargetId.value = null;
    pending = null;
  }

  function cleanup() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('keydown', onKey);
  }

  return {
    isDragging,
    draggingItem,
    dropTargetId,
    pointerX,
    pointerY,
    justDragged,
    start,
  };
}
