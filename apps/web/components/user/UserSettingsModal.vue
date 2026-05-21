<script setup lang="ts">
import { UserCircle, PersonStanding, Mic, Palette, RotateCcw, Languages } from 'lucide-vue-next';
import type { Component } from 'vue';
import {
  CG_LAYER_ORDER,
  CG_VARIANTS,
  CG_LAYER_OPTIONAL,
  useCharacter,
  type CgLayer,
} from '~/composables/useCharacter';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';

const emit = defineEmits<{ close: [] }>();
const { user, refreshUser } = useAuth();
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
        style="border-right: 1px solid rgba(255, 255, 255, 0.06)"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors"
          :style="{
            background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            color: activeTab === tab.id ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.55)',
          }"
          @click="activeTab = tab.id"
          @mouseenter="
            activeTab !== tab.id &&
            (($event.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.03)')
          "
          @mouseleave="
            activeTab !== tab.id &&
            (($event.currentTarget as HTMLElement).style.background = 'transparent')
          "
        >
          <component :is="tab.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" />
          <span class="truncate">{{ t(tab.labelKey) }}</span>
        </button>
      </nav>

      <div class="flex-1 overflow-y-auto p-6">
        <section v-if="activeTab === 'profile'" class="space-y-6 max-w-md">
          <header>
            <h3 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
              {{ t('settings.user.profile.heading') }}
            </h3>
            <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
              {{ t('settings.user.profile.description') }}
            </p>
          </header>

          <div class="space-y-2">
            <label
              class="block text-xs font-medium"
              style="color: rgba(255, 255, 255, 0.6)"
              for="user-name"
            >
              {{ t('settings.user.profile.displayName') }}
            </label>
            <input
              id="user-name"
              v-model="nameDraft"
              type="text"
              maxlength="32"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style="
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.95);
              "
              @focus="
                ($event.target as HTMLInputElement).style.borderColor = 'rgba(255, 255, 255, 0.18)'
              "
              @blur="
                ($event.target as HTMLInputElement).style.borderColor = 'rgba(255, 255, 255, 0.08)'
              "
            />
            <p class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
              {{ t('settings.user.profile.displayNameHint') }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-medium" style="color: rgba(255, 255, 255, 0.6)">
              {{ t('common.email') }}
            </label>
            <div
              class="px-3 py-2 rounded-lg text-sm"
              style="
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.5);
              "
            >
              {{ user?.email ?? '—' }}
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <Languages
                class="h-4 w-4"
                :stroke-width="1.75"
                style="color: rgba(255, 255, 255, 0.45)"
              />
              <label class="block text-xs font-medium" style="color: rgba(255, 255, 255, 0.6)">
                {{ t('settings.user.profile.language') }}
              </label>
            </div>
            <div
              class="inline-flex rounded-lg p-1"
              style="
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.07);
              "
            >
              <button
                v-for="option in languageOptions"
                :key="option.code"
                type="button"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                :style="{
                  background: locale === option.code ? 'rgba(88, 101, 242, 0.25)' : 'transparent',
                  color:
                    locale === option.code
                      ? 'rgba(255, 255, 255, 0.95)'
                      : 'rgba(255, 255, 255, 0.45)',
                }"
                :aria-pressed="locale === option.code"
                @click="setLocale(option.code)"
              >
                {{ t(`locale.${option.code}`) }}
              </button>
            </div>
            <p class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
              {{ t('settings.user.profile.languageHint') }}
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              :disabled="!canSave"
              :style="{
                background: canSave ? '#5865f2' : 'rgba(255, 255, 255, 0.06)',
                color: canSave ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                cursor: canSave ? 'pointer' : 'not-allowed',
              }"
              @click="saveProfile"
            >
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
            <span v-if="saved" class="text-xs" style="color: #22c55e">{{ t('common.saved') }}</span>
            <span v-if="error" class="text-xs" style="color: #ef4444">{{ error }}</span>
          </div>
        </section>

        <section v-else-if="activeTab === 'character'" class="flex gap-6 h-full min-h-0">
          <div class="flex-1 min-w-0 space-y-5 overflow-y-auto pr-2 -mr-2">
            <header class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
                  {{ t('settings.user.character.heading') }}
                </h3>
                <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
                  {{ t('settings.user.character.description') }}
                </p>
              </div>
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0"
                style="
                  background: rgba(255, 255, 255, 0.04);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  color: rgba(255, 255, 255, 0.7);
                "
                @click="character.reset()"
              >
                <RotateCcw class="h-3 w-3" :stroke-width="2" />
                {{ t('settings.user.character.reset') }}
              </button>
            </header>

            <div v-for="layer in CG_LAYER_ORDER" :key="layer" class="space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs font-semibold" style="color: rgba(255, 255, 255, 0.7)">
                  {{ layerLabel(layer) }}
                </span>
                <span class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
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
                        : 'rgba(255, 255, 255, 0.03)',
                    border:
                      character.appearance.value[layer] === null
                        ? '1px solid rgba(99, 102, 241, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.55)',
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
                        : 'rgba(255, 255, 255, 0.03)',
                    border:
                      character.appearance.value[layer] === variant
                        ? '1px solid rgba(99, 102, 241, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
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
            style="
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.06);
            "
          >
            <UserCharacterPreview :appearance="character.appearance.value" :scale="6" />
            <div class="text-center px-3">
              <p class="text-[11px] font-semibold" style="color: rgba(255, 255, 255, 0.75)">
                {{ t('settings.user.character.preview') }}
              </p>
              <p class="text-[10px] mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                {{ t('settings.user.character.previewHint') }}
              </p>
            </div>
          </aside>
        </section>

        <section
          v-else-if="activeTab === 'audio'"
          class="h-full flex flex-col items-center justify-center text-center"
        >
          <Mic
            class="h-10 w-10 mb-3"
            :stroke-width="1.5"
            style="color: rgba(255, 255, 255, 0.25)"
          />
          <p class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.7)">
            {{ t('settings.user.audio.heading') }}
          </p>
          <p class="text-xs mt-1 max-w-xs" style="color: rgba(255, 255, 255, 0.4)">
            {{ t('settings.user.audio.description') }}
          </p>
        </section>

        <section v-else-if="activeTab === 'appearance'" class="space-y-6">
          <header>
            <h3 class="text-base font-semibold" style="color: rgba(255, 255, 255, 0.95)">
              {{ t('settings.user.appearance.heading') }}
            </h3>
            <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
              {{ t('settings.user.appearance.description') }}
            </p>
          </header>

          <div
            class="rounded-xl p-4 flex items-start gap-4"
            style="
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
            "
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <Palette
                  class="h-4 w-4"
                  :stroke-width="1.75"
                  style="color: rgba(255, 255, 255, 0.55)"
                />
                <label
                  for="classic-interface-toggle"
                  class="text-sm font-medium cursor-pointer"
                  style="color: rgba(255, 255, 255, 0.9)"
                >
                  {{ t('settings.user.appearance.classicLayout.title') }}
                </label>
              </div>
              <p class="text-[11px] mt-2 leading-relaxed" style="color: rgba(255, 255, 255, 0.45)">
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
                  : 'rgba(255, 255, 255, 0.12)',
              }"
              @click="
                interfacePrefs.setClassicInterface(!interfacePrefs.prefs.value.useClassicInterface)
              "
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :style="{
                  transform: interfacePrefs.prefs.value.useClassicInterface
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
