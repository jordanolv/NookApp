<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import EmojiPicker from './EmojiPicker.vue';
import GifPicker from './GifPicker.vue';

const props = defineProps<{
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  send: [content: string];
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
watch(input, () => nextTick(resize));
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
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}
</script>

<template>
  <div class="px-3 pb-3 pt-2 flex-shrink-0">
    <div class="input-bar">
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
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.15s;
}
.input-bar:focus-within {
  border-color: rgba(255, 255, 255, 0.14);
}
</style>
