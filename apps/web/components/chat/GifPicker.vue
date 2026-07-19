<script setup lang="ts">
import { ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  pick: [url: string];
}>();

const runtimeConfig = useRuntimeConfig();
const apiKey = runtimeConfig.public.giphyApiKey as string | undefined;

const wrapperEl = ref<HTMLElement | null>(null);
const query = ref('');
const gifs = ref<{ url: string; preview: string }[]>([]);
const loading = ref(false);

interface GiphyResult {
  images: { original: { url: string }; fixed_height_small: { url: string } };
}

async function fetchGiphy(q?: string) {
  if (!apiKey) return;
  loading.value = true;
  try {
    const url = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
    const res = await fetch(url);
    const data = (await res.json()) as { data: GiphyResult[] };
    gifs.value = data.data.map((r) => ({
      url: r.images.original.url,
      preview: r.images.fixed_height_small.url,
    }));
  } finally {
    loading.value = false;
  }
}

function search() {
  void fetchGiphy(query.value.trim() || undefined);
}

function toggle() {
  emit('update:open', !props.open);
}

function onPick(url: string) {
  emit('pick', url);
  emit('update:open', false);
}

watch(
  () => props.open,
  (v) => {
    if (v && gifs.value.length === 0) void fetchGiphy();
  },
);

onClickOutside(wrapperEl, () => {
  if (props.open) emit('update:open', false);
});
</script>

<template>
  <div ref="wrapperEl" class="relative">
    <button
      class="action-btn text-xs font-bold tracking-wide"
      :class="open ? 'text-accent-violet' : ''"
      title="GIF"
      @click="toggle"
    >
      GIF
    </button>
    <div v-if="open" class="popup gif-popup">
      <div class="p-2">
        <input
          v-model="query"
          placeholder="Rechercher un GIF…"
          class="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none"
          style="
            background: var(--surface-border);
            color: var(--ink);
            border: 1px solid var(--surface-border);
          "
          @keydown.enter="search"
        />
      </div>
      <div v-if="loading" class="flex items-center justify-center py-6">
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-accent-violet border-t-transparent"
        />
      </div>
      <div
        v-else-if="gifs.length === 0"
        class="flex items-center justify-center py-6 text-xs"
        style="color: var(--ink-faint)"
      >
        Aucun résultat
      </div>
      <div
        v-else
        class="grid grid-cols-2 gap-1 px-2 pb-2 overflow-y-auto"
        style="max-height: 200px"
      >
        <button
          v-for="(gif, i) in gifs"
          :key="i"
          class="rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
          style="aspect-ratio: 16/9"
          @click="onPick(gif.url)"
        >
          <img :src="gif.preview" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 0.75rem;
  transition:
    background 0.15s,
    color 0.15s;
  color: var(--ink-muted);
}
.action-btn:hover {
  background: var(--surface-border);
  color: var(--ink);
}

.popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  border-radius: 12px;
  overflow: hidden;
  z-index: 50;
  background: rgba(16, 16, 26, 0.96);
  border: 1px solid var(--surface-tinted);
  backdrop-filter: blur(24px);
  box-shadow: 0 12px 40px rgba(20, 35, 25, 0.55);
}
.gif-popup {
  width: 290px;
}
</style>
