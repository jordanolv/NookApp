<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import EmojiPicker from './EmojiPicker.vue';
import GifPicker from './GifPicker.vue';

const props = defineProps<{
  placeholder?: string;
  disabled?: boolean;
  mentionNames?: string[];
}>();

const emit = defineEmits<{
  send: [content: string];
  typing: [];
}>();

const gifEnabled = computed(() => !!useRuntimeConfig().public.giphyApiKey);

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const input = ref('');
const emojiOpen = ref(false);
const gifOpen = ref(false);

watch(emojiOpen, (v) => {
  if (v) gifOpen.value = false;
});
watch(gifOpen, (v) => {
  if (v) emojiOpen.value = false;
});

function resize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
watch(input, () => {
  nextTick(resize);
  if (input.value.trim()) emit('typing');
});
onMounted(resize);

function insertEmoji(emoji: string) {
  const el = textareaEl.value;
  if (!el) return;
  const pos = el.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  nextTick(() => {
    el.focus();
    const np = pos + emoji.length;
    el.setSelectionRange(np, np);
  });
}

// ── @mention autocomplete ──────────────────────────────────────────────
const caret = ref(0);
const mentionIndex = ref(0);

function syncCaret() {
  caret.value = textareaEl.value?.selectionStart ?? input.value.length;
}

const mentionQuery = computed(() => {
  const before = input.value.slice(0, caret.value);
  return /(?:^|\s)@([\p{L}\p{N}_-]*)$/u.exec(before)?.[1] ?? null;
});

const mentionMatches = computed(() => {
  const q = mentionQuery.value;
  if (q === null) return [];
  const needle = q.toLowerCase();
  return (props.mentionNames ?? []).filter((n) => n.toLowerCase().includes(needle)).slice(0, 6);
});

watch(mentionMatches, () => (mentionIndex.value = 0));

function pickMention(name: string) {
  const el = textareaEl.value;
  const start = input.value.slice(0, caret.value).lastIndexOf('@');
  if (start === -1) return;
  const inserted = `@${name} `;
  input.value = input.value.slice(0, start) + inserted + input.value.slice(caret.value);
  const pos = start + inserted.length;
  nextTick(() => {
    el?.focus();
    el?.setSelectionRange(pos, pos);
    syncCaret();
  });
}

function handleMentionKeydown(e: KeyboardEvent): boolean {
  const matches = mentionMatches.value;
  if (!matches.length) return false;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const step = e.key === 'ArrowDown' ? 1 : matches.length - 1;
    mentionIndex.value = (mentionIndex.value + step) % matches.length;
    return true;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    pickMention(matches[mentionIndex.value]!);
    return true;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    caret.value = 0;
    return true;
  }
  return false;
}

function send() {
  const content = input.value.trim();
  if (!content || props.disabled) return;
  emit('send', content);
  input.value = '';
  nextTick(resize);
}

function sendGif(url: string) {
  emit('send', url);
}

function handleKeydown(e: KeyboardEvent) {
  if (handleMentionKeydown(e)) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}
</script>

<template>
  <div class="px-3 pb-3 pt-2 flex-shrink-0 relative">
    <ul v-if="mentionMatches.length" class="mention-pop">
      <li v-for="(name, i) in mentionMatches" :key="name">
        <button
          type="button"
          class="mention-pop__item"
          :class="{ 'mention-pop__item--active': i === mentionIndex }"
          @mousedown.prevent="pickMention(name)"
        >
          @{{ name }}
        </button>
      </li>
    </ul>
    <div class="input-bar">
      <textarea
        ref="textareaEl"
        v-model="input"
        :placeholder="placeholder ?? 'Message…'"
        :disabled="disabled"
        rows="1"
        class="flex-1 resize-none bg-transparent text-sm focus:outline-none py-2.5 pl-4 pr-2 leading-relaxed"
        :style="{ color: 'var(--ink)', minHeight: '42px', maxHeight: '140px' }"
        :class="{ 'opacity-50': disabled }"
        @keydown="handleKeydown"
        @keyup="syncCaret"
        @click="syncCaret"
      />

      <div class="flex items-end pb-1.5 pr-2 gap-0.5 flex-shrink-0">
        <GifPicker v-if="gifEnabled" v-model:open="gifOpen" @pick="sendGif" />
        <EmojiPicker v-model:open="emojiOpen" @pick="insertEmoji" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-bar {
  display: flex;
  align-items: flex-end;
  border-radius: 12px;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
  transition: border-color 0.15s;
}
.input-bar:focus-within {
  border-color: var(--ink-muted);
}

.mention-pop {
  position: absolute;
  bottom: calc(100% - 6px);
  left: 12px;
  right: 12px;
  z-index: 20;
  margin: 0;
  padding: 4px;
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
  border-radius: 10px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lift);
}
.mention-pop__item {
  display: block;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.mention-pop__item--active,
.mention-pop__item:hover {
  background: color-mix(in srgb, var(--accent-violet) 18%, transparent);
  color: var(--accent-violet);
}
</style>
