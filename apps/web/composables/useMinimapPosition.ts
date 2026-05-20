import { onMounted, onUnmounted, ref } from 'vue';
import type { UiLayoutEntry } from '@nookapp/protocol';

export function useMinimapPosition(opts: {
  storageKey: string;
  size: number;
  defaultZoom: number;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
}) {
  const uiLayout = useUiLayout();
  const pos = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomTiles = ref<number>(opts.defaultZoom);
  const dragging = ref(false);
  const dragStart = { px: 0, py: 0, mx: 0, my: 0, moved: false };

  function defaultPos(): { x: number; y: number } {
    if (!import.meta.client) return { x: 16, y: 16 };
    return { x: Math.max(16, window.innerWidth - opts.size - 16), y: 16 };
  }

  function clampToViewport(x: number, y: number): { x: number; y: number } {
    if (!import.meta.client) return { x, y };
    return {
      x: Math.max(0, Math.min(window.innerWidth - opts.size, x)),
      y: Math.max(0, Math.min(window.innerHeight - opts.size, y)),
    };
  }

  function onWindowResize() {
    pos.value = clampToViewport(pos.value.x, pos.value.y);
  }

  function persist() {
    uiLayout.set(opts.storageKey, {
      x: pos.value.x,
      y: pos.value.y,
      zoom: zoomTiles.value,
    } as unknown as UiLayoutEntry);
  }

  function zoomIn() {
    zoomTiles.value = Math.max(opts.zoomMin, zoomTiles.value - opts.zoomStep);
    persist();
  }

  function zoomOut() {
    zoomTiles.value = Math.min(opts.zoomMax, zoomTiles.value + opts.zoomStep);
    persist();
  }

  function onPointerMove(e: PointerEvent) {
    const dx = e.clientX - dragStart.mx;
    const dy = e.clientY - dragStart.my;
    if (!dragStart.moved && dx * dx + dy * dy > 9) dragStart.moved = true;
    if (!dragStart.moved) return;
    pos.value = clampToViewport(dragStart.px + dx, dragStart.py + dy);
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    dragging.value = false;
    if (dragStart.moved) persist();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('.zone-hit, .minimap__zoom-btn')) return;
    dragStart.px = pos.value.x;
    dragStart.py = pos.value.y;
    dragStart.mx = e.clientX;
    dragStart.my = e.clientY;
    dragStart.moved = false;
    dragging.value = true;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  onMounted(() => {
    pos.value = defaultPos();
    void uiLayout.ensureLoaded().then(() => {
      const saved = uiLayout.get<{ x?: number; y?: number; zoom?: number }>(opts.storageKey);
      if (saved) {
        if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          pos.value = clampToViewport(saved.x, saved.y);
        }
        if (typeof saved.zoom === 'number') {
          zoomTiles.value = Math.max(opts.zoomMin, Math.min(opts.zoomMax, saved.zoom));
        }
      }
    });
    window.addEventListener('resize', onWindowResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  });

  return {
    pos,
    zoomTiles,
    dragging,
    onPointerDown,
    zoomIn,
    zoomOut,
    wasDragged: () => dragStart.moved,
  };
}
