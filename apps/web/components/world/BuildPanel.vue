<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { BuildTool } from './NookScene';
import {
  DECOR_CATALOG,
  DECOR_CATEGORY_LABELS,
  DECOR_CATEGORY_ORDER,
  type DecorAsset,
  type DecorCategory,
} from './scene/decor-catalog';
import { FLOOR_CATALOG_GROUPS, type FloorAsset } from './scene/floor-catalog';
import { ROOM_THEMES, WALL_SHEET } from './scene/wall-catalog';
import BuildWallPicker, { type WallRegion } from './BuildWallPicker.vue';
import MapTemplateGallery from './MapTemplateGallery.vue';

const props = defineProps<{
  tool: BuildTool;
  isSaving?: boolean;
  selectedDecor?: string | null;
  selectedFloor?: string;
  selectedTemplate?: string;
  selectedWallRegion?: WallRegion;
  selectedRoomTheme?: string;
}>();

const emit = defineEmits<{
  'update:tool': [tool: BuildTool];
  'update:selected-decor': [asset: string | null];
  'update:selected-floor': [asset: string];
  'update:selected-template': [id: string];
  'update:selected-wall-region': [region: WallRegion];
  'update:selected-room-theme': [themeId: string];
  'apply-template': [id: string];
  'export-template': [];
  close: [];
}>();

const layout = useUiLayout();

const showAssets = ref(true);
function selectTool(id: BuildTool) {
  const hasAssets = !TOOLS.find((t) => t.id === id)?.hint;
  if (props.tool === id) {
    if (hasAssets) showAssets.value = !showAssets.value;
  } else {
    emit('update:tool', id);
    showAssets.value = hasAssets;
  }
}
const activeTool = computed(() => TOOLS.find((t) => t.id === props.tool));
const activeToolLabel = computed(() => activeTool.value?.label ?? '');
const activeHint = computed(() => activeTool.value?.hint ?? null);

const TOOLS: Array<{
  id: BuildTool;
  label: string;
  shortcut: string;
  accent: string;
  iconOnly?: boolean;
  hint?: string;
}> = [
  { id: 'tile', label: 'Sol', shortcut: '1', accent: 'violet' },
  { id: 'wall', label: 'Mur', shortcut: '2', accent: 'violet' },
  { id: 'room', label: 'Pièce', shortcut: '3', accent: 'violet' },
  { id: 'decor', label: 'Décor', shortcut: '4', accent: 'violet' },
  {
    id: 'collision',
    label: 'Collision',
    shortcut: '5',
    accent: 'rose',
    iconOnly: true,
    hint: 'Glisse pour marquer les cases infranchissables (contour rouge). Re-glisse pour libérer.',
  },
  {
    id: 'erase',
    label: 'Gomme',
    shortcut: '6',
    accent: 'rose',
    iconOnly: true,
    hint: "Clique ou glisse pour effacer le sol, les murs et les décors d'une case.",
  },
  { id: 'template', label: 'Modèles', shortcut: '7', accent: 'violet', iconOnly: true },
];

const decorCategories = DECOR_CATEGORY_ORDER;
const selectedDecorCategory = ref<DecorCategory | null>(null);
const search = ref('');

function selectDecorCategory(cat: DecorCategory | null) {
  selectedDecorCategory.value = cat;
  if (cat) search.value = '';
}

const FLOOR_ASSETS = computed(() => FLOOR_CATALOG_GROUPS.flatMap((g) => g.assets));
const DECOR_ASSETS = computed(() => DECOR_CATALOG);

function matchesQuery(label: string, id: string) {
  const q = search.value.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q) || id.toLowerCase().includes(q);
}

const filteredFloorGroups = computed(() =>
  FLOOR_CATALOG_GROUPS.map((g) => ({
    ...g,
    assets: g.assets.filter((a) => matchesQuery(a.label, a.id)),
  })).filter((g) => g.assets.length),
);

const decorByCategory = computed<Record<DecorCategory, DecorAsset[]>>(() => {
  const groups = Object.fromEntries(
    DECOR_CATEGORY_ORDER.map((cat) => [cat, [] as DecorAsset[]]),
  ) as Record<DecorCategory, DecorAsset[]>;
  for (const asset of DECOR_ASSETS.value) {
    if (matchesQuery(asset.label, asset.id)) groups[asset.category]?.push(asset);
  }
  return groups;
});

// ── Recents (persisted per tool) ─────────────────────────────────────────
const RECENTS_MAX = 6;
const recentFloors = ref<string[]>([]);
const recentDecors = ref<string[]>([]);

function parseRecents(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw.split(',').filter(Boolean);
}

function loadRecents() {
  const f = layout.get<{ ids: string }>('build:recents:floor');
  const d = layout.get<{ ids: string }>('build:recents:decor');
  recentFloors.value = parseRecents(f?.ids);
  recentDecors.value = parseRecents(d?.ids);
}

function pushRecent(list: typeof recentFloors, id: string, key: string) {
  const next = [id, ...list.value.filter((x) => x !== id)].slice(0, RECENTS_MAX);
  list.value = next;
  layout.set(key, { ids: next.join(',') });
}

const recentFloorAssets = computed(() =>
  recentFloors.value
    .map((id) => FLOOR_ASSETS.value.find((a) => a.id === id))
    .filter((a): a is FloorAsset => !!a),
);
const recentDecorAssets = computed(() =>
  recentDecors.value
    .map((id) => DECOR_ASSETS.value.find((a) => a.id === id))
    .filter((a): a is DecorAsset => !!a),
);

// ── Selection helpers ────────────────────────────────────────────────────
function pickFloor(asset: FloorAsset) {
  emit('update:selected-floor', asset.id);
  pushRecent(recentFloors, asset.id, 'build:recents:floor');
}

function pickDecor(asset: DecorAsset) {
  emit('update:selected-decor', asset.id);
  pushRecent(recentDecors, asset.id, 'build:recents:decor');
}

watch(
  () => props.tool,
  (tool) => {
    if (tool === 'decor' && !props.selectedDecor) {
      const first = DECOR_ASSETS.value[0];
      if (first) emit('update:selected-decor', first.id);
    }
  },
  { immediate: true },
);

// Reset search whenever the tool changes — keeps the picker clean.
watch(
  () => props.tool,
  () => {
    search.value = '';
  },
);

// ── Keyboard shortcuts ───────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === '1') emit('update:tool', 'tile');
  else if (e.key === '2') emit('update:tool', 'wall');
  else if (e.key === '3') emit('update:tool', 'room');
  else if (e.key === '4') emit('update:tool', 'decor');
  else if (e.key === '5') emit('update:tool', 'collision');
  else if (e.key === '6') emit('update:tool', 'erase');
  else if (e.key === '7') emit('update:tool', 'template');
}

onMounted(() => {
  loadRecents();
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Transition name="hint-fade">
    <div v-if="activeHint" class="build-hint">{{ activeHint }}</div>
  </Transition>

  <div class="build-tabs" @mousedown.stop>
    <nav class="build-tabs__nav">
      <button
        v-for="t in TOOLS"
        :key="t.id"
        class="build-tabs__tab"
        :style="
          tool === t.id
            ? t.accent === 'rose'
              ? 'background:rgba(244,63,94,0.16);color:rgb(251,113,133);box-shadow:inset 0 0 0 1.5px rgba(244,63,94,0.45)'
              : 'background:var(--accent-violet-soft);color:var(--accent-violet);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
            : 'background:transparent;color:var(--ink-muted)'
        "
        :title="`${t.label} (${t.shortcut})`"
        @click="selectTool(t.id)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="t.id === 'tile'" d="M3 3h18v18H3z" />
          <path
            v-else-if="t.id === 'wall'"
            d="M3 4h18v4H3zm0 6h6v4H3zm8 0h10v4H11zm-8 6h12v4H3zm14 0h4v4h-4z"
          />
          <path
            v-else-if="t.id === 'room'"
            d="M4 4h16v3H4zm0 13h16v3H4zm0-13v16h3V4zm13 0v16h3V4z"
          />
          <path
            v-else-if="t.id === 'decor'"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
          />
          <path
            v-else-if="t.id === 'collision'"
            d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.96 7.96 0 014 12a8 8 0 018-8zm0 16a7.96 7.96 0 01-4.9-1.69L18.31 7.1A7.96 7.96 0 0120 12a8 8 0 01-8 8z"
          />
          <path
            v-else-if="t.id === 'erase'"
            d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53l-6.36-6.36l-3.54 3.53c-.78.79-.78 2.05 0 2.83"
          />
          <path
            v-else-if="t.id === 'template'"
            d="M3 5h8v6H3zm10 0h8v6h-8zM3 13h8v6H3zm10 0h8v6h-8z"
          />
        </svg>
        <span v-if="!t.iconOnly" class="text-[11px] font-medium leading-none">{{ t.label }}</span>
      </button>

      <span v-if="isSaving" class="h-1.5 w-1.5 rounded-full bg-amber-400" title="Sauvegarde…" />
      <span class="build-tabs__sep" />
      <button class="build-tabs__close" title="Fermer le mode build" @click="emit('close')">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </nav>
  </div>

  <!-- Assets (right popup) -->
  <aside v-if="showAssets" class="build-assets" @mousedown.stop>
    <header class="build-assets__head">
      <span class="build-assets__title">{{ activeToolLabel }}</span>
      <button class="build-assets__close" title="Masquer" @click="showAssets = false">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>
    <section class="build-assets__content">
      <!-- Search bar (hidden for wall/erase tools that don't benefit) -->
      <div v-if="tool === 'tile' || tool === 'decor'" class="px-2.5 pt-2.5 pb-1.5" @mousedown.stop>
        <div
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
          style="background: var(--surface-tinted)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--ink-faint); flex-shrink: 0"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Rechercher…"
            class="flex-1 bg-transparent text-[11px] outline-none"
            style="color: var(--ink); min-width: 0"
          />
          <button
            v-if="search"
            class="text-[10px] rounded px-1.5 py-0.5"
            style="background: var(--surface-tinted-strong); color: var(--ink-muted)"
            @click="search = ''"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Sol -->
      <div v-if="tool === 'tile'" class="px-2.5 pb-2.5" @mousedown.stop>
        <!-- Recents -->
        <div v-if="recentFloorAssets.length && !search" class="mb-2">
          <p class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Récents
          </p>
          <div class="grid grid-cols-6 gap-1">
            <button
              v-for="asset in recentFloorAssets"
              :key="`r-${asset.id}`"
              class="aspect-square rounded-md flex items-center justify-center overflow-hidden transition-all"
              :style="
                selectedFloor === asset.id
                  ? 'background:var(--accent-violet-soft);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
                  : 'background:var(--surface-tinted)'
              "
              :title="asset.label"
              @click="pickFloor(asset)"
            >
              <span v-if="!asset.url" class="block w-full h-full" style="background: #f3ead4" />
              <img
                v-else
                :src="asset.url"
                :alt="asset.label"
                class="w-full h-full object-cover"
                style="image-rendering: pixelated"
                draggable="false"
              />
            </button>
          </div>
        </div>

        <div class="rounded-lg p-1.5" style="background: var(--surface-tinted-strong)">
          <p
            v-if="!filteredFloorGroups.length"
            class="px-1 py-3 text-[10px] text-center"
            style="color: var(--ink-faint)"
          >
            Aucun résultat
          </p>
          <section v-for="group in filteredFloorGroups" :key="group.id" class="mb-2 last:mb-0">
            <p class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              {{ group.label }}
            </p>
            <div class="grid grid-cols-6 gap-1">
              <button
                v-for="asset in group.assets"
                :key="asset.id"
                class="aspect-square rounded-md flex items-center justify-center overflow-hidden transition-all"
                :style="
                  selectedFloor === asset.id
                    ? 'background:var(--accent-violet-soft);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
                    : 'background:var(--surface-tinted)'
                "
                :title="asset.label"
                @click="pickFloor(asset)"
              >
                <span v-if="!asset.url" class="block w-full h-full" style="background: #f3ead4" />
                <img
                  v-else
                  :src="asset.url"
                  :alt="asset.label"
                  class="w-full h-full object-cover"
                  style="image-rendering: pixelated"
                  draggable="false"
                />
              </button>
            </div>
          </section>
        </div>
        <p class="mt-2 text-[10px] leading-tight" style="color: var(--ink-faint)">
          Glisse pour peindre. Re-glisse sur le même sol pour effacer.
        </p>
      </div>

      <!-- Modèles / reset (onglet dédié) -->
      <div v-if="tool === 'template'" class="px-2.5 py-2.5" @mousedown.stop>
        <p class="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Repartir d'un modèle
        </p>
        <MapTemplateGallery
          compact
          :model-value="selectedTemplate"
          @update:model-value="emit('update:selected-template', $event)"
          @select="emit('apply-template', $event)"
        />
        <p class="mt-2 text-[10px] leading-tight" style="color: var(--ink-faint)">
          Choisis un modèle pour remplacer la map. « Page blanche » vide tout.
        </p>
        <button
          class="mt-2 w-full rounded px-2 py-1.5 text-[11px] font-semibold"
          style="background-color: rgba(34, 197, 94, 0.4); color: white"
          title="Copie le template (floors+walls+decor) en TS dans le presse-papiers + console"
          @click="emit('export-template')"
        >
          Exporter la map en code (template)
        </button>
      </div>

      <!-- Mur (LimeZu sheet picker) -->
      <BuildWallPicker
        v-if="tool === 'wall'"
        :selected-wall-region="selectedWallRegion"
        @update:selected-wall-region="emit('update:selected-wall-region', $event)"
      />

      <!-- Pièce (drag-rect = pose une pièce complète) -->
      <div v-if="tool === 'room'" class="px-2.5 pb-2.5" @mousedown.stop>
        <p class="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Thème de pièce
        </p>
        <div class="grid grid-cols-3 gap-1.5 mb-2">
          <button
            v-for="theme in ROOM_THEMES"
            :key="theme.id"
            class="rounded-md flex flex-col items-center justify-center gap-1 py-1.5 transition-transform active:scale-95"
            :style="{
              background:
                (selectedRoomTheme ?? 'drywall') === theme.id
                  ? 'rgba(99,102,241,0.2)'
                  : 'rgba(255,255,255,0.04)',
              boxShadow:
                (selectedRoomTheme ?? 'drywall') === theme.id
                  ? 'inset 0 0 0 1.5px rgba(165,180,252,0.95)'
                  : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }"
            @click="emit('update:selected-room-theme', theme.id)"
          >
            <div
              :style="{
                width: '40px',
                height: '40px',
                backgroundImage: `url(${WALL_SHEET.url})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${WALL_SHEET.cols * 40}px auto`,
                backgroundPosition: `-${(theme.colOffset + 3) * 40}px -${(theme.rowOffset + 3) * 40}px`,
                imageRendering: 'pixelated',
              }"
            />
            <span class="text-[9px] text-ink-muted">{{ theme.label }}</span>
          </button>
        </div>
        <p class="text-[10px] leading-tight" style="color: var(--ink-faint)">
          Drag un rectangle sur la map (min 3×4) → ça stamp une pièce complète dans le thème choisi.
        </p>
      </div>

      <!-- Décor -->
      <div v-if="tool === 'decor'" class="px-2.5 pb-2.5" @mousedown.stop>
        <div v-if="recentDecorAssets.length && !search" class="mb-2">
          <p class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Récents
          </p>
          <div class="grid grid-cols-6 gap-1">
            <button
              v-for="asset in recentDecorAssets"
              :key="`r-${asset.id}`"
              class="aspect-square rounded-md flex items-center justify-center transition-all p-1"
              :style="
                selectedDecor === asset.id
                  ? 'background:var(--accent-violet-soft);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
                  : 'background:var(--surface-tinted)'
              "
              :title="asset.label"
              @click="pickDecor(asset)"
            >
              <img
                :src="asset.primary.file"
                :alt="asset.label"
                class="max-w-full max-h-full"
                style="width: auto; height: auto; image-rendering: pixelated; object-fit: contain"
                draggable="false"
              />
            </button>
          </div>
        </div>

        <div class="flex gap-1 overflow-x-auto pb-1 mb-1.5" style="scrollbar-width: none">
          <button
            class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all"
            :style="
              !selectedDecorCategory
                ? 'background:var(--accent-violet-soft);color:var(--accent-violet)'
                : 'background:var(--surface-tinted);color:var(--ink-muted)'
            "
            @click="selectDecorCategory(null)"
          >
            Tout
          </button>
          <button
            v-for="cat in decorCategories"
            :key="cat"
            class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all"
            :style="
              selectedDecorCategory === cat
                ? 'background:var(--accent-violet-soft);color:var(--accent-violet)'
                : 'background:var(--surface-tinted);color:var(--ink-muted)'
            "
            @click="selectDecorCategory(cat)"
          >
            {{ DECOR_CATEGORY_LABELS[cat] }}
          </button>
        </div>

        <div class="rounded-lg p-1.5" style="background: var(--surface-tinted-strong)">
          <p
            v-if="!Object.values(decorByCategory).some((g) => g.length)"
            class="px-1 py-3 text-[10px] text-center"
            style="color: var(--ink-faint)"
          >
            Aucun résultat
          </p>
          <section
            v-for="cat in decorCategories"
            :key="cat"
            v-show="
              decorByCategory[cat].length &&
              (search || !selectedDecorCategory || selectedDecorCategory === cat)
            "
            class="mb-2 last:mb-0"
          >
            <p class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              {{ DECOR_CATEGORY_LABELS[cat] }}
            </p>
            <div class="grid grid-cols-6 gap-1">
              <button
                v-for="asset in decorByCategory[cat]"
                :key="asset.id"
                class="aspect-square rounded-md flex items-center justify-center transition-all p-1"
                :style="
                  selectedDecor === asset.id
                    ? 'background:var(--accent-violet-soft);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
                    : 'background:var(--surface-tinted)'
                "
                :title="asset.label"
                @click="pickDecor(asset)"
              >
                <img
                  :src="asset.primary.file"
                  :alt="asset.label"
                  class="max-w-full max-h-full"
                  style="width: auto; height: auto; image-rendering: pixelated; object-fit: contain"
                  draggable="false"
                />
              </button>
            </div>
          </section>
        </div>
        <p class="mt-2 text-[10px] leading-tight" style="color: var(--ink-faint)">
          Clique pour poser. Clique sur un décor pour le retirer.
        </p>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.build-hint {
  position: fixed;
  bottom: 136px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 39;
  max-width: 360px;
  padding: 8px 14px;
  text-align: center;
  font-size: 11px;
  line-height: 1.35;
  color: var(--ink-muted);
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}

.build-tabs {
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 39;
  display: flex;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
}

.build-tabs__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
}

.build-tabs__tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  transition: all 0.15s;
}

.build-tabs__sep {
  width: 1px;
  height: 24px;
  margin: 0 2px;
  background: var(--surface-tinted);
}

.build-tabs__close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--ink-muted);
  transition: all 0.15s;
}

.build-tabs__close:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}

.build-assets {
  position: fixed;
  right: 16px;
  top: 76px;
  bottom: 92px;
  z-index: 39;
  width: 340px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  overflow: hidden;
}

.build-assets__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--surface-tinted);
  background: var(--surface-tinted-strong);
}

.build-assets__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}

.build-assets__close {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: var(--ink-muted);
  transition: all 0.15s;
}

.build-assets__close:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}

.build-assets__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}
</style>
