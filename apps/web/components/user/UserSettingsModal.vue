<script setup lang="ts">
import { UserCircle, PersonStanding, Mic, Palette, RotateCcw } from 'lucide-vue-next';
import type { Component } from 'vue';
import {
  CG_LAYER_ORDER,
  CG_VARIANTS,
  CG_LAYER_OPTIONAL,
  useCharacter,
  type CgLayer,
} from '~/composables/useCharacter';

const emit = defineEmits<{ close: [] }>();
const { user, refreshUser } = useAuth();
const { authBase } = useRuntimeConfig().public;
const character = useCharacter();

const LAYER_LABELS: Record<CgLayer, string> = {
  body: 'Corps',
  eyes: 'Yeux',
  outfit: 'Tenue',
  hair: 'Cheveux',
  accessory: 'Accessoire',
};

function variantLabel(layer: CgLayer, variant: string): string {
  const stripped = variant.replace(/^[a-z]+_/, '').replace(/^acc_/, '');
  return `${LAYER_LABELS[layer]} ${stripped}`;
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

const tabs: { id: TabId; label: string; icon: Component }[] = [
  { id: 'profile', label: 'Profil', icon: UserCircle },
  { id: 'character', label: 'Personnage', icon: PersonStanding },
  { id: 'audio', label: 'Audio & vidéo', icon: Mic },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

const activeTab = ref<TabId>('profile');

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
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Impossible de sauvegarder.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UiFloatingWindow
    :title="`Paramètres du compte${user?.name ? ` — ${user.name}` : ''}`"
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
          <span class="truncate">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="flex-1 overflow-y-auto p-6">
        <section v-if="activeTab === 'profile'" class="space-y-6 max-w-md">
          <header>
            <h3 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">Profil</h3>
            <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
              Ce que les autres voient dans tes Nooks.
            </p>
          </header>

          <div class="space-y-2">
            <label
              class="block text-xs font-medium"
              style="color: rgba(255, 255, 255, 0.6)"
              for="user-name"
            >
              Pseudo
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
            <p class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">2 à 32 caractères.</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-medium" style="color: rgba(255, 255, 255, 0.6)">
              Email
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
              {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
            </button>
            <span v-if="saved" class="text-xs" style="color: #22c55e">Enregistré.</span>
            <span v-if="error" class="text-xs" style="color: #ef4444">{{ error }}</span>
          </div>
        </section>

        <section v-else-if="activeTab === 'character'" class="flex gap-6 h-full min-h-0">
          <div class="flex-1 min-w-0 space-y-5 overflow-y-auto pr-2 -mr-2">
            <header class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
                  Personnage
                </h3>
                <p class="text-xs mt-0.5" style="color: rgba(255, 255, 255, 0.45)">
                  Corps, yeux, tenue, cheveux, accessoire.
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
                Réinitialiser
              </button>
            </header>

            <div v-for="layer in CG_LAYER_ORDER" :key="layer" class="space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-xs font-semibold" style="color: rgba(255, 255, 255, 0.7)">
                  {{ LAYER_LABELS[layer] }}
                </span>
                <span class="text-[11px]" style="color: rgba(255, 255, 255, 0.35)">
                  {{
                    character.appearance.value[layer]
                      ?.replace(/^[a-z]+_/, '')
                      .replace(/^acc_/, '') ?? 'Aucun'
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
                  :title="`${LAYER_LABELS[layer]} — aucun`"
                  @click="character.setLayer(layer, null)"
                >
                  Aucun
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
                Aperçu
              </p>
              <p class="text-[10px] mt-0.5" style="color: rgba(255, 255, 255, 0.4)">
                Live dans le monde.
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
          <p class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.7)">Audio & vidéo</p>
          <p class="text-xs mt-1 max-w-xs" style="color: rgba(255, 255, 255, 0.4)">
            Bientôt — sélection du micro, du haut-parleur, de la caméra et test de niveau.
          </p>
        </section>

        <section
          v-else-if="activeTab === 'appearance'"
          class="h-full flex flex-col items-center justify-center text-center"
        >
          <Palette
            class="h-10 w-10 mb-3"
            :stroke-width="1.5"
            style="color: rgba(255, 255, 255, 0.25)"
          />
          <p class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.7)">Apparence</p>
          <p class="text-xs mt-1 max-w-xs" style="color: rgba(255, 255, 255, 0.4)">
            Bientôt — thème, densité de l'interface et taille du chat.
          </p>
        </section>
      </div>
    </div>
  </UiFloatingWindow>
</template>
