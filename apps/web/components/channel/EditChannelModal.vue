<script setup lang="ts">
import { computed, ref } from 'vue';
import { Lock } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';

const props = defineProps<{ serverId: string; channel: ChannelPublic }>();
const emit = defineEmits<{ close: []; updated: [] }>();

const { updateChannel } = useChannels();

const name = ref(props.channel.name);
const color = ref<string | null>(props.channel.color);
const iconName = ref<string | null>(props.channel.iconName);

const loading = ref(false);
const error = ref('');

const dirty = computed(
  () =>
    name.value.trim() !== props.channel.name ||
    color.value !== props.channel.color ||
    iconName.value !== props.channel.iconName,
);
const canSave = computed(() => dirty.value && name.value.trim().length > 0 && !loading.value);

async function save() {
  if (!canSave.value) return;
  loading.value = true;
  error.value = '';
  try {
    await updateChannel(props.serverId, props.channel.id, {
      name: name.value.trim(),
      color: color.value,
      iconName: iconName.value,
    });
    emit('updated');
    emit('close');
  } catch {
    error.value = 'Impossible de sauvegarder';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center"
      style="background: rgba(20, 35, 25, 0.55)"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        :style="{
          background: 'var(--surface-strong)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          border: '1px solid var(--surface-border)',
          boxShadow: 'var(--shadow-lift)',
          color: 'var(--ink)',
        }"
      >
        <header
          class="flex items-center justify-between px-4 py-3"
          :style="{ borderBottom: '1px solid var(--surface-divider)' }"
        >
          <span
            class="text-xs font-semibold uppercase tracking-wider"
            :style="{ color: 'var(--ink-soft)' }"
          >
            Modifier #{{ channel.name }}
          </span>
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            :style="{ color: 'var(--ink-muted)' }"
            title="Fermer"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <div class="p-4 flex flex-col gap-5">
          <section class="flex flex-col gap-1.5">
            <label
              class="text-xs font-semibold uppercase tracking-wider"
              :style="{ color: 'var(--ink-muted)' }"
            >
              Nom
            </label>
            <input
              v-model="name"
              type="text"
              class="rounded-lg px-3 py-2 text-sm outline-none"
              :style="{
                background: 'var(--surface-tinted)',
                border: '1px solid var(--surface-border)',
                color: 'var(--ink)',
              }"
              maxlength="100"
              @keydown.enter="save"
            />
          </section>

          <section>
            <ChannelStylePicker
              :color="color"
              :icon-name="iconName"
              @update:color="(v) => (color = v)"
              @update:icon-name="(v) => (iconName = v)"
            />
          </section>

          <section
            class="rounded-xl p-3 flex items-start gap-3"
            :style="{
              background: 'var(--surface-tinted)',
              border: '1px dashed var(--surface-border)',
            }"
          >
            <Lock
              :size="14"
              :style="{ color: 'var(--ink-muted)', flexShrink: 0, marginTop: '2px' }"
            />
            <div class="text-xs leading-relaxed" :style="{ color: 'var(--ink-muted)' }">
              <strong :style="{ color: 'var(--ink-soft)' }">Permissions</strong> par channel —
              bientôt. Pour l'instant les permissions se gèrent au niveau des rôles du Nook.
            </div>
          </section>

          <p v-if="error" class="text-xs" :style="{ color: 'var(--accent-rose)' }">{{ error }}</p>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              class="flex-1 rounded-lg py-2 text-xs font-medium transition-colors"
              :style="{ background: 'var(--surface-tinted)', color: 'var(--ink-muted)' }"
              @click="emit('close')"
            >
              Annuler
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg py-2 text-xs font-semibold transition-opacity"
              :style="{
                background: 'var(--ink)',
                color: 'var(--ink-inverse)',
                opacity: canSave ? 1 : 0.4,
                cursor: canSave ? 'pointer' : 'not-allowed',
              }"
              :disabled="!canSave"
              @click="save"
            >
              {{ loading ? 'Sauvegarde…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
