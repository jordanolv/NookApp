<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown, Settings, MoreHorizontal, PanelTop, UserCircle2 } from 'lucide-vue-next';
import type { Component } from 'vue';

export interface SidebarSectionDef {
  key: string;
  label: string;
  icon: Component;
}

const props = defineProps<{
  side: 'left' | 'right';
  sections: SidebarSectionDef[];
  keys: string[];
  activeKeys: Set<string>;
  sectionHeights: Record<string, number>;
  serverName: string;
  bannerUrl?: string | null;
  alwaysShow?: boolean;
  showServerHeader?: boolean;
  showUserDock?: boolean;
  otherSideHasSections?: boolean;
}>();

const emit = defineEmits<{
  'toggle-section': [key: string];
  'toggle-key': [key: string];
  'toggle-server-header': [];
  'toggle-user-dock': [];
  'set-section-height': [key: string, px: number];
  'open-server-switcher': [event: MouseEvent];
  'open-server-menu': [event: MouseEvent];
}>();

const sectionByKey = computed(() => {
  const m: Record<string, SidebarSectionDef> = {};
  for (const s of props.sections) m[s.key] = s;
  return m;
});

const enabledIcons = computed(
  () => props.keys.map((k) => sectionByKey.value[k]).filter(Boolean) as SidebarSectionDef[],
);

const orderedActive = computed(
  () =>
    props.keys
      .filter((k) => props.activeKeys.has(k))
      .map((k) => sectionByKey.value[k])
      .filter(Boolean) as SidebarSectionDef[],
);

const hasAnyIcon = computed(() => props.keys.length > 0);
const hasAnyContent = computed(
  () => hasAnyIcon.value || !!props.showServerHeader || !!props.showUserDock,
);
const visible = computed(() => hasAnyContent.value || props.alwaysShow);

const showPicker = ref(false);
function togglePicker() {
  showPicker.value = !showPicker.value;
}
function closePicker() {
  showPicker.value = false;
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

const LOCK_HINT = {
  left: 'Ajoute d’abord une section à droite',
  right: 'Ajoute d’abord une section à gauche',
} as const;
const lockReason = computed(() => LOCK_HINT[props.side]);
</script>

<template>
  <aside
    v-if="visible"
    class="sidebar"
    :class="[
      `sidebar--${side}`,
      { 'sidebar--empty': !hasAnyContent, 'sidebar--compact': hasAnyContent && !hasAnyIcon },
    ]"
  >
    <div v-if="showServerHeader" class="server-header">
      <button
        type="button"
        class="server-header__main"
        :title="serverName"
        @click="emit('open-server-switcher', $event)"
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
      <button
        type="button"
        class="server-header__gear"
        :title="serverName"
        @click="emit('open-server-menu', $event)"
      >
        <Settings :size="14" />
      </button>
    </div>

    <div class="sidebar__middle">
      <nav class="sidebar__icons">
        <div class="sidebar__icons-list">
          <button
            v-for="s in enabledIcons"
            :key="s.key"
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--active': activeKeys.has(s.key) }"
            :title="s.label"
            @click="emit('toggle-section', s.key)"
          >
            <component :is="s.icon" :size="15" />
          </button>
          <slot name="extra-icons" />
        </div>

        <div class="sidebar__icons-more-wrap">
          <button
            type="button"
            class="icon-btn icon-btn--more"
            :class="{ 'icon-btn--more-open': showPicker }"
            title="Configurer cette barre"
            @click="togglePicker"
          >
            <MoreHorizontal :size="15" />
          </button>

          <Teleport to="body">
            <div v-if="showPicker" class="picker-veil" @click="closePicker" />
            <div v-if="showPicker" class="picker" :class="`picker--${side}`" @click.stop>
              <header class="picker__head">
                <h3>Sections</h3>
              </header>
              <ul v-if="enabledIcons.length" class="picker__list">
                <LayoutSidebarPickerRow
                  v-for="s in enabledIcons"
                  :key="s.key"
                  :icon="s.icon"
                  :label="s.label"
                  :side="side"
                  @toggle="emit('toggle-key', s.key)"
                />
              </ul>
              <p v-else class="picker__empty">Aucune section ici.</p>

              <template v-if="showServerHeader || showUserDock">
                <header class="picker__head picker__head--secondary">
                  <h3>Éléments</h3>
                </header>
                <ul class="picker__list">
                  <LayoutSidebarPickerRow
                    v-if="showServerHeader"
                    :icon="PanelTop"
                    label="En-tête serveur"
                    :side="side"
                    :lock-other="!otherSideHasSections"
                    :lock-reason="lockReason"
                    @toggle="emit('toggle-server-header')"
                  />
                  <LayoutSidebarPickerRow
                    v-if="showUserDock"
                    :icon="UserCircle2"
                    label="Profil utilisateur"
                    :side="side"
                    :lock-other="!otherSideHasSections"
                    :lock-reason="lockReason"
                    @toggle="emit('toggle-user-dock')"
                  />
                </ul>
              </template>
            </div>
          </Teleport>
        </div>
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
              <div class="section__header-actions">
                <slot :name="`${s.key}-action`" />
                <button
                  type="button"
                  class="section__close"
                  title="Fermer"
                  @click="emit('toggle-section', s.key)"
                >
                  ×
                </button>
              </div>
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

    <div v-if="showUserDock" class="sidebar__user-dock">
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
  align-items: stretch;
  gap: 2px;
  padding: 6px 6px;
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.server-header__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: background 120ms;
}
.server-header__main:hover {
  background: rgba(255, 255, 255, 0.04);
}
.server-header__gear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  transition:
    background 120ms,
    color 120ms;
}
.server-header__gear:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
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
  width: 100%;
}
.sidebar__icons-more-wrap {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  justify-content: center;
  position: relative;
}
.icon-btn--more {
  color: rgba(255, 255, 255, 0.35);
}
.icon-btn--more:hover,
.icon-btn--more-open {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.05);
}
.sidebar--empty {
  width: 60px;
}
.sidebar--empty .sidebar__panel,
.sidebar--empty .server-header,
.sidebar--empty .sidebar__user-dock {
  display: none;
}
/* Compact: only header/dock — sidebar shell goes away, each floats as its own card */
.sidebar--compact {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  box-shadow: none;
  width: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  overflow: visible;
  pointer-events: none;
}

.sidebar--compact > .server-header,
.sidebar--compact > .sidebar__middle,
.sidebar--compact > .sidebar__user-dock {
  pointer-events: auto;
}

.sidebar--compact > .server-header,
.sidebar--compact > .sidebar__user-dock {
  width: 260px;
  border-radius: 14px;
  background: rgba(12, 12, 18, 0.78);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.sidebar--compact > .sidebar__middle {
  flex: 0 0 auto;
  align-self: center;
}

.sidebar--compact > .sidebar__user-dock {
  margin-top: auto;
}

.sidebar--compact .sidebar__icons {
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(12, 12, 18, 0.82);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-radius: 999px;
  padding: 4px;
  width: auto;
  flex-direction: row;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.sidebar--compact .sidebar__icons-list {
  display: none;
}

.sidebar--compact .sidebar__icons-more-wrap {
  margin: 0;
  padding: 0;
}

/* Popover */
.picker-veil {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: transparent;
}
.picker {
  position: fixed;
  z-index: 91;
  bottom: 56px;
  width: 220px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: rgba(15, 16, 24, 0.98);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  font-family: inherit;
}
.picker--left {
  left: 64px;
}
.picker--right {
  right: 64px;
}
.picker__head {
  padding: 10px 12px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.picker__head h3 {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.55);
}
.picker__head--secondary {
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 10px;
}
.picker__head--secondary p {
  margin: 4px 0 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}
.picker__list {
  list-style: none;
  padding: 6px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.picker__empty {
  margin: 0;
  padding: 8px 10px 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
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
.section__header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
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
