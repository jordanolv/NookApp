import { type Ref, shallowRef, watch } from 'vue';
import type { NookScene } from '~/components/world/NookScene';
import { DISPLAY_SCALE } from '~/components/world/scene/constants';

const SIDEBAR_INSET_PX = 390;

function computeOffset(
  side: 'left' | 'right' | null | undefined,
  scene: NookScene,
  rect: DOMRect | null,
) {
  if (!rect) return { x: 0, y: 0 };
  const insetLeft = side === 'left' ? SIDEBAR_INSET_PX : 0;
  const insetRight = side === 'right' ? SIDEBAR_INSET_PX : 0;
  // Visible center in canvas coords = screen center / DISPLAY_SCALE
  const visibleCenterScreenX = (insetLeft + (rect.width - insetRight)) / 2;
  const visibleCenterScreenY = rect.height / 2;
  const cam = scene.cameras.main;
  return {
    x: visibleCenterScreenX / DISPLAY_SCALE - cam.width / 2,
    y: visibleCenterScreenY / DISPLAY_SCALE - cam.height / 2,
  };
}

export function useWorldCameraOffset(opts: {
  canvasRef: Ref<HTMLDivElement | null>;
  getScene: () => NookScene | null;
  sidebarSide: () => 'left' | 'right' | null | undefined;
}) {
  const cachedRect = shallowRef<DOMRect | null>(null);
  let ro: ResizeObserver | null = null;

  function apply() {
    const scene = opts.getScene();
    if (!scene) return;
    const o = computeOffset(opts.sidebarSide(), scene, cachedRect.value);
    scene.setCameraOffset(o.x, o.y);
  }

  function start() {
    const el = opts.canvasRef.value;
    if (!el) return;
    ro = new ResizeObserver(() => {
      cachedRect.value = opts.canvasRef.value?.getBoundingClientRect() ?? null;
      apply();
    });
    ro.observe(el);
    cachedRect.value = el.getBoundingClientRect();
  }

  function dispose() {
    ro?.disconnect();
    ro = null;
  }

  watch(() => opts.sidebarSide(), apply);

  return { cachedRect, start, apply, dispose };
}
