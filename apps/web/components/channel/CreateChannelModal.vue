<script setup lang="ts">
import type { ChannelType, WidgetKind } from '@nookapp/protocol';

const props = defineProps<{ serverId: string }>();
const emit = defineEmits<{
  close: [];
  created: [channelId: string, type: ChannelType];
}>();

const { createChannel, setChannelBanner } = useChannels();
const { t } = useI18n();

const selectedType = ref<ChannelType>('text');
const selectedWidgetKind = ref<WidgetKind>('notes');
const name = ref('');
const loading = ref(false);
const error = ref('');
const bannerFile = ref<File | null>(null);
const bannerPreview = ref('');
const bannerInputRef = ref<HTMLInputElement | null>(null);

function onBannerChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  bannerFile.value = file;
  bannerPreview.value = URL.createObjectURL(file);
}

function clearBanner() {
  bannerFile.value = null;
  bannerPreview.value = '';
  if (bannerInputRef.value) bannerInputRef.value.value = '';
}

const types: { value: ChannelType; icon: string; labelKey: string; hintKey: string }[] = [
  {
    value: 'text',
    icon: '#',
    labelKey: 'channels.types.text.label',
    hintKey: 'channels.types.text.hint',
  },
  {
    value: 'forum',
    icon: '≡',
    labelKey: 'channels.types.forum.label',
    hintKey: 'channels.types.forum.hint',
  },
  {
    value: 'voice',
    icon: '◉',
    labelKey: 'channels.types.voice.label',
    hintKey: 'channels.types.voice.hint',
  },
  {
    value: 'widget',
    icon: '⊟',
    labelKey: 'channels.types.widget.label',
    hintKey: 'channels.types.widget.hint',
  },
];

const widgetKinds: { value: WidgetKind; icon: string; labelKey: string; hintKey: string }[] = [
  {
    value: 'notes',
    icon: '✎',
    labelKey: 'channels.widgets.notes.label',
    hintKey: 'channels.widgets.notes.hint',
  },
  {
    value: 'gaming',
    icon: '⌘',
    labelKey: 'channels.widgets.gaming.label',
    hintKey: 'channels.widgets.gaming.hint',
  },
];

const namePlaceholder = computed(() => {
  if (selectedType.value === 'text') return t('channels.create.placeholders.text');
  if (selectedType.value === 'forum') return t('channels.create.placeholders.forum');
  if (selectedType.value === 'widget') {
    return selectedWidgetKind.value === 'notes'
      ? t('channels.create.placeholders.notes')
      : t('channels.create.placeholders.gaming');
  }
  return t('channels.create.placeholders.voice');
});

async function submit() {
  if (!name.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    const channel = await createChannel(props.serverId, {
      name: name.value.trim(),
      type: selectedType.value,
      showStat: true,
      ...(selectedType.value === 'widget' && { widgetKind: selectedWidgetKind.value }),
    });
    if (bannerFile.value) {
      await setChannelBanner(props.serverId, channel.id, bannerFile.value);
    }
    emit('created', channel.id, channel.type);
  } catch {
    error.value = t('channels.create.error');
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
            {{ t('channels.create.title') }}
          </span>
        </div>

        <div class="p-4 flex flex-col gap-4">
          <!-- Type selector -->
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              {{ t('channels.create.channelType') }}
            </p>
            <div class="flex flex-col gap-1">
              <button
                v-for="type in types"
                :key="type.value"
                class="type-btn flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                :class="{ 'type-btn--active': selectedType === type.value }"
                @click="selectedType = type.value"
              >
                <span
                  class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  :class="selectedType === type.value ? 'type-icon--active' : 'type-icon'"
                  >{{ type.icon }}</span
                >
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs font-medium"
                    :class="selectedType === type.value ? 'text-indigo-300' : 'text-white/60'"
                    >{{ t(type.labelKey) }}</span
                  >
                  <span class="text-xs truncate" style="color: rgba(255, 255, 255, 0.25)">{{
                    t(type.hintKey)
                  }}</span>
                </div>
                <span
                  v-if="selectedType === type.value"
                  class="ml-auto flex-shrink-0 h-3.5 w-3.5 rounded-full flex items-center justify-center text-xs"
                  style="background: rgba(99, 102, 241, 0.8); color: white"
                  >✓</span
                >
              </button>
            </div>
          </div>

          <!-- Widget kind selector (when type === 'widget') -->
          <div v-if="selectedType === 'widget'" class="flex flex-col gap-1.5">
            <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              {{ t('channels.create.widgetType') }}
            </p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="k in widgetKinds"
                :key="k.value"
                class="kind-btn flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left"
                :class="{ 'kind-btn--active': selectedWidgetKind === k.value }"
                @click="selectedWidgetKind = k.value"
              >
                <span class="flex items-center gap-1.5">
                  <span class="text-sm font-bold">{{ k.icon }}</span>
                  <span
                    class="text-xs font-medium"
                    :class="selectedWidgetKind === k.value ? 'text-indigo-300' : 'text-white/60'"
                    >{{ t(k.labelKey) }}</span
                  >
                </span>
                <span class="text-xs" style="color: rgba(255, 255, 255, 0.25)">{{
                  t(k.hintKey)
                }}</span>
              </button>
            </div>
          </div>

          <!-- Name input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">{{
              t('channels.create.name')
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
              :placeholder="namePlaceholder"
              maxlength="100"
              @keydown.enter="submit"
            />
            <p
              v-if="selectedType === 'voice'"
              class="text-xs px-0.5"
              style="color: rgba(255, 255, 255, 0.2)"
            >
              {{ t('channels.create.voiceZoneHint') }}
            </p>
          </div>

          <!-- Banner (optional) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              {{ t('channels.create.banner') }}
              <span class="ml-1" style="color: rgba(255, 255, 255, 0.15)">{{
                t('channels.create.bannerOptional')
              }}</span>
            </label>
            <div
              class="relative rounded-xl overflow-hidden cursor-pointer"
              style="border: 1px dashed rgba(255, 255, 255, 0.1)"
              @click="bannerInputRef?.click()"
            >
              <img
                v-if="bannerPreview"
                :src="bannerPreview"
                class="w-full object-cover"
                style="height: 72px"
              />
              <div
                v-else
                class="flex items-center justify-center gap-2"
                style="height: 52px; background: rgba(255, 255, 255, 0.025)"
              >
                <span class="text-xs" style="color: rgba(255, 255, 255, 0.2)">{{
                  t('channels.create.bannerPick')
                }}</span>
              </div>
              <button
                v-if="bannerPreview"
                class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style="background: rgba(0, 0, 0, 0.6); color: rgba(255, 255, 255, 0.7)"
                @click.stop="clearBanner"
              >
                ×
              </button>
              <input
                ref="bannerInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onBannerChange"
              />
            </div>
          </div>

          <p v-if="error" class="text-xs px-0.5" style="color: rgb(248, 113, 113)">{{ error }}</p>

          <!-- Submit -->
          <button
            class="w-full rounded-xl py-2 text-xs font-semibold transition-opacity"
            style="background: rgba(99, 102, 241, 0.85); color: white"
            :class="{ 'opacity-40 pointer-events-none': loading || !name.trim() }"
            @click="submit"
          >
            {{
              loading
                ? t('channels.create.creating')
                : selectedType === 'voice'
                  ? t('channels.create.createAndPlace')
                  : t('channels.create.submit')
            }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.type-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition:
    background 120ms,
    border-color 120ms;
}
.type-btn:hover {
  background: rgba(255, 255, 255, 0.055);
}
.type-btn--active {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
}
.type-btn--active:hover {
  background: rgba(99, 102, 241, 0.16);
}
.type-icon {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
}
.type-icon--active {
  background: rgba(99, 102, 241, 0.25);
  color: rgb(165, 180, 252);
}
.kind-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition:
    background 120ms,
    border-color 120ms;
}
.kind-btn:hover {
  background: rgba(255, 255, 255, 0.055);
}
.kind-btn--active {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
}
</style>
