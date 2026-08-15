<script setup lang="ts">
import {
  UserCircle,
  PersonStanding,
  Mic,
  Palette,
  RotateCcw,
  Languages,
  LogOut,
} from 'lucide-vue-next';
import type { Component } from 'vue';
import {
  CG_LAYER_ORDER,
  CG_VARIANTS,
  CG_LAYER_OPTIONAL,
  useCharacter,
  type CgLayer,
} from '~/composables/useCharacter';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';
import { useAuthStore } from '~/stores/auth';
import { THEME_LIST } from '~/themes';
import type { OwnedServerSummary } from '@nookapp/protocol';

const emit = defineEmits<{ close: [] }>();
const { user, refreshUser, signOut } = useAuth();

async function onSignOut() {
  emit('close');
  await signOut();
}
const authStore = useAuthStore();
const api = useApi();
const { authBase } = useRuntimeConfig().public;
const character = useCharacter();
const interfacePrefs = useInterfacePreferences();
const { locale, setLocale, t } = useI18n();

function layerLabel(layer: CgLayer): string {
  return t(`settings.user.character.layers.${layer}`);
}

function variantLabel(layer: CgLayer, variant: string): string {
  const stripped = variant.replace(/^[a-z]+_/, '').replace(/^acc_/, '');
  return `${layerLabel(layer)} ${stripped}`;
}

function previewForLayer(layer: CgLayer, variant: string) {
  // Each layer thumbnail shows the body baseline + this layer on top, except
  // the body row itself which shows just the body variant.
  if (layer === 'body') {
    return {
      body: variant,
      eyes: 'eyes_01',
      outfit: 'outfit_01',
      hair: 'hair_01',
      accessory: null,
    };
  }
  return {
    ...character.appearance.value,
    [layer]: variant,
  };
}

type TabId = 'profile' | 'character' | 'audio' | 'appearance';

const tabs: { id: TabId; labelKey: string; icon: Component }[] = [
  { id: 'profile', labelKey: 'settings.user.tabs.profile', icon: UserCircle },
  { id: 'character', labelKey: 'settings.user.tabs.character', icon: PersonStanding },
  { id: 'audio', labelKey: 'settings.user.tabs.audio', icon: Mic },
  { id: 'appearance', labelKey: 'settings.user.tabs.appearance', icon: Palette },
];

const activeTab = ref<TabId>('profile');

const languageOptions = [{ code: 'fr' }, { code: 'en' }] as const;

const nameDraft = ref(user.value?.name ?? '');
watch(
  () => user.value?.name,
  (n) => {
    if (n && nameDraft.value === '') nameDraft.value = n;
  },
);

const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);

const dirty = computed(() => nameDraft.value.trim() !== (user.value?.name ?? '').trim());
const canSave = computed(() => dirty.value && nameDraft.value.trim().length >= 2 && !saving.value);

async function saveProfile() {
  if (!canSave.value) return;
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    await $fetch(`${authBase}/update-user`, {
      method: 'POST',
      body: { name: nameDraft.value.trim() },
      credentials: 'include',
    });
    await refreshUser();
    saved.value = true;
    setTimeout(() => (saved.value = false), 1800);
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message ?? t('settings.user.profile.saveError');
  } finally {
    saving.value = false;
  }
}

const emailDraft = ref(user.value?.email ?? '');
watch(
  () => user.value?.email,
  (e) => {
    if (e && !emailDraft.value) emailDraft.value = e;
  },
);
const changingEmail = ref(false);
const emailMessage = ref<string | null>(null);
const emailDirty = computed(
  () =>
    emailDraft.value.trim() !== (user.value?.email ?? '').trim() && emailDraft.value.includes('@'),
);

async function changeEmail() {
  if (!emailDirty.value || changingEmail.value) return;
  changingEmail.value = true;
  emailMessage.value = null;
  try {
    await $fetch(`${authBase}/change-email`, {
      method: 'POST',
      body: { newEmail: emailDraft.value.trim(), callbackURL: '/app' },
      credentials: 'include',
    });
    emailMessage.value = t('settings.user.profile.emailChangeSent');
  } catch (e: unknown) {
    emailMessage.value =
      (e as { data?: { message?: string } })?.data?.message ?? t('settings.user.profile.saveError');
  } finally {
    changingEmail.value = false;
  }
}

const exporting = ref(false);
async function exportData() {
  exporting.value = true;
  try {
    const data = await api.get('/users/me/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nookapp-data.json';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}

const confirmingDelete = ref(false);
const confirmName = ref('');
const deleting = ref(false);
const deleteError = ref<string | null>(null);
const ownedServers = ref<OwnedServerSummary[] | null>(null);
const choices = ref<Record<string, string>>({});

const canDelete = computed(
  () =>
    ownedServers.value !== null &&
    confirmName.value.trim() === (user.value?.name ?? '').trim() &&
    !deleting.value,
);

async function startDelete() {
  confirmingDelete.value = true;
  deleteError.value = null;
  try {
    const owned = await api.get<OwnedServerSummary[]>('/users/me/owned-servers');
    ownedServers.value = owned;
    choices.value = Object.fromEntries(owned.map((s) => [s.id, s.members[0]?.userId ?? '']));
  } catch {
    deleteError.value = t('settings.user.danger.error');
  }
}

function cancelDelete() {
  confirmingDelete.value = false;
  confirmName.value = '';
  ownedServers.value = null;
}

async function deleteAccount() {
  if (!canDelete.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    const transfers: Record<string, string | null> = {};
    for (const [serverId, target] of Object.entries(choices.value)) {
      transfers[serverId] = target || null;
    }
    await api.del('/users/me', { body: { transfers } });
    authStore.setUser(null);
    await navigateTo('/');
  } catch (e: unknown) {
    deleteError.value =
      (e as { data?: { message?: string } })?.data?.message ?? t('settings.user.danger.error');
    deleting.value = false;
  }
}
</script>

<template>
  <UiFloatingWindow
    :title="
      user?.name ? t('settings.user.titleWithName', { name: user.name }) : t('settings.user.title')
    "
    :initial-width="720"
    :initial-height="520"
    :min-width="520"
    :min-height="360"
    @close="emit('close')"
  >
    <div class="flex h-full min-h-0">
      <nav
        class="w-52 shrink-0 flex flex-col gap-0.5 p-3 overflow-y-auto"
        style="border-right: 1px solid var(--surface-tinted)"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors"
          :style="{
            background: activeTab === tab.id ? 'var(--surface-tinted)' : 'transparent',
            color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-muted)',
          }"
          @click="activeTab = tab.id"
          @mouseenter="
            activeTab !== tab.id &&
            (($event.currentTarget as HTMLElement).style.background = 'var(--surface-tinted)')
          "
          @mouseleave="
            activeTab !== tab.id &&
            (($event.currentTarget as HTMLElement).style.background = 'transparent')
          "
        >
          <component :is="tab.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" />
          <span class="truncate">{{ t(tab.labelKey) }}</span>
        </button>

        <button
          class="mt-auto flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors"
          style="color: var(--danger, #ef4444)"
          @click="onSignOut"
          @mouseenter="
            ($event.currentTarget as HTMLElement).style.background = 'var(--surface-tinted)'
          "
          @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        >
          <LogOut class="h-4 w-4 shrink-0" :stroke-width="1.75" />
          <span class="truncate">{{ t('nooks.signOut') }}</span>
        </button>
      </nav>

      <div class="flex-1 overflow-y-auto p-6">
        <section v-if="activeTab === 'profile'" class="space-y-6 max-w-md">
          <header>
            <h3 class="text-sm font-semibold" style="color: var(--ink)">
              {{ t('settings.user.profile.heading') }}
            </h3>
            <p class="text-xs mt-0.5" style="color: var(--ink-muted)">
              {{ t('settings.user.profile.description') }}
            </p>
          </header>

          <div class="space-y-2">
            <label class="block text-xs font-medium" style="color: var(--ink-soft)" for="user-name">
              {{ t('settings.user.profile.displayName') }}
            </label>
            <input
              id="user-name"
              v-model="nameDraft"
              type="text"
              maxlength="32"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style="
                background: var(--surface-tinted);
                border: 1px solid var(--surface-border);
                color: var(--ink);
              "
              @focus="
                ($event.target as HTMLInputElement).style.borderColor = 'rgba(255, 255, 255, 0.18)'
              "
              @blur="
                ($event.target as HTMLInputElement).style.borderColor = 'var(--surface-border)'
              "
            />
            <p class="text-[11px]" style="color: var(--ink-faint)">
              {{ t('settings.user.profile.displayNameHint') }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              class="block text-xs font-medium"
              style="color: var(--ink-soft)"
              for="user-email"
            >
              {{ t('common.email') }}
            </label>
            <div class="flex items-center gap-2">
              <input
                id="user-email"
                v-model="emailDraft"
                type="email"
                class="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style="
                  background: var(--surface-tinted);
                  border: 1px solid var(--surface-border);
                  color: var(--ink);
                "
              />
              <button
                class="px-3 py-2 rounded-lg text-sm font-medium transition-opacity shrink-0"
                :disabled="!emailDirty || changingEmail"
                :style="{
                  background: emailDirty ? '#5865f2' : 'var(--surface-tinted)',
                  color: emailDirty ? '#fff' : 'var(--ink-faint)',
                  cursor: emailDirty && !changingEmail ? 'pointer' : 'not-allowed',
                }"
                @click="changeEmail"
              >
                {{ changingEmail ? t('common.saving') : t('settings.user.profile.changeEmail') }}
              </button>
            </div>
            <p v-if="emailMessage" class="text-[11px]" style="color: var(--ink-muted)">
              {{ emailMessage }}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <Languages class="h-4 w-4" :stroke-width="1.75" style="color: var(--ink-muted)" />
              <label class="block text-xs font-medium" style="color: var(--ink-soft)">
                {{ t('settings.user.profile.language') }}
              </label>
            </div>
            <div
              class="inline-flex rounded-lg p-1"
              style="background: var(--surface-tinted); border: 1px solid var(--surface-border)"
            >
              <button
                v-for="option in languageOptions"
                :key="option.code"
                type="button"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                :style="{
                  background: locale === option.code ? 'rgba(88, 101, 242, 0.25)' : 'transparent',
                  color: locale === option.code ? 'var(--ink)' : 'var(--ink-muted)',
                }"
                :aria-pressed="locale === option.code"
                @click="setLocale(option.code)"
              >
                {{ t(`locale.${option.code}`) }}
              </button>
            </div>
            <p class="text-[11px]" style="color: var(--ink-faint)">
              {{ t('settings.user.profile.languageHint') }}
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              :disabled="!canSave"
              :style="{
                background: canSave ? '#5865f2' : 'var(--surface-tinted)',
                color: canSave ? '#fff' : 'var(--ink-faint)',
                cursor: canSave ? 'pointer' : 'not-allowed',
              }"
              @click="saveProfile"
            >
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
            <span v-if="saved" class="text-xs" style="color: #22c55e">{{ t('common.saved') }}</span>
            <span v-if="error" class="text-xs" style="color: #ef4444">{{ error }}</span>
          </div>

          <div class="rounded-xl p-4 mt-8" style="border: 1px solid var(--surface-border)">
            <h4 class="text-sm font-semibold" style="color: var(--ink)">
              {{ t('settings.user.data.heading') }}
            </h4>
            <p class="text-xs mt-1" style="color: var(--ink-muted)">
              {{ t('settings.user.data.description') }}
            </p>
            <button
              class="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              :disabled="exporting"
              style="
                background: var(--surface-tinted);
                border: 1px solid var(--surface-border);
                color: var(--ink);
              "
              @click="exportData"
            >
              {{ exporting ? t('common.saving') : t('settings.user.data.export') }}
            </button>
          </div>

          <div class="rounded-xl p-4 mt-4" style="border: 1px solid rgba(239, 68, 68, 0.3)">
            <h4 class="text-sm font-semibold" style="color: #ef4444">
              {{ t('settings.user.danger.heading') }}
            </h4>
            <p class="text-xs mt-1" style="color: var(--ink-muted)">
              {{ t('settings.user.danger.description') }}
            </p>

            <button
              v-if="!confirmingDelete"
              class="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              style="background: rgba(239, 68, 68, 0.12); color: #ef4444"
              @click="startDelete"
            >
              {{ t('settings.user.danger.deleteButton') }}
            </button>

            <div v-else class="mt-3 space-y-3">
              <p class="text-xs" style="color: var(--ink-soft)">
                {{ t('settings.user.danger.warning') }}
              </p>

              <div v-if="ownedServers === null" class="text-xs" style="color: var(--ink-muted)">
                {{ t('common.saving') }}
              </div>

              <div v-else-if="ownedServers.length" class="space-y-2">
                <p class="text-xs font-medium" style="color: var(--ink-soft)">
                  {{ t('settings.user.danger.nooksHeading') }}
                </p>
                <div
                  v-for="srv in ownedServers"
                  :key="srv.id"
                  class="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style="background: var(--surface-tinted)"
                >
                  <span class="text-sm truncate" style="color: var(--ink)">{{ srv.name }}</span>
                  <select
                    v-if="srv.members.length"
                    v-model="choices[srv.id]"
                    class="text-xs rounded-md px-2 py-1 outline-none shrink-0"
                    style="
                      background: var(--surface-tinted-strong);
                      border: 1px solid var(--surface-border);
                      color: var(--ink);
                    "
                  >
                    <option v-for="m in srv.members" :key="m.userId" :value="m.userId">
                      {{ t('settings.user.danger.transferTo', { name: m.name }) }}
                    </option>
                    <option value="">{{ t('settings.user.danger.deleteNook') }}</option>
                  </select>
                  <span v-else class="text-xs shrink-0" style="color: var(--ink-faint)">
                    {{ t('settings.user.danger.willBeDeleted') }}
                  </span>
                </div>
              </div>

              <label class="block text-xs font-medium" style="color: var(--ink-soft)">
                {{ t('settings.user.danger.confirmLabel', { name: user?.name ?? '' }) }}
              </label>
              <input
                v-model="confirmName"
                type="text"
                class="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style="
                  background: var(--surface-tinted);
                  border: 1px solid var(--surface-border);
                  color: var(--ink);
                "
              />
              <div class="flex items-center gap-3">
                <button
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                  :disabled="!canDelete"
                  :style="{
                    background: canDelete ? '#ef4444' : 'var(--surface-tinted)',
                    color: canDelete ? '#fff' : 'var(--ink-faint)',
                    cursor: canDelete ? 'pointer' : 'not-allowed',
                  }"
                  @click="deleteAccount"
                >
                  {{ deleting ? t('common.saving') : t('settings.user.danger.confirmButton') }}
                </button>
                <button
                  class="px-4 py-2 rounded-lg text-sm transition-colors"
                  style="color: var(--ink-muted)"
                  @click="cancelDelete"
                >
                  {{ t('common.cancel') }}
                </button>
                <span v-if="deleteError" class="text-xs" style="color: #ef4444">{{
                  deleteError
                }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'character'" class="flex gap-6 h-full min-h-0">
          <div class="flex-1 min-w-0 space-y-5 overflow-y-auto pr-2 -mr-2">
            <header class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-semibold" style="color: var(--ink)">
                  {{ t('settings.user.character.heading') }}
                </h3>
                <p class="text-xs mt-0.5" style="color: var(--ink-muted)">
                  {{ t('settings.user.character.description') }}
                </p>
              </div>
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0"
                style="
                  background: var(--surface-tinted);
                  border: 1px solid var(--surface-border);
                  color: var(--ink-soft);
                "
                @click="character.reset()"
              >
                <RotateCcw class="h-3 w-3" :stroke-width="2" />
                {{ t('settings.user.character.reset') }}
              </button>
            </header>

            <div v-for="layer in CG_LAYER_ORDER" :key="layer" class="space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs font-semibold" style="color: var(--ink-soft)">
                  {{ layerLabel(layer) }}
                </span>
                <span class="text-[11px]" style="color: var(--ink-faint)">
                  {{
                    character.appearance.value[layer]
                      ?.replace(/^[a-z]+_/, '')
                      .replace(/^acc_/, '') ?? t('settings.user.character.none')
                  }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="CG_LAYER_OPTIONAL[layer]"
                  class="flex items-center justify-center w-14 h-20 rounded-lg text-[10px] transition-all"
                  :style="{
                    background:
                      character.appearance.value[layer] === null
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'var(--surface-tinted)',
                    border:
                      character.appearance.value[layer] === null
                        ? '1px solid rgba(99, 102, 241, 0.6)'
                        : '1px solid var(--surface-tinted)',
                    color: 'var(--ink-muted)',
                  }"
                  :title="`${layerLabel(layer)} — ${t('settings.user.character.none')}`"
                  @click="character.setLayer(layer, null)"
                >
                  {{ t('settings.user.character.none') }}
                </button>
                <button
                  v-for="variant in CG_VARIANTS[layer]"
                  :key="variant"
                  class="flex items-center justify-center w-14 h-20 rounded-lg overflow-hidden transition-all"
                  :style="{
                    background:
                      character.appearance.value[layer] === variant
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'var(--surface-tinted)',
                    border:
                      character.appearance.value[layer] === variant
                        ? '1px solid rgba(99, 102, 241, 0.6)'
                        : '1px solid var(--surface-tinted)',
                  }"
                  :title="variantLabel(layer, variant)"
                  @click="character.setLayer(layer, variant)"
                >
                  <UserCharacterPreview :appearance="previewForLayer(layer, variant)" :scale="2" />
                </button>
              </div>
            </div>
          </div>

          <aside
            class="w-44 shrink-0 flex flex-col items-center justify-center gap-3 self-stretch rounded-xl"
            style="background: var(--surface-tinted); border: 1px solid var(--surface-tinted)"
          >
            <UserCharacterPreview :appearance="character.appearance.value" :scale="6" />
            <div class="text-center px-3">
              <p class="text-[11px] font-semibold" style="color: var(--ink-soft)">
                {{ t('settings.user.character.preview') }}
              </p>
              <p class="text-[10px] mt-0.5" style="color: var(--ink-muted)">
                {{ t('settings.user.character.previewHint') }}
              </p>
            </div>
          </aside>
        </section>

        <section
          v-else-if="activeTab === 'audio'"
          class="h-full flex flex-col items-center justify-center text-center"
        >
          <Mic class="h-10 w-10 mb-3" :stroke-width="1.5" style="color: var(--ink-faint)" />
          <p class="text-sm font-semibold" style="color: var(--ink-soft)">
            {{ t('settings.user.audio.heading') }}
          </p>
          <p class="text-xs mt-1 max-w-xs" style="color: var(--ink-muted)">
            {{ t('settings.user.audio.description') }}
          </p>
        </section>

        <section v-else-if="activeTab === 'appearance'" class="space-y-6">
          <header>
            <h3 class="text-base font-semibold" :style="{ color: 'var(--ink)' }">
              {{ t('settings.user.appearance.heading') }}
            </h3>
            <p class="text-xs mt-0.5" :style="{ color: 'var(--ink-muted)' }">
              {{ t('settings.user.appearance.description') }}
            </p>
          </header>

          <div
            class="rounded-xl p-4 flex items-start gap-4"
            :style="{
              background: 'var(--surface-tinted)',
              border: '1px solid var(--surface-border)',
            }"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <Palette
                  class="h-4 w-4"
                  :stroke-width="1.75"
                  :style="{ color: 'var(--ink-muted)' }"
                />
                <span class="text-sm font-medium" :style="{ color: 'var(--ink)' }">
                  {{ t('settings.user.appearance.theme.title') }}
                </span>
              </div>
              <p class="text-[11px] mt-2 leading-relaxed" :style="{ color: 'var(--ink-muted)' }">
                {{ t('settings.user.appearance.theme.hint') }}
              </p>
            </div>
            <div
              class="inline-flex flex-wrap rounded-lg p-1 shrink-0 gap-1"
              :style="{
                background: 'var(--surface-tinted)',
                border: '1px solid var(--surface-border)',
              }"
            >
              <button
                v-for="theme in THEME_LIST"
                :key="theme.id"
                type="button"
                class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                :style="{
                  background:
                    interfacePrefs.prefs.value.theme === theme.id ? 'var(--ink)' : 'transparent',
                  color:
                    interfacePrefs.prefs.value.theme === theme.id
                      ? 'var(--ink-inverse)'
                      : 'var(--ink-muted)',
                }"
                :aria-pressed="interfacePrefs.prefs.value.theme === theme.id"
                :title="theme.description"
                @click="interfacePrefs.setTheme(theme.id)"
              >
                {{ theme.label }}
              </button>
            </div>
          </div>

          <div
            class="rounded-xl p-4 flex items-start gap-4"
            :style="{
              background: 'var(--surface-tinted)',
              border: '1px solid var(--surface-border)',
            }"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <Palette
                  class="h-4 w-4"
                  :stroke-width="1.75"
                  :style="{ color: 'var(--ink-muted)' }"
                />
                <label
                  for="classic-interface-toggle"
                  class="text-sm font-medium cursor-pointer"
                  :style="{ color: 'var(--ink)' }"
                >
                  {{ t('settings.user.appearance.classicLayout.title') }}
                </label>
              </div>
              <p class="text-[11px] mt-2 leading-relaxed" :style="{ color: 'var(--ink-muted)' }">
                {{ t('settings.user.appearance.classicLayout.hint') }}
              </p>
            </div>
            <button
              id="classic-interface-toggle"
              type="button"
              role="switch"
              :aria-checked="interfacePrefs.prefs.value.useClassicInterface"
              class="relative shrink-0 h-6 w-11 rounded-full transition-colors"
              :style="{
                background: interfacePrefs.prefs.value.useClassicInterface
                  ? '#5865f2'
                  : 'var(--surface-tinted-strong)',
              }"
              @click="
                interfacePrefs.setClassicInterface(!interfacePrefs.prefs.value.useClassicInterface)
              "
            >
              <span
                class="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :style="{
                  transform: interfacePrefs.prefs.value.useClassicInterface
                    ? 'translateX(22px)'
                    : 'translateX(2px)',
                }"
              />
            </button>
          </div>

          <div
            class="rounded-xl p-4 flex items-start gap-4"
            :style="{
              background: 'var(--surface-tinted)',
              border: '1px solid var(--surface-border)',
            }"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <Palette
                  class="h-4 w-4"
                  :stroke-width="1.75"
                  :style="{ color: 'var(--ink-muted)' }"
                />
                <label
                  for="swap-sidebars-toggle"
                  class="text-sm font-medium cursor-pointer"
                  :style="{ color: 'var(--ink)' }"
                >
                  {{ t('settings.user.appearance.swapSidebars.title') }}
                </label>
              </div>
              <p class="text-[11px] mt-2 leading-relaxed" :style="{ color: 'var(--ink-muted)' }">
                {{ t('settings.user.appearance.swapSidebars.hint') }}
              </p>
            </div>
            <button
              id="swap-sidebars-toggle"
              type="button"
              role="switch"
              :aria-checked="interfacePrefs.prefs.value.swapSidebars"
              class="relative shrink-0 h-6 w-11 rounded-full transition-colors"
              :style="{
                background: interfacePrefs.prefs.value.swapSidebars
                  ? '#5865f2'
                  : 'var(--surface-tinted-strong)',
              }"
              @click="interfacePrefs.setSwapSidebars(!interfacePrefs.prefs.value.swapSidebars)"
            >
              <span
                class="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :style="{
                  transform: interfacePrefs.prefs.value.swapSidebars
                    ? 'translateX(22px)'
                    : 'translateX(2px)',
                }"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  </UiFloatingWindow>
</template>
