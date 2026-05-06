<script setup lang="ts">
import type { ChannelType, WidgetKind } from '@nookapp/protocol';

const props = defineProps<{ serverId: string }>();
const emit = defineEmits<{
  close: [];
  created: [channelId: string, type: ChannelType];
}>();

const { createChannel } = useChannels();

const selectedType = ref<ChannelType>('text');
const selectedWidgetKind = ref<WidgetKind>('notes');
const name = ref('');
const loading = ref(false);
const error = ref('');

const types: { value: ChannelType; icon: string; label: string; hint: string }[] = [
  { value: 'text', icon: '#', label: 'Texte', hint: 'Messages, liens, fichiers' },
  { value: 'forum', icon: '≡', label: 'Forum', hint: 'Threads organisés par sujet' },
  { value: 'voice', icon: '◉', label: 'Vocal', hint: 'Zone vocale sur la map' },
  { value: 'widget', icon: '⊟', label: 'Widget', hint: 'Notes, library, …' },
];

const widgetKinds: { value: WidgetKind; icon: string; label: string; hint: string }[] = [
  { value: 'notes', icon: '✎', label: 'Notes', hint: 'Notes rapides style Apple' },
  { value: 'gaming', icon: '⌘', label: 'Gaming', hint: 'Library de jeux + discussions' },
];

async function submit() {
  if (!name.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    const channel = await createChannel(props.serverId, {
      name: name.value.trim(),
      type: selectedType.value,
      ...(selectedType.value === 'widget' && { widgetKind: selectedWidgetKind.value }),
    });
    emit('created', channel.id, channel.type);
  } catch {
    error.value = 'Erreur lors de la création.';
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
            Créer un canal
          </span>
        </div>

        <div class="p-4 flex flex-col gap-4">
          <!-- Type selector -->
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              TYPE DE CANAL
            </p>
            <div class="flex flex-col gap-1">
              <button
                v-for="t in types"
                :key="t.value"
                class="type-btn flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                :class="{ 'type-btn--active': selectedType === t.value }"
                @click="selectedType = t.value"
              >
                <span
                  class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  :class="selectedType === t.value ? 'type-icon--active' : 'type-icon'"
                  >{{ t.icon }}</span
                >
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs font-medium"
                    :class="selectedType === t.value ? 'text-indigo-300' : 'text-white/60'"
                    >{{ t.label }}</span
                  >
                  <span class="text-xs truncate" style="color: rgba(255, 255, 255, 0.25)">{{
                    t.hint
                  }}</span>
                </div>
                <span
                  v-if="selectedType === t.value"
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
              TYPE DE WIDGET
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
                    >{{ k.label }}</span
                  >
                </span>
                <span class="text-xs" style="color: rgba(255, 255, 255, 0.25)">{{ k.hint }}</span>
              </button>
            </div>
          </div>

          <!-- Name input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)"
              >NOM DU CANAL</label
            >
            <input
              v-model="name"
              type="text"
              class="rounded-xl px-3 py-2 text-xs outline-none"
              style="
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.8);
              "
              :placeholder="
                selectedType === 'text'
                  ? 'général'
                  : selectedType === 'forum'
                    ? 'gaming'
                    : selectedType === 'widget'
                      ? selectedWidgetKind === 'notes'
                        ? 'Mes notes'
                        : 'Gaming'
                      : 'Salon vocal'
              "
              maxlength="100"
              @keydown.enter="submit"
            />
            <p
              v-if="selectedType === 'voice'"
              class="text-xs px-0.5"
              style="color: rgba(255, 255, 255, 0.2)"
            >
              Après la création, tu pourras définir la zone sur la map.
            </p>
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
                ? 'Création…'
                : selectedType === 'voice'
                  ? 'Créer et placer →'
                  : 'Créer le canal'
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
