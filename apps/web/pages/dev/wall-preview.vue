<script setup lang="ts">
import { computed, ref } from 'vue';

definePageMeta({ layout: false });

interface Cell {
  x: number;
  y: number;
}

interface Room {
  label: string;
  cells: Cell[];
}

function rectPerimeter(x: number, y: number, w: number, h: number): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < w; i += 1) {
    out.push({ x: x + i, y });
    out.push({ x: x + i, y: y + h - 1 });
  }
  for (let j = 1; j < h - 1; j += 1) {
    out.push({ x, y: y + j });
    out.push({ x: x + w - 1, y: y + j });
  }
  return out;
}

const ROOMS: Room[] = [
  { label: 'Pièce 5×5', cells: rectPerimeter(1, 1, 5, 5) },
  {
    label: 'Deux pièces + couloir',
    cells: [
      ...rectPerimeter(1, 1, 5, 4),
      ...rectPerimeter(1, 4, 5, 4),
      ...rectPerimeter(5, 2, 4, 2),
    ],
  },
  {
    label: 'Cross',
    cells: [
      { x: 4, y: 1 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ],
  },
];

const thickness = ref(14);
const baseColor = ref('#6e5d72');
const darkColor = ref('#1c1620');
const highlightColor = ref('#8d7e92');
const showGrid = ref(true);
const cellPx = ref(40);
const showHighlight = ref(true);

const PRESETS = [
  { label: 'Violet brume', base: '#6e5d72', dark: '#1c1620', highlight: '#8d7e92' },
  { label: 'Gris ardoise', base: '#5b6470', dark: '#1a1d24', highlight: '#7a8290' },
  { label: 'Bleu nuit', base: '#3d4d68', dark: '#0e1322', highlight: '#5d6f8b' },
  { label: 'Brun bois', base: '#7a5f47', dark: '#241810', highlight: '#9c7d60' },
  { label: 'Beige sable', base: '#b8a387', dark: '#3d3328', highlight: '#d0bea2' },
  { label: 'Vert sapin', base: '#506b59', dark: '#0e1a12', highlight: '#6f8c79' },
];

function applyPreset(p: (typeof PRESETS)[number]) {
  baseColor.value = p.base;
  darkColor.value = p.dark;
  highlightColor.value = p.highlight;
}

function cellsAt(cells: Cell[]) {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  return (x: number, y: number) => set.has(`${x},${y}`);
}

// For one cell, compute the union of base wall rects (center + extensions).
function baseRectsFor(cell: Cell, has: (x: number, y: number) => boolean, t: number, cp: number) {
  const cx = cell.x * cp + cp / 2;
  const cy = cell.y * cp + cp / 2;
  const half = t / 2;
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Central block
  rects.push({ x: cx - half, y: cy - half, w: t, h: t });

  if (has(cell.x, cell.y - 1)) {
    rects.push({ x: cx - half, y: cell.y * cp, w: t, h: cp / 2 });
  }
  if (has(cell.x, cell.y + 1)) {
    rects.push({ x: cx - half, y: cy, w: t, h: cp / 2 });
  }
  if (has(cell.x - 1, cell.y)) {
    rects.push({ x: cell.x * cp, y: cy - half, w: cp / 2, h: t });
  }
  if (has(cell.x + 1, cell.y)) {
    rects.push({ x: cx, y: cy - half, w: cp / 2, h: t });
  }

  return rects;
}

// Outline = base rects expanded by 1px in dark color, drawn FIRST.
// Highlight = top 1-2px band of each base rect (in lighter color), drawn LAST.
function shapesFor(cell: Cell, has: (x: number, y: number) => boolean, t: number, cp: number) {
  const base = baseRectsFor(cell, has, t, cp);
  const outline = base.map((r) => ({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }));
  // Top highlight: a 2px band on top of each rect, but only on the OUTWARD side
  // (we draw a 2px band at the top of every rect; junctions cover them naturally).
  const hi = base.map((r) => ({ x: r.x, y: r.y, w: r.w, h: 2 }));
  // Bottom shadow: 2px band at bottom of each base rect, slightly darker than base
  const shadow = base.map((r) => ({ x: r.x, y: r.y + r.h - 2, w: r.w, h: 2 }));
  return { outline, base, hi, shadow };
}

const renderedRooms = computed(() =>
  ROOMS.map((room) => {
    const has = cellsAt(room.cells);
    const out: Array<{
      cellKey: string;
      outline: ReturnType<typeof shapesFor>['outline'];
      base: ReturnType<typeof shapesFor>['base'];
      hi: ReturnType<typeof shapesFor>['hi'];
      shadow: ReturnType<typeof shapesFor>['shadow'];
    }> = [];
    for (const c of room.cells) {
      const s = shapesFor(c, has, thickness.value, cellPx.value);
      out.push({ cellKey: `${c.x},${c.y}`, ...s });
    }
    const maxX = Math.max(...room.cells.map((c) => c.x)) * cellPx.value + cellPx.value * 2;
    const maxY = Math.max(...room.cells.map((c) => c.y)) * cellPx.value + cellPx.value * 2;
    return { label: room.label, shapes: out, width: maxX, height: maxY };
  }),
);

// Darken a hex color
function shade(hex: string, amount: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = Math.max(0, Math.min(255, parseInt(m[1]!, 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(m[2]!, 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(m[3]!, 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const shadowColor = computed(() => shade(baseColor.value, -30));
</script>

<template>
  <div class="min-h-screen p-6" style="background: #1a1d24; color: #e8e8ec">
    <h1 class="text-xl font-bold mb-4">Wall rendering preview (dev) — v2 avec relief</h1>
    <div class="grid grid-cols-[280px_1fr] gap-6">
      <aside class="flex flex-col gap-4">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide opacity-60">
            Epaisseur mur ({{ thickness }}px)
          </label>
          <input v-model.number="thickness" type="range" min="6" max="30" step="1" class="w-full" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide opacity-60">
            Taille case ({{ cellPx }}px)
          </label>
          <input v-model.number="cellPx" type="range" min="24" max="80" step="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wide opacity-60">Couleurs</label>
          <div class="flex items-center gap-2 text-xs">
            <input v-model="baseColor" type="color" class="h-6 w-10 rounded" />
            <span>fill</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <input v-model="darkColor" type="color" class="h-6 w-10 rounded" />
            <span>outline</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <input v-model="highlightColor" type="color" class="h-6 w-10 rounded" />
            <span>highlight (top)</span>
          </div>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <label class="flex items-center gap-2">
            <input v-model="showGrid" type="checkbox" />
            Grille
          </label>
          <label class="flex items-center gap-2">
            <input v-model="showHighlight" type="checkbox" />
            Highlight + shadow
          </label>
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide opacity-60">Presets</label>
          <div class="grid grid-cols-2 gap-1 mt-1">
            <button
              v-for="p in PRESETS"
              :key="p.label"
              class="text-[10px] rounded px-2 py-1"
              :style="{ background: p.base, color: '#fff', border: `1px solid ${p.dark}` }"
              @click="applyPreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
      </aside>

      <main class="flex flex-col gap-6">
        <div
          v-for="(room, idx) in renderedRooms"
          :key="idx"
          class="rounded-lg p-4"
          style="background: #2a2d35"
        >
          <div class="text-sm font-semibold mb-2 opacity-80">{{ room.label }}</div>
          <div
            class="relative overflow-auto"
            :style="{
              width: `${room.width}px`,
              height: `${room.height}px`,
              background: '#6d8761',
            }"
          >
            <div
              v-if="showGrid"
              class="absolute inset-0 pointer-events-none"
              :style="{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: `${cellPx}px ${cellPx}px`,
              }"
            />
            <svg
              :width="room.width"
              :height="room.height"
              class="absolute inset-0"
              :style="{ shapeRendering: 'crispEdges' }"
            >
              <!-- Outline layer -->
              <g>
                <rect
                  v-for="(s, i) in room.shapes.flatMap((c) => c.outline)"
                  :key="`o-${i}`"
                  :x="s.x"
                  :y="s.y"
                  :width="s.w"
                  :height="s.h"
                  :fill="darkColor"
                />
              </g>
              <!-- Base fill -->
              <g>
                <rect
                  v-for="(s, i) in room.shapes.flatMap((c) => c.base)"
                  :key="`b-${i}`"
                  :x="s.x"
                  :y="s.y"
                  :width="s.w"
                  :height="s.h"
                  :fill="baseColor"
                />
              </g>
              <!-- Shadow (bottom of each rect) -->
              <g v-if="showHighlight">
                <rect
                  v-for="(s, i) in room.shapes.flatMap((c) => c.shadow)"
                  :key="`s-${i}`"
                  :x="s.x"
                  :y="s.y"
                  :width="s.w"
                  :height="s.h"
                  :fill="shadowColor"
                />
              </g>
              <!-- Highlight (top of each rect) -->
              <g v-if="showHighlight">
                <rect
                  v-for="(s, i) in room.shapes.flatMap((c) => c.hi)"
                  :key="`h-${i}`"
                  :x="s.x"
                  :y="s.y"
                  :width="s.w"
                  :height="s.h"
                  :fill="highlightColor"
                />
              </g>
            </svg>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
