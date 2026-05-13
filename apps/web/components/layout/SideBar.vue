<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next';
import { VueDraggable } from 'vue-draggable-plus';
import type { Component } from 'vue';

export interface SidebarSectionDef {
  key: string;
  label: string;
  icon: Component;
}

const props = defineProps<{
  side: 'left' | 'right';
  sections: SidebarSectionDef[];
  order: string[];
  activeKeys: Set<string>;
  sectionHeights: Record<string, number>;
  serverName: string;
  bannerUrl?: string | null;
}>();

const emit = defineEmits<{
  'toggle-section': [key: string];
  'swap-side': [];
  'set-order': [order: string[]];
  'set-section-height': [key: string, px: number];
  'open-server-menu': [event: MouseEvent];
}>();

const sectionByKey = computed(() => {
  const m: Record<string, SidebarSectionDef> = {};
  for (const s of props.sections) m[s.key] = s;
  return m;
});

const orderedIcons = computed(
  () => props.order.map((k) => sectionByKey.value[k]).filter(Boolean) as SidebarSectionDef[],
);

const orderedIconsModel = computed({
  get: () => orderedIcons.value,
  set: (next) =>
    emit(
      'set-order',
      next.map((s) => s.key),
    ),
});

const orderedActive = computed(
  () =>
    props.order
      .filter((k) => props.activeKeys.has(k))
      .map((k) => sectionByKey.value[k])
      .filter(Boolean) as SidebarSectionDef[],
);

const hasAnyIcon = computed(() => props.sections.length > 0);
const swapIcon = computed(() => (props.side === 'left' ? ChevronRight : ChevronLeft));

const DEFAULT_SECTION_H = 220;
function heightFor(key: string): number {
  return props.sectionHeights[key] ?? DEFAULT_SECTION_H;
}

// ── Section resize ──
const panelEl = ref<HTMLElement | null>(null);

function startResize(e: PointerEvent, key: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  const startY = e.clientY;
  const startH = heightFor(key);

  function onMove(ev: PointerEvent) {
    const delta = ev.clientY - startY;
    emit('set-section-height', key, startH + delta);
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <aside v-if="hasAnyIcon" class="sidebar" :class="`sidebar--${side}`">
    <!-- Server header (top, full width) -->
    <button
      type="button"
      class="server-header"
      :title="serverName"
      @click="emit('open-server-menu', $event)"
    >
      <div class="server-header__banner">
        <img v-if="bannerUrl" :src="bannerUrl" :alt="serverName" class="server-header__img" />
        <div v-else class="server-header__fallback">
          {{ serverName?.[0]?.toUpperCase() ?? '?' }}
        </div>
      </div>
      <span class="server-header__name">{{ serverName }}</span>
      <ChevronDown :size="14" class="server-header__chevron" />
    </button>

    <!-- Middle row: icons + content panel -->
    <div class="sidebar__middle">
      <nav class="sidebar__icons">
        <VueDraggable
          v-model="orderedIconsModel"
          class="sidebar__icons-list"
          :animation="180"
          ghost-class="icon-btn--ghost-drag"
        >
          <button
            v-for="s in orderedIconsModel"
            :key="s.key"
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--active': activeKeys.has(s.key) }"
            :title="s.label"
            @click="emit('toggle-section', s.key)"
          >
            <component :is="s.icon" :size="15" />
          </button>
        </VueDraggable>

        <div class="sidebar__icons-spacer" />

        <button
          type="button"
          class="icon-btn icon-btn--ghost"
          :title="side === 'left' ? 'Passer à droite' : 'Passer à gauche'"
          @click="emit('swap-side')"
        >
          <component :is="swapIcon" :size="16" />
        </button>
      </nav>

      <div v-if="orderedActive.length" ref="panelEl" class="sidebar__panel">
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
    </div>

    <!-- User dock (full width bottom) -->
    <div class="sidebar__user-dock">
      <slot name="user-dock" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: fixed;
  top: 10px;
  bottom: 10px;
  width: 380px;
  z-index: 30;
  border-radius: 14px;
  background: rgba(12, 12, 18, 0.78);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.sidebar--left {
  left: 10px;
}
.sidebar--right {
  right: 10px;
}

/* ── Server header ── */
.server-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 120ms;
  flex-shrink: 0;
}
.server-header:hover {
  background: rgba(255, 255, 255, 0.04);
}
.server-header__banner {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #4338ca);
}
.server-header__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.server-header__fallback {
  font-size: 14px;
  font-weight: 700;
  color: white;
}
.server-header__name {
  flex: 1 1 0;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.server-header__chevron {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

/* ── Middle ── */
.sidebar__middle {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
}
.sidebar--right .sidebar__middle {
  flex-direction: row-reverse;
}

.sidebar__icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  width: 44px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}
.sidebar--right .sidebar__icons {
  border-right: none;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
}
.sidebar__icons-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.sidebar__icons-spacer {
  flex: 1 1 auto;
  min-height: 12px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 120ms;
}
.icon-btn:hover {
  color: rgba(255, 255, 255, 0.85);
}
.icon-btn--active {
  color: rgb(165, 180, 252);
}
.icon-btn--ghost {
  opacity: 0.55;
}
.icon-btn--ghost:hover {
  opacity: 1;
}
.icon-btn--ghost-drag {
  opacity: 0.4;
  background: rgba(99, 102, 241, 0.1);
}

/* ── Panel + sections ── */
.sidebar__panel {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
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
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}
.section__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.35);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.section__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
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
  background: rgba(99, 102, 241, 0.4);
}

/* ── User dock ── */
.sidebar__user-dock {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
}
</style>
