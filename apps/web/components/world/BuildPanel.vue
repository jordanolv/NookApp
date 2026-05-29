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
import { MAP_TEMPLATES } from './scene/map-templates';
import { ROOM_THEMES, WALL_SHEET } from './scene/wall-catalog';
import BuildWallPicker, { type WallRegion } from './BuildWallPicker.vue';

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
  'reset-map': [];
  'export-template': [];
  close: [];
}>();

const layout = useUiLayout();

const TOOLS: Array<{
  id: BuildTool;
  label: string;
  shortcut: string;
  accent: string;
}> = [
  { id: 'tile', label: 'Sol', shortcut: '1', accent: 'violet' },
  { id: 'wall', label: 'Mur', shortcut: '2', accent: 'violet' },
  { id: 'room', label: 'Pièce', shortcut: '3', accent: 'violet' },
  { id: 'decor', label: 'Décor', shortcut: '4', accent: 'violet' },
  { id: 'erase', label: 'Gomme', shortcut: '5', accent: 'rose' },
];

const decorCategories = DECOR_CATEGORY_ORDER;
const search = ref('');

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
  const groups: Record<DecorCategory, DecorAsset[]> = {
    nature: [],
    construction: [],
    office: [],
    props: [],
  };
  for (const asset of DECOR_ASSETS.value) {
    if (matchesQuery(asset.label, asset.id)) groups[asset.category].push(asset);
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
  else if (e.key === '5') emit('update:tool', 'erase');
}

onMounted(() => {
  loadRecents();
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <UiFloatingWindow
    title="Mode build"
    fit-content
    :initial-width="460"
    :initial-height="520"
    :min-width="380"
    :min-height="200"
    persist-key="ui:floating:buildPanel"
    @close="emit('close')"
  >
    <template #header-actions>
      <span v-if="isSaving" class="h-1.5 w-1.5 rounded-full bg-amber-400" title="Sauvegarde…" />
    </template>

    <div class="flex" style="min-height: 320px">
      <!-- Tool rail -->
      <nav
        class="flex flex-col gap-1 p-2"
        style="
          width: 64px;
          border-right: 1px solid var(--surface-tinted);
          background: var(--surface-tinted-strong);
        "
        @mousedown.stop
      >
        <button
          v-for="t in TOOLS"
          :key="t.id"
          class="group relative flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-all"
          :style="
            tool === t.id
              ? t.accent === 'rose'
                ? 'background:rgba(244,63,94,0.16);color:rgb(251,113,133);box-shadow:inset 0 0 0 1.5px rgba(244,63,94,0.45)'
                : 'background:var(--accent-violet-soft);color:var(--accent-violet);box-shadow:inset 0 0 0 1.5px var(--accent-violet)'
              : 'background:transparent;color:var(--ink-muted)'
          "
          :title="`${t.label} (${t.shortcut})`"
          @click="emit('update:tool', t.id)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
              v-else-if="t.id === 'erase'"
              d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53l-6.36-6.36l-3.54 3.53c-.78.79-.78 2.05 0 2.83"
            />
          </svg>
          <span class="text-[10px] font-medium leading-none">{{ t.label }}</span>
        </button>
      </nav>

      <!-- Content -->
      <section class="flex flex-1 flex-col" style="width: 320px">
        <!-- Search bar (hidden for wall/erase tools that don't benefit) -->
        <div
          v-if="tool === 'tile' || tool === 'decor'"
          class="px-2.5 pt-2.5 pb-1.5"
          @mousedown.stop
        >
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

          <div
            class="rounded-lg p-1.5"
            style="background: var(--surface-tinted-strong); max-height: 320px; overflow-y: auto"
          >
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

        <!-- Templates (Sol seulement, accessible quand l'outil est Sol) -->
        <div
          v-if="tool === 'tile'"
          class="px-2.5 pb-2.5 border-t"
          style="border-color: var(--surface-tinted); padding-top: 10px"
          @mousedown.stop
        >
          <p class="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Templates de Nook
          </p>
          <div class="flex flex-col gap-1">
            <button
              v-for="tpl in MAP_TEMPLATES"
              :key="tpl.id"
              class="rounded px-2 py-1.5 text-left text-[11px]"
              :style="{
                background:
                  selectedTemplate === tpl.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                boxShadow:
                  selectedTemplate === tpl.id
                    ? 'inset 0 0 0 1.5px rgba(165,180,252,0.9)'
                    : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              }"
              @click="
                emit('update:selected-template', tpl.id);
                emit('apply-template', tpl.id);
              "
            >
              <div class="font-semibold">{{ tpl.label }}</div>
              <div class="text-[9px] text-ink-faint">{{ tpl.description }}</div>
            </button>
          </div>
          <p class="mt-2 text-[10px] leading-tight" style="color: var(--ink-faint)">
            Clique un template pour réinitialiser la map.
          </p>
          <button
            class="mt-2 w-full rounded px-2 py-1.5 text-[11px] font-semibold"
            style="background-color: rgba(34, 197, 94, 0.4); color: white"
            title="Copie le template (floors+walls+decor) en TS dans le presse-papiers + console"
            @click="emit('export-template')"
          >
            Exporter la map en code (template)
          </button>
          <button
            class="mt-1.5 w-full rounded px-2 py-1.5 text-[11px] font-semibold"
            style="background-color: rgba(239, 68, 68, 0.5); color: white"
            title="Vide complètement la map (murs, sol, décor)"
            @click="emit('reset-map')"
          >
            Reset map (vider tout)
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
            Drag un rectangle sur la map (min 3×4) → ça stamp une pièce complète dans le thème
            choisi.
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

          <div
            class="rounded-lg p-1.5"
            style="background: var(--surface-tinted-strong); max-height: 340px; overflow-y: auto"
          >
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
              v-show="decorByCategory[cat].length"
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
                    style="
                      width: auto;
                      height: auto;
                      image-rendering: pixelated;
                      object-fit: contain;
                    "
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

        <!-- Gomme -->
        <div
          v-if="tool === 'erase'"
          class="flex flex-col items-center justify-center gap-2 px-4 py-6"
          @mousedown.stop
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full"
            style="background: rgba(244, 63, 94, 0.14); color: rgb(251, 113, 133)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53l-6.36-6.36l-3.54 3.53c-.78.79-.78 2.05 0 2.83"
              />
            </svg>
          </div>
          <p class="text-center text-[11px] leading-snug" style="color: var(--ink-muted)">
            Clique ou glisse sur la map pour effacer le sol, les murs et les décors d'une case.
          </p>
        </div>
      </section>
    </div>
  </UiFloatingWindow>
</template>
