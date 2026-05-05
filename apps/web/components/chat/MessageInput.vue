<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  send: [content: string];
}>();

const runtimeConfig = useRuntimeConfig();
const gifEnabled = computed(() => !!runtimeConfig.public.giphyApiKey);

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const emojiWrapperEl = ref<HTMLElement | null>(null);
const gifWrapperEl = ref<HTMLElement | null>(null);

const input = ref('');
const showEmoji = ref(false);
const showGif = ref(false);
const gifQuery = ref('');
const gifs = ref<{ url: string; preview: string }[]>([]);
const loadingGifs = ref(false);
const activeEmojiCat = ref(0);

function resize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
watch(input, () => nextTick(resize));
onMounted(resize);

const EMOJI_CATEGORIES = [
  {
    label: '😀',
    name: 'Smileys',
    emojis: [
      '😀',
      '😂',
      '🥹',
      '😊',
      '😎',
      '🥰',
      '😍',
      '🤩',
      '😏',
      '😒',
      '😭',
      '😤',
      '😡',
      '🤯',
      '😱',
      '🥶',
      '😴',
      '🤢',
      '😷',
      '🤫',
    ],
  },
  {
    label: '👋',
    name: 'Gestures',
    emojis: [
      '👋',
      '🤚',
      '✋',
      '👆',
      '👇',
      '👉',
      '👈',
      '👍',
      '👎',
      '👊',
      '✊',
      '🤜',
      '🙏',
      '🤝',
      '💪',
      '✌️',
      '🤞',
      '🫶',
      '🫡',
      '🫰',
    ],
  },
  {
    label: '❤️',
    name: 'Hearts',
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💔',
      '❣️',
      '💟',
      '🩷',
    ],
  },
  {
    label: '🐱',
    name: 'Animals',
    emojis: [
      '🐱',
      '🐶',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🦁',
      '🐯',
      '🐮',
      '🐷',
      '🐸',
      '🐙',
      '🦋',
      '🐝',
      '🦄',
      '🐲',
      '🦎',
    ],
  },
  {
    label: '🍕',
    name: 'Food',
    emojis: [
      '🍕',
      '🍔',
      '🌮',
      '🌯',
      '🥪',
      '🍜',
      '🍣',
      '🍦',
      '🎂',
      '🍩',
      '☕',
      '🧋',
      '🍺',
      '🥂',
      '🍷',
      '🍎',
      '🍓',
      '🍇',
      '🥑',
      '🌽',
    ],
  },
  {
    label: '⚽',
    name: 'Fun',
    emojis: [
      '⚽',
      '🏀',
      '🎮',
      '🎯',
      '🎲',
      '♟️',
      '🎭',
      '🎨',
      '🎵',
      '🎸',
      '🎹',
      '🎤',
      '🎬',
      '🏆',
      '🥇',
      '🎁',
      '🎉',
      '🎊',
      '🎈',
      '🔥',
    ],
  },
  {
    label: '💡',
    name: 'Objects',
    emojis: [
      '💡',
      '🔑',
      '🔒',
      '💻',
      '📱',
      '⌨️',
      '🖥️',
      '📷',
      '🔭',
      '🧪',
      '🔧',
      '⚙️',
      '📚',
      '✏️',
      '📌',
      '💰',
      '💎',
      '🚀',
      '✈️',
      '🏠',
    ],
  },
  {
    label: '🌍',
    name: 'Nature',
    emojis: [
      '🌍',
      '🌊',
      '🌈',
      '⛅',
      '🌩️',
      '❄️',
      '🌸',
      '🌺',
      '🌻',
      '🌴',
      '🌵',
      '⭐',
      '🌙',
      '☀️',
      '💫',
      '🌟',
      '🌠',
      '🌌',
      '🔮',
      '🌀',
    ],
  },
];

function insertEmoji(emoji: string) {
  const el = textareaEl.value;
  if (!el) return;
  const pos = el.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  showEmoji.value = false;
  nextTick(() => {
    el.focus();
    const np = pos + emoji.length;
    el.setSelectionRange(np, np);
  });
}

function toggleEmoji() {
  showEmoji.value = !showEmoji.value;
  if (showEmoji.value) showGif.value = false;
}

interface GiphyResult {
  images: { original: { url: string }; fixed_height_small: { url: string } };
}

async function fetchGiphy(q?: string) {
  loadingGifs.value = true;
  try {
    const key = runtimeConfig.public.giphyApiKey;
    const url = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=20&rating=g`;
    const res = await fetch(url);
    const data = (await res.json()) as { data: GiphyResult[] };
    gifs.value = data.data.map((r) => ({
      url: r.images.original.url,
      preview: r.images.fixed_height_small.url,
    }));
  } finally {
    loadingGifs.value = false;
  }
}

function searchGifs() {
  void fetchGiphy(gifQuery.value.trim() || undefined);
}

function toggleGif() {
  showGif.value = !showGif.value;
  if (showGif.value) {
    showEmoji.value = false;
    if (gifEnabled.value) void fetchGiphy();
  }
}

function sendGif(url: string) {
  emit('send', url);
  showGif.value = false;
}

function send() {
  const content = input.value.trim();
  if (!content || props.disabled) return;
  emit('send', content);
  input.value = '';
  nextTick(resize);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

onClickOutside(emojiWrapperEl, () => {
  showEmoji.value = false;
});
onClickOutside(gifWrapperEl, () => {
  showGif.value = false;
});
</script>

<template>
  <div class="px-3 pb-3 pt-2 flex-shrink-0">
    <div class="input-bar">
      <!-- Textarea -->
      <textarea
        ref="textareaEl"
        v-model="input"
        :placeholder="placeholder ?? 'Message…'"
        :disabled="disabled"
        rows="1"
        class="flex-1 resize-none bg-transparent text-sm focus:outline-none py-2.5 pl-4 pr-2 leading-relaxed"
        style="color: rgba(255, 255, 255, 0.85); min-height: 42px; max-height: 140px"
        :class="{ 'opacity-50': disabled }"
        @keydown="handleKeydown"
      />

      <!-- Right-side actions -->
      <div class="flex items-end pb-1.5 pr-2 gap-0.5 flex-shrink-0">
        <!-- GIF -->
        <div v-if="gifEnabled" ref="gifWrapperEl" class="relative">
          <button
            class="action-btn text-xs font-bold tracking-wide"
            :class="showGif ? 'text-indigo-400' : ''"
            title="GIF"
            @click="toggleGif"
          >
            GIF
          </button>
          <div v-if="showGif" class="popup gif-popup">
            <div class="p-2">
              <input
                v-model="gifQuery"
                placeholder="Rechercher un GIF…"
                class="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none"
                style="
                  background: rgba(255, 255, 255, 0.08);
                  color: rgba(255, 255, 255, 0.85);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                "
                @keydown.enter="searchGifs"
              />
            </div>
            <div v-if="loadingGifs" class="flex items-center justify-center py-6">
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
              />
            </div>
            <div
              v-else-if="gifs.length === 0"
              class="flex items-center justify-center py-6 text-xs"
              style="color: rgba(255, 255, 255, 0.25)"
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
                @click="sendGif(gif.url)"
              >
                <img :src="gif.preview" class="w-full h-full object-cover" loading="lazy" />
              </button>
            </div>
          </div>
        </div>

        <!-- Emoji -->
        <div ref="emojiWrapperEl" class="relative">
          <button
            class="action-btn text-base"
            :class="showEmoji ? 'text-indigo-400' : ''"
            title="Emoji"
            @click="toggleEmoji"
          >
            😀
          </button>
          <div v-if="showEmoji" class="popup emoji-popup">
            <div
              class="flex gap-0.5 p-1.5 pb-1"
              style="border-bottom: 1px solid rgba(255, 255, 255, 0.07)"
            >
              <button
                v-for="(cat, i) in EMOJI_CATEGORIES"
                :key="i"
                class="text-sm px-1 py-0.5 rounded transition-colors"
                :class="
                  activeEmojiCat === i
                    ? 'bg-indigo-500/30 text-white'
                    : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                "
                :title="cat.name"
                @click="activeEmojiCat = i"
              >
                {{ cat.label }}
              </button>
            </div>
            <div class="grid grid-cols-5 gap-0.5 p-1.5 overflow-y-auto" style="max-height: 170px">
              <button
                v-for="emoji in EMOJI_CATEGORIES[activeEmojiCat]?.emojis"
                :key="emoji"
                class="text-xl rounded hover:bg-white/10 transition-colors p-1 flex items-center justify-center leading-none"
                @click="insertEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-bar {
  display: flex;
  align-items: flex-end;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.15s;
}
.input-bar:focus-within {
  border-color: rgba(255, 255, 255, 0.14);
}

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
  color: rgba(255, 255, 255, 0.4);
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}

.popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  border-radius: 12px;
  overflow: hidden;
  z-index: 50;
  background: rgba(16, 16, 26, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}
.emoji-popup {
  width: 232px;
}
.gif-popup {
  width: 290px;
}
</style>
