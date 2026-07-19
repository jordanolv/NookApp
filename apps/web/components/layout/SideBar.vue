<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

export interface SidebarSectionDef {
  key: string;
  label: string;
  icon: Component;
  mode?: 'panel' | 'toggle';
  active?: boolean;
}

const props = defineProps<{
  sections: SidebarSectionDef[];
  activeKeys: Set<string>;
  detachedKeys?: Set<string>;
  sectionHeights: Record<string, number>;
}>();

const emit = defineEmits<{
  'toggle-section': [key: string];
  'set-section-height': [key: string, px: number];
  'detach-section': [key: string, x: number, y: number];
  'reorder-sections': [fromKey: string, toKey: string];
}>();

const interfacePrefs = useInterfacePreferences();

const isDetached = (k: string) => !!props.detachedKeys?.has(k);
const isToggle = (s: SidebarSectionDef) => s.mode === 'toggle';
const isIconActive = (s: SidebarSectionDef) =>
  isToggle(s) ? !!s.active : props.activeKeys.has(s.key);

const orderedActive = computed(() =>
  props.sections.filter((s) => !isToggle(s) && props.activeKeys.has(s.key) && !isDetached(s.key)),
);

const collapsed = ref(false);
const expanded = computed(() => !collapsed.value && orderedActive.value.length > 0);

function toggleCollapse() {
  if (orderedActive.value.length === 0) {
    // Nothing active — open the first section if collapsed
    if (props.sections.length > 0 && !props.activeKeys.has(props.sections[0]!.key)) {
      emit('toggle-section', props.sections[0]!.key);
    }
    collapsed.value = false;
    return;
  }
  collapsed.value = !collapsed.value;
}

const DEFAULT_SECTION_H = 220;
function heightFor(key: string): number {
  return props.sectionHeights[key] ?? DEFAULT_SECTION_H;
}

function startResize(e: PointerEvent, key: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  const startY = e.clientY;
  const startH = heightFor(key);

  function onMove(ev: PointerEvent) {
    emit('set-section-height', key, startH + (ev.clientY - startY));
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

// ── Drag-to-detach on icons ─────────────────────────────────────────────────

interface DragState {
  key: string;
  icon: SidebarSectionDef['icon'];
  label: string;
  x: number;
  y: number;
  outside: boolean;
}

const drag = ref<DragState | null>(null);
const MOVE_THRESHOLD = 4;

const hoverKey = ref<string | null>(null);

function findIconUnderCursor(ev: PointerEvent, originKey: string): string | null {
  const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
  if (!el) return null;
  const btn = el.closest<HTMLElement>('.icon-btn[data-section-key]');
  if (!btn) return null;
  const key = btn.dataset.sectionKey;
  if (!key || key === originKey) return null;
  return key;
}

function startIconPointer(e: PointerEvent, def: SidebarSectionDef) {
  if (e.button !== 0) return;
  if (isToggle(def)) {
    emit('toggle-section', def.key);
    return;
  }
  const sidebarEl = (e.currentTarget as HTMLElement).closest<HTMLElement>('.sidebar');
  const rect = sidebarEl?.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;

  function isOutside(ev: PointerEvent): boolean {
    if (!rect) return true;
    return (
      ev.clientX < rect.left ||
      ev.clientX > rect.right ||
      ev.clientY < rect.top ||
      ev.clientY > rect.bottom
    );
  }

  function onMove(ev: PointerEvent) {
    if (!started) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < MOVE_THRESHOLD) return;
      started = true;
      drag.value = {
        key: def.key,
        icon: def.icon,
        label: def.label,
        x: ev.clientX,
        y: ev.clientY,
        outside: false,
      };
    }
    if (!drag.value) return;
    drag.value.x = ev.clientX;
    drag.value.y = ev.clientY;
    drag.value.outside = isOutside(ev);
    hoverKey.value = drag.value.outside ? null : findIconUnderCursor(ev, def.key);
  }

  function onUp(ev: PointerEvent) {
    cleanup();
    if (!started) {
      emit('toggle-section', def.key);
      return;
    }
    if (isOutside(ev)) {
      emit('detach-section', def.key, ev.clientX - 160, ev.clientY - 18);
    } else {
      const target = findIconUnderCursor(ev, def.key);
      if (target) emit('reorder-sections', def.key, target);
    }
    drag.value = null;
    hoverKey.value = null;
    ev.stopPropagation();
  }

  function cleanup() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  }
  function onCancel() {
    cleanup();
    drag.value = null;
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}
</script>

<template>
  <aside
    class="sidebar sidebar--right"
    :class="{
      'sidebar--expanded': expanded,
      'sidebar--swapped': interfacePrefs.prefs.value.swapSidebars,
    }"
  >
    <nav class="sidebar__icons" aria-label="Outils & plugins">
      <button
        v-for="s in sections"
        :key="s.key"
        type="button"
        class="icon-btn"
        :class="{
          'icon-btn--active': isIconActive(s),
          'icon-btn--dragging': drag?.key === s.key,
          'icon-btn--detached': detachedKeys?.has(s.key),
          'icon-btn--drop-target': hoverKey === s.key && !!drag,
        }"
        :data-section-key="s.key"
        @pointerdown="startIconPointer($event, s)"
      >
        <component :is="s.icon" :size="16" />
        <span class="icon-btn__tip">{{ s.label }}</span>
      </button>

      <button
        type="button"
        class="icon-btn icon-btn--fold"
        :title="expanded ? 'Replier' : 'Déplier'"
        @click="toggleCollapse"
      >
        <component
          :is="
            interfacePrefs.prefs.value.swapSidebars
              ? expanded
                ? ChevronRight
                : ChevronLeft
              : expanded
                ? ChevronLeft
                : ChevronRight
          "
          :size="14"
        />
      </button>
    </nav>

    <div v-if="expanded" class="sidebar__panel">
      <template v-for="(s, idx) in orderedActive" :key="s.key">
        <section
          class="section"
          :class="{ 'section--last': idx === orderedActive.length - 1 }"
          :style="
            idx === orderedActive.length - 1 ? undefined : { flex: `0 0 ${heightFor(s.key)}px` }
          "
        >
          <header class="section__header">
            <span>{{ s.label }}</span>
            <button
              type="button"
              class="section__close"
              title="Fermer"
              @click="emit('toggle-section', s.key)"
            >
              ×
            </button>
          </header>
          <div class="section__body">
            <slot :name="s.key" />
          </div>
        </section>

        <div
          v-if="idx < orderedActive.length - 1"
          class="section__resizer"
          :title="'Redimensionner ' + s.label"
          @pointerdown="startResize($event, s.key)"
        />
      </template>
    </div>
  </aside>

  <Teleport to="body">
    <div
      v-if="drag"
      class="drag-ghost"
      :class="{ 'drag-ghost--outside': drag.outside }"
      :style="{ left: drag.x + 'px', top: drag.y + 'px' }"
    >
      <component :is="drag.icon" :size="15" />
      <span class="drag-ghost__label">{{ drag.label }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
  position: fixed;
  top: 20px;
  bottom: 20px;
  right: 20px;
  left: auto;
  z-index: 30;
  color: var(--ink);
  width: auto;
}

.sidebar--swapped {
  right: auto;
  left: 20px;
  flex-direction: row-reverse;
}
/* When a panel is open, the rail is hidden by default and revealed only
   when the user hovers anywhere on the sidebar (typically the panel itself,
   then drags onto the now-visible rail to switch tabs). */
.sidebar.sidebar--expanded .sidebar__icons {
  opacity: 0;
  pointer-events: none;
  transform: translateX(20px);
  transition:
    opacity 200ms ease,
    transform 240ms cubic-bezier(0.4, 1.4, 0.6, 1);
}
.sidebar.sidebar--expanded:hover .sidebar__icons {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}
.sidebar.sidebar--swapped.sidebar--expanded .sidebar__icons {
  transform: translateX(-20px);
}
.sidebar.sidebar--swapped.sidebar--expanded:hover .sidebar__icons {
  transform: translateX(0);
}

.sidebar__panel {
  flex: 0 0 auto;
  width: 256px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
}

.sidebar__icons {
  flex-shrink: 0;
  width: 56px;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
}
.sidebar__section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.sidebar__section-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-muted);
  opacity: 0.55;
  padding: 2px 0;
  line-height: 1;
}
.sidebar__divider {
  height: 1px;
  width: 32px;
  background: var(--surface-divider);
  margin: 2px 0;
  align-self: center;
}

.icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 150ms,
    color 150ms,
    opacity 150ms,
    transform 150ms;
}
.icon-btn:hover {
  background: var(--surface-tinted);
  color: var(--ink);
  transform: translateY(-1px);
}
.icon-btn--active {
  background: var(--ink);
  color: var(--ink-inverse);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}
.icon-btn--active:hover {
  background: var(--ink);
  color: var(--ink-inverse);
  transform: translateY(-1px);
}
.icon-btn--dragging {
  opacity: 0.35;
}
.icon-btn--drop-target {
  background: var(--accent-leaf-soft);
  color: var(--ink);
  box-shadow: inset 0 0 0 2px var(--accent-leaf);
}
.icon-btn--detached::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-leaf);
  box-shadow: 0 0 0 2px var(--surface-strong);
}
.icon-btn--add {
  border: 1px dashed var(--surface-divider);
  opacity: 0.55;
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
}
.icon-btn--add:hover {
  opacity: 1;
  border-style: solid;
}
.icon-btn--add:disabled {
  cursor: not-allowed;
}
.icon-btn--add:disabled:hover {
  transform: none;
  background: transparent;
  border-style: dashed;
  opacity: 0.55;
}
.icon-btn--fold {
  margin-top: 4px;
  color: var(--ink-faint);
  width: 36px;
  height: 28px;
  border-radius: 999px;
}
.icon-btn--fold:hover {
  color: var(--ink);
  background: var(--surface-tinted);
}

.icon-btn__tip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: var(--tooltip-bg);
  color: var(--tooltip-ink);
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 150ms,
    transform 150ms;
  z-index: 1;
}
.sidebar--swapped .icon-btn__tip {
  right: auto;
  left: calc(100% + 12px);
  transform: translateY(-50%) translateX(-4px);
}
.sidebar--swapped .icon-btn:hover .icon-btn__tip {
  transform: translateY(-50%) translateX(0);
}
.icon-btn:hover .icon-btn__tip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 120px;
  flex-shrink: 0;
}
.section--last {
  flex: 1 0 120px;
}
.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
  background: transparent;
  flex-shrink: 0;
}
.section__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1;
  color: var(--ink-faint);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.section__close:hover {
  background: var(--surface-tinted-strong);
  color: var(--ink);
}

.section__body {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
}

.section__resizer {
  height: 6px;
  margin: -3px 0;
  cursor: ns-resize;
  z-index: 2;
  position: relative;
  flex-shrink: 0;
}
.section__resizer::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
  transition: background 120ms;
}
.section__resizer:hover::before {
  background: var(--accent-violet);
  opacity: 0.5;
}
</style>

<style>
.drag-ghost {
  position: fixed;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--surface-strong);
  color: var(--ink);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lift);
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition:
    background 120ms,
    border-color 120ms;
}
.drag-ghost__label {
  white-space: nowrap;
}
.drag-ghost--outside {
  border-color: var(--accent-violet);
}
</style>
