<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Copy, Plus, X, Circle, CircleCheck } from 'lucide-vue-next';
import {
  usePluginRegistrations,
  type PluginRegistrationPublic,
} from '~/composables/usePluginRegistrations';

const { t } = useI18n();
const { listMine, create } = usePluginRegistrations();

const plugins = ref<PluginRegistrationPublic[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);

const showForm = ref(false);
const nameDraft = ref('');
const descDraft = ref('');
const creating = ref(false);
const createError = ref<string | null>(null);

const revealed = ref<{ key: string; name: string } | null>(null);
const copied = ref(false);

const canCreate = computed(() => nameDraft.value.trim().length >= 2 && !creating.value);

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    plugins.value = await listMine();
  } catch (e) {
    loadError.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!canCreate.value) return;
  creating.value = true;
  createError.value = null;
  try {
    const result = await create({
      name: nameDraft.value.trim(),
      description: descDraft.value.trim() || undefined,
    });
    revealed.value = { key: result.apiKey, name: result.registration.name };
    nameDraft.value = '';
    descDraft.value = '';
    showForm.value = false;
    await load();
  } catch (e) {
    createError.value =
      (e as { data?: { message?: string } })?.data?.message ?? (e as Error).message;
  } finally {
    creating.value = false;
  }
}

async function copyKey() {
  if (!revealed.value) return;
  await navigator.clipboard.writeText(revealed.value.key);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
          {{ t('settings.user.developer.heading') }}
        </h3>
        <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
          {{ t('settings.user.developer.description') }}
        </p>
      </div>
      <button
        v-if="!showForm"
        type="button"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style="background: rgba(99, 102, 241, 0.9); color: white"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'rgb(99, 102, 241)'"
        @mouseleave="
          ($event.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.9)'
        "
        @click="showForm = true"
      >
        <Plus :size="13" :stroke-width="2" />
        {{ t('settings.user.developer.create') }}
      </button>
    </header>

    <div
      v-if="revealed"
      class="rounded-lg p-4 space-y-3"
      style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25)"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold" style="color: rgba(134, 239, 172, 0.95)">
            {{ t('settings.user.developer.keyReveal.title', { name: revealed.name }) }}
          </p>
          <p class="text-xs mt-1" style="color: rgba(255, 255, 255, 0.55)">
            {{ t('settings.user.developer.keyReveal.warning') }}
          </p>
        </div>
        <button
          type="button"
          class="p-1 rounded transition-colors"
          style="color: rgba(255, 255, 255, 0.4)"
          @click="revealed = null"
        >
          <X :size="14" :stroke-width="2" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <code
          class="flex-1 px-3 py-2 rounded text-xs font-mono break-all"
          style="background: rgba(0, 0, 0, 0.3); color: rgba(255, 255, 255, 0.9)"
          >{{ revealed.key }}</code
        >
        <button
          type="button"
          class="flex items-center gap-1 px-3 py-2 rounded text-xs font-medium transition-colors"
          style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.9)"
          @click="copyKey"
        >
          <Copy :size="12" :stroke-width="2" />
          {{ copied ? t('common.copied') : t('common.copy') }}
        </button>
      </div>
    </div>

    <div
      v-if="showForm"
      class="rounded-lg p-4 space-y-3"
      style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08)"
    >
      <div class="space-y-2">
        <label class="block text-xs font-medium" style="color: rgba(255, 255, 255, 0.6)">
          {{ t('settings.user.developer.form.name') }}
        </label>
        <input
          v-model="nameDraft"
          type="text"
          maxlength="64"
          class="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style="
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.95);
          "
          :placeholder="t('settings.user.developer.form.namePlaceholder')"
        />
      </div>

      <div class="space-y-2">
        <label class="block text-xs font-medium" style="color: rgba(255, 255, 255, 0.6)">
          {{ t('settings.user.developer.form.description') }}
        </label>
        <input
          v-model="descDraft"
          type="text"
          maxlength="280"
          class="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style="
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.95);
          "
          :placeholder="t('settings.user.developer.form.descriptionPlaceholder')"
        />
      </div>

      <div v-if="createError" class="text-xs" style="color: rgba(248, 113, 113, 0.9)">
        {{ createError }}
      </div>

      <div class="flex items-center gap-2 pt-1">
        <button
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          style="background: rgba(99, 102, 241, 0.9); color: white"
          :disabled="!canCreate"
          @click="submit"
        >
          {{ creating ? t('common.creating') : t('settings.user.developer.form.submit') }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium"
          style="color: rgba(255, 255, 255, 0.55)"
          @click="
            showForm = false;
            nameDraft = '';
            descDraft = '';
            createError = null;
          "
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div
        class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
      />
    </div>

    <div v-else-if="loadError" class="text-sm" style="color: rgba(248, 113, 113, 0.9)">
      {{ loadError }}
    </div>

    <ul v-else-if="plugins.length" class="flex flex-col gap-2">
      <li
        v-for="plugin in plugins"
        :key="plugin.id"
        class="rounded-lg p-3 flex items-start gap-3"
        style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06)"
      >
        <component
          :is="plugin.connected ? CircleCheck : Circle"
          :size="14"
          :stroke-width="2"
          class="mt-0.5 shrink-0"
          :style="{
            color: plugin.connected ? 'rgb(74, 222, 128)' : 'rgba(255, 255, 255, 0.25)',
          }"
        />
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
              {{ plugin.name }}
            </span>
            <span class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
              {{ plugin.slug }}
            </span>
          </div>
          <p v-if="plugin.description" class="text-xs" style="color: rgba(255, 255, 255, 0.5)">
            {{ plugin.description }}
          </p>
          <div class="flex items-center gap-3 text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
            <span>{{ plugin.apiKeyPrefix }}…</span>
            <span>·</span>
            <span>
              {{
                plugin.connected
                  ? t('settings.user.developer.status.connected')
                  : t('settings.user.developer.status.lastConnected', {
                      date: formatDate(plugin.lastConnectedAt),
                    })
              }}
            </span>
          </div>
        </div>
      </li>
    </ul>

    <div v-else class="text-center py-8 text-xs" style="color: rgba(255, 255, 255, 0.4)">
      {{ t('settings.user.developer.empty') }}
    </div>
  </section>
</template>
