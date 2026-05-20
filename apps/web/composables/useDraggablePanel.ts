import { computed, onMounted, onUnmounted, ref, type CSSProperties, type Ref } from 'vue';

export function useDraggablePanel(opts: {
  panelEl: Ref<HTMLElement | null>;
  initialY?: number;
  centerOnMount?: boolean;
}) {
  const panelX = ref(0);
  const panelY = ref(opts.initialY ?? 16);
  const initialized = ref(false);

  const panelStyle = computed<CSSProperties>(() => ({
    position: 'fixed',
    top: `${panelY.value}px`,
    left: `${panelX.value}px`,
  }));

  let isDragging = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startPanelX = 0;
  let startPanelY = 0;

  function onHandleMousedown(e: MouseEvent) {
    isDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startPanelX = panelX.value;
    startPanelY = panelY.value;
    e.preventDefault();
  }

  function onMousemove(e: MouseEvent) {
    if (!isDragging || !opts.panelEl.value) return;
    const rect = opts.panelEl.value.getBoundingClientRect();
    panelX.value = Math.max(
      4,
      Math.min(startPanelX + (e.clientX - startMouseX), window.innerWidth - rect.width - 4),
    );
    panelY.value = Math.max(
      4,
      Math.min(startPanelY + (e.clientY - startMouseY), window.innerHeight - rect.height - 4),
    );
  }

  function onMouseup() {
    isDragging = false;
  }

  onMounted(() => {
    if (!initialized.value && opts.panelEl.value && opts.centerOnMount !== false) {
      panelX.value = Math.round(window.innerWidth / 2 - opts.panelEl.value.offsetWidth / 2);
      initialized.value = true;
    }
    window.addEventListener('mousemove', onMousemove);
    window.addEventListener('mouseup', onMouseup);
  });

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMousemove);
    window.removeEventListener('mouseup', onMouseup);
  });

  return { panelX, panelY, panelStyle, onHandleMousedown };
}
