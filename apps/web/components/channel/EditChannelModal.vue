<script setup lang="ts">
import type { ChannelPublic } from '@nookapp/protocol';
import { Hash } from 'lucide-vue-next';
import { CHANNEL_ICONS, CHANNEL_ICON_MAP } from '~/composables/useChannelIcons';
import { useServersStore } from '~/stores/servers';

const props = defineProps<{ serverId: string; channel: ChannelPublic }>();
const emit = defineEmits<{ close: []; updated: [channel: ChannelPublic] }>();

const { updateChannel, setChannelIcon } = useChannels();
const { t } = useI18n();
const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;
const store = useServersStore();
const categories = computed(() => [...store.categories].sort((a, b) => a.position - b.position));
const categoryId = ref<string | null>(props.channel.categoryId ?? null);

const COLORS = [
  { label: 'Indigo', value: '#818cf8' },
  { label: 'Violet', value: '#a78bfa' },
  { label: 'Blue', value: '#60a5fa' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Teal', value: '#2dd4bf' },
  { label: 'Emerald', value: '#34d399' },
  { label: 'Green', value: '#4ade80' },
  { label: 'Yellow', value: '#fbbf24' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Red', value: '#f87171' },
  { label: 'Pink', value: '#f472b6' },
  { label: 'Rose', value: '#fb7185' },
  { label: 'White', value: '#f1f5f9' },
  { label: 'Slate', value: '#94a3b8' },
];

const EMOJIS = [
  '💬',
  '📢',
  '📣',
  '🔔',
  '🎙️',
  '🎤',
  '🎮',
  '🎲',
  '🎯',
  '🏆',
  '🎵',
  '🎨',
  '📸',
  '📹',
  '🖥️',
  '💻',
  '⌨️',
  '🖱️',
  '📋',
  '📁',
  '📌',
  '📎',
  '✏️',
  '📝',
  '💡',
  '🔧',
  '🛠️',
  '⚙️',
  '🚀',
  '🌟',
  '☕',
  '🍕',
  '🏠',
  '🌿',
  '🔒',
  '❓',
];

// ── Parse existing iconUrl ──
function parseIconUrl(url: string | null) {
  if (!url) return { type: 'none' as const };
  if (url.startsWith('/')) return { type: 'image' as const, url };
  if (url.startsWith('icon:')) {
    const [, name, color] = url.split(':');
    return { type: 'lucide' as const, name, color: color ?? '#818cf8' };
  }
  return { type: 'emoji' as const, emoji: url };
}

type Mode = 'lucide' | 'emoji' | 'image';

const parsed = parseIconUrl(props.channel.iconUrl);
const mode = ref<Mode>(
  parsed.type === 'lucide'
    ? 'lucide'
    : parsed.type === 'emoji'
      ? 'emoji'
      : parsed.type === 'image'
        ? 'image'
        : 'lucide',
);

const name = ref(props.channel.name);
const selectedIcon = ref<string>(parsed.type === 'lucide' ? parsed.name : 'hash');
const selectedColor = ref<string>(parsed.type === 'lucide' ? parsed.color : '#818cf8');
const selectedEmoji = ref<string | null>(parsed.type === 'emoji' ? parsed.emoji : null);
const pendingFile = ref<File | null>(null);
const previewSrc = ref<string | null>(null);
const existingImageUrl = ref<string | null>(parsed.type === 'image' ? parsed.url : null);

const loading = ref(false);
const error = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const currentIconComponent = computed(() => CHANNEL_ICON_MAP[selectedIcon.value] ?? Hash);

const imageDisplaySrc = computed(() => {
  if (previewSrc.value) return previewSrc.value;
  if (existingImageUrl.value) return `${apiOrigin}${existingImageUrl.value}`;
  return null;
});

function pickFile() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  pendingFile.value = file;
  previewSrc.value = URL.createObjectURL(file);
}

function clearAll() {
  pendingFile.value = null;
  previewSrc.value = null;
  existingImageUrl.value = null;
  selectedEmoji.value = null;
  selectedIcon.value = 'hash';
  if (fileInput.value) fileInput.value.value = '';
}

async function save() {
  if (!name.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    if (mode.value === 'image' && pendingFile.value) {
      await setChannelIcon(props.serverId, props.channel.id, pendingFile.value);
    }

    const patch: Record<string, unknown> = {
      name: name.value.trim(),
      categoryId: categoryId.value,
    };
    if (mode.value === 'lucide') {
      patch.iconUrl = `icon:${selectedIcon.value}:${selectedColor.value}`;
    } else if (mode.value === 'emoji') {
      patch.iconUrl = selectedEmoji.value;
    } else if (mode.value === 'image' && !pendingFile.value) {
      patch.iconUrl = existingImageUrl.value;
    }

    const updated = await updateChannel(props.serverId, props.channel.id, patch);
    emit('updated', updated);
  } catch {
    error.value = t('channels.edit.error');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center"
      style="background: rgba(0, 0, 0, 0.6)"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style="
          background: rgba(10, 10, 16, 0.82);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        "
      >
        <!-- Title bar -->
        <div
          class="flex items-center gap-3 px-4 py-3"
          style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
        >
          <div class="flex gap-1.5">
            <button
              class="h-3 w-3 rounded-full transition-opacity hover:opacity-75"
              style="background: #ef4444"
              @click="emit('close')"
            />
            <div class="h-3 w-3 rounded-full" style="background: rgba(255, 255, 255, 0.08)" />
            <div class="h-3 w-3 rounded-full" style="background: rgba(255, 255, 255, 0.08)" />
          </div>
          <span class="text-xs font-semibold" style="color: rgba(255, 255, 255, 0.5)">
            {{ t('channels.edit.title') }}
          </span>
        </div>

        <div class="p-4 flex flex-col gap-4">
          <!-- Preview + mode tabs -->
          <div class="flex items-center gap-3">
            <!-- Live preview -->
            <div
              class="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden"
              style="
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.08);
              "
            >
              <component
                :is="currentIconComponent"
                v-if="mode === 'lucide'"
                :size="22"
                :color="selectedColor"
                :stroke-width="1.75"
              />
              <span v-else-if="mode === 'emoji' && selectedEmoji" class="text-xl">{{
                selectedEmoji
              }}</span>
              <img
                v-else-if="mode === 'image' && imageDisplaySrc"
                :src="imageDisplaySrc"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-lg" style="color: rgba(255, 255, 255, 0.15)">#</span>
            </div>

            <!-- Tabs + clear -->
            <div class="flex flex-col gap-1.5 flex-1">
              <p class="text-xs font-medium" style="color: rgba(255, 255, 255, 0.25)">
                {{ t('channels.edit.iconType') }}
              </p>
              <div class="flex gap-1.5 flex-wrap">
                <button
                  class="mode-tab"
                  :class="{ 'mode-tab--active': mode === 'lucide' }"
                  @click="mode = 'lucide'"
                >
                  {{ t('channels.edit.icon') }}
                </button>
                <button
                  class="mode-tab"
                  :class="{ 'mode-tab--active': mode === 'emoji' }"
                  @click="mode = 'emoji'"
                >
                  {{ t('channels.edit.emoji') }}
                </button>
                <button
                  class="mode-tab"
                  :class="{ 'mode-tab--active': mode === 'image' }"
                  @click="mode = 'image'"
                >
                  {{ t('channels.edit.image') }}
                </button>
                <button class="mode-tab mode-tab--danger" @click="clearAll">
                  {{ t('channels.edit.none') }}
                </button>
              </div>
            </div>
          </div>

          <!-- ── Lucide icon picker ── -->
          <div v-if="mode === 'lucide'" class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
                {{ t('channels.edit.iconLabel') }}
              </p>
              <div class="icon-grid">
                <button
                  v-for="ic in CHANNEL_ICONS"
                  :key="ic.name"
                  class="icon-btn"
                  :class="{ 'icon-btn--active': selectedIcon === ic.name }"
                  :title="ic.name"
                  @click="selectedIcon = ic.name"
                >
                  <component
                    :is="ic.component"
                    :size="16"
                    :color="selectedIcon === ic.name ? selectedColor : 'rgba(255,255,255,0.45)'"
                    :stroke-width="1.75"
                  />
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
                {{ t('channels.edit.color') }}
              </p>
              <div class="color-grid">
                <button
                  v-for="c in COLORS"
                  :key="c.value"
                  class="color-btn"
                  :title="c.label"
                  :style="{ background: c.value }"
                  :class="{ 'color-btn--active': selectedColor === c.value }"
                  @click="selectedColor = c.value"
                />
              </div>
            </div>
          </div>

          <!-- ── Emoji picker ── -->
          <div v-else-if="mode === 'emoji'" class="flex flex-col gap-1.5">
            <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              {{ t('channels.edit.chooseEmoji') }}
            </p>
            <div class="emoji-grid">
              <button
                v-for="e in EMOJIS"
                :key="e"
                class="emoji-btn"
                :class="{ 'emoji-btn--active': selectedEmoji === e }"
                @click="selectedEmoji = e"
              >
                {{ e }}
              </button>
            </div>
          </div>

          <!-- ── Image upload ── -->
          <div v-else class="flex items-center gap-3">
            <button class="icon-pick-btn" @click="pickFile">
              <img
                v-if="imageDisplaySrc"
                :src="imageDisplaySrc"
                class="h-16 w-16 rounded-xl object-cover"
              />
              <div
                v-else
                class="h-16 w-16 rounded-xl flex items-center justify-center"
                style="background: rgba(255, 255, 255, 0.05)"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: rgba(255, 255, 255, 0.2)"
                >
                  <path
                    d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                  />
                </svg>
              </div>
              <div class="icon-pick-overlay rounded-xl">
                <span class="text-xs font-medium">{{ t('channels.edit.change') }}</span>
              </div>
            </button>
            <div class="flex flex-col gap-1.5">
              <p class="text-xs" style="color: rgba(255, 255, 255, 0.3)">
                {{ t('channels.edit.fileHint') }}
              </p>
              <button class="action-btn" @click="pickFile">{{ t('channels.edit.browse') }}</button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileChange"
            />
          </div>

          <!-- Name input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">{{
              t('channels.edit.name')
            }}</label>
            <input
              v-model="name"
              type="text"
              class="rounded-xl px-3 py-2 text-xs outline-none"
              style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.8);
              "
              maxlength="100"
              @keydown.enter="save"
            />
          </div>

          <!-- Category select -->
          <div v-if="categories.length" class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">{{
              t('channels.edit.category')
            }}</label>
            <select
              v-model="categoryId"
              class="rounded-xl px-3 py-2 text-xs outline-none appearance-none"
              style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.8);
              "
            >
              <option :value="null" style="background: #0d0d18">
                {{ t('channels.edit.noCategory') }}
              </option>
              <option
                v-for="cat in categories"
                :key="cat.id"
                :value="cat.id"
                style="background: #0d0d18"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <p v-if="error" class="text-xs px-0.5" style="color: rgb(248, 113, 113)">{{ error }}</p>

          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl py-2 text-xs font-medium"
              style="background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4)"
              @click="emit('close')"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="flex-1 rounded-xl py-2 text-xs font-semibold transition-opacity"
              style="background: rgba(99, 102, 241, 0.85); color: white"
              :class="{ 'opacity-40 pointer-events-none': loading || !name.trim() }"
              @click="save"
            >
              {{ loading ? t('channels.edit.saving') : t('channels.edit.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mode-tab {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.mode-tab:hover {
  background: rgba(255, 255, 255, 0.09);
}
.mode-tab--active {
  background: rgba(99, 102, 241, 0.2);
  color: rgb(165, 180, 252);
  border-color: rgba(99, 102, 241, 0.35);
}
.mode-tab--danger {
  color: rgba(248, 113, 113, 0.7);
}
.mode-tab--danger:hover {
  background: rgba(248, 113, 113, 0.08);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 3px;
}
.icon-btn {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 100ms,
    border-color 100ms;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.icon-btn--active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.35);
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.color-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    transform 100ms,
    border-color 100ms;
}
.color-btn:hover {
  transform: scale(1.15);
}
.color-btn--active {
  border-color: white;
  transform: scale(1.15);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 4px;
}
.emoji-btn {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 100ms,
    border-color 100ms;
}
.emoji-btn:hover {
  background: rgba(255, 255, 255, 0.09);
}
.emoji-btn--active {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
}

.icon-pick-btn {
  position: relative;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  flex-shrink: 0;
}
.icon-pick-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  opacity: 0;
  transition: opacity 150ms;
}
.icon-pick-btn:hover .icon-pick-overlay {
  opacity: 1;
}
.action-btn {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: background 120ms;
  width: fit-content;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
