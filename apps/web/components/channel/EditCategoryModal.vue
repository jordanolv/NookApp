<script setup lang="ts">
import type { CategoryPublic } from '@nookapp/protocol';

const props = defineProps<{ serverId: string; category: CategoryPublic }>();
const emit = defineEmits<{ close: []; updated: [] }>();

const { updateCategory, deleteCategory, setCategoryIcon, setCategoryBanner } = useCategories();

const { resolveUrl } = useResolveUrl();

const name = ref(props.category.name);
const colorEnabled = ref(props.category.color !== null);
const colorValue = ref(props.category.color ?? '#818cf8');

const iconFile = ref<File | null>(null);
const iconPreview = ref<string | null>(null);
const iconExisting = ref<string | null>(resolveUrl(props.category.iconUrl));
const iconCleared = ref(false);
const iconInputRef = ref<HTMLInputElement | null>(null);

const bannerFile = ref<File | null>(null);
const bannerPreview = ref<string | null>(null);
const bannerExisting = ref<string | null>(resolveUrl(props.category.bannerUrl));
const bannerCleared = ref(false);
const bannerInputRef = ref<HTMLInputElement | null>(null);

const loading = ref(false);
const error = ref('');

const iconDisplaySrc = computed(() => {
  if (iconPreview.value) return iconPreview.value;
  if (!iconCleared.value) return iconExisting.value;
  return null;
});

const bannerDisplaySrc = computed(() => {
  if (bannerPreview.value) return bannerPreview.value;
  if (!bannerCleared.value) return bannerExisting.value;
  return null;
});

function onIconChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  iconFile.value = file;
  iconPreview.value = URL.createObjectURL(file);
  iconCleared.value = false;
}

function clearIcon() {
  iconFile.value = null;
  iconPreview.value = null;
  iconCleared.value = true;
  if (iconInputRef.value) iconInputRef.value.value = '';
}

function onBannerChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  bannerFile.value = file;
  bannerPreview.value = URL.createObjectURL(file);
  bannerCleared.value = false;
}

function clearBanner() {
  bannerFile.value = null;
  bannerPreview.value = null;
  bannerCleared.value = true;
  if (bannerInputRef.value) bannerInputRef.value.value = '';
}

async function save() {
  if (!name.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    await updateCategory(props.serverId, props.category.id, {
      name: name.value.trim(),
      color: colorEnabled.value ? colorValue.value : null,
    });
    if (iconFile.value) {
      await setCategoryIcon(props.serverId, props.category.id, iconFile.value);
    }
    if (bannerFile.value) {
      await setCategoryBanner(props.serverId, props.category.id, bannerFile.value);
    }
    emit('updated');
    emit('close');
  } catch {
    error.value = 'Une erreur est survenue.';
  } finally {
    loading.value = false;
  }
}

async function remove() {
  if (!confirm(`Supprimer la catégorie « ${props.category.name} » ?`)) return;
  loading.value = true;
  try {
    await deleteCategory(props.serverId, props.category.id);
    emit('updated');
    emit('close');
  } catch {
    error.value = 'Une erreur est survenue.';
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
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la catégorie"
        class="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style="
          background: var(--surface-strong);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid var(--surface-border);
          box-shadow:
            0 24px 64px rgba(20, 35, 25, 0.55),
            inset 0 1px 0 var(--surface-tinted);
        "
      >
        <div
          class="flex items-center justify-between px-4 py-3"
          style="border-bottom: 1px solid var(--surface-tinted)"
        >
          <span class="text-xs font-semibold" style="color: var(--ink-soft)">
            Modifier la catégorie
          </span>
          <button
            class="flex h-5 w-5 items-center justify-center rounded transition-opacity hover:opacity-60"
            title="Fermer"
            @click="emit('close')"
          >
            <span class="block h-0.5 w-3 rounded-full" style="background: #ffffff" />
          </button>
        </div>

        <div class="p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: var(--ink-faint)">Nom</label>
            <input
              v-model="name"
              type="text"
              class="rounded-xl px-3 py-2 text-xs outline-none"
              style="
                background: var(--surface-tinted);
                border: 1px solid var(--surface-border);
                color: var(--ink-soft);
              "
              maxlength="100"
              @keydown.enter="save"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2 px-0.5">
              <input
                id="colorEnabled"
                v-model="colorEnabled"
                type="checkbox"
                class="accent-indigo-400"
              />
              <label for="colorEnabled" class="text-xs font-medium" style="color: var(--ink-muted)"
                >Activer une couleur</label
              >
            </div>
            <div v-if="colorEnabled" class="flex items-center gap-3">
              <input
                v-model="colorValue"
                type="color"
                class="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <span class="text-xs font-mono" style="color: var(--ink-muted)">{{
                colorValue
              }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: var(--ink-faint)">
              Icône
              <span class="ml-1" style="color: var(--ink-faint)">optionnel</span>
            </label>
            <div
              class="relative rounded-xl overflow-hidden cursor-pointer"
              style="border: 1px dashed var(--surface-tinted)"
              @click="iconInputRef?.click()"
            >
              <img
                v-if="iconDisplaySrc"
                :src="iconDisplaySrc"
                class="w-full object-cover"
                style="height: 72px"
              />
              <div
                v-else
                class="flex items-center justify-center gap-2"
                style="height: 52px; background: var(--surface-tinted)"
              >
                <span class="text-xs" style="color: var(--ink-faint)">Choisir une image</span>
              </div>
              <button
                v-if="iconDisplaySrc"
                class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style="background: rgba(20, 35, 25, 0.55); color: var(--ink-soft)"
                @click.stop="clearIcon"
              >
                ×
              </button>
              <input
                ref="iconInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onIconChange"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: var(--ink-faint)">
              Bannière
              <span class="ml-1" style="color: var(--ink-faint)">optionnel</span>
            </label>
            <div
              class="relative rounded-xl overflow-hidden cursor-pointer"
              style="border: 1px dashed var(--surface-tinted)"
              @click="bannerInputRef?.click()"
            >
              <img
                v-if="bannerDisplaySrc"
                :src="bannerDisplaySrc"
                class="w-full object-cover"
                style="height: 72px"
              />
              <div
                v-else
                class="flex items-center justify-center gap-2"
                style="height: 52px; background: var(--surface-tinted)"
              >
                <span class="text-xs" style="color: var(--ink-faint)">Choisir une image</span>
              </div>
              <button
                v-if="bannerDisplaySrc"
                class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style="background: rgba(20, 35, 25, 0.55); color: var(--ink-soft)"
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

          <div class="flex gap-2">
            <button
              class="rounded-xl py-2 px-3 text-xs font-medium transition-opacity"
              style="background: rgba(248, 113, 113, 0.15); color: rgb(248, 113, 113)"
              :class="{ 'opacity-40 pointer-events-none': loading }"
              @click="remove"
            >
              Supprimer
            </button>
            <button
              class="flex-1 rounded-xl py-2 text-xs font-medium"
              style="background: var(--surface-tinted); color: var(--ink-muted)"
              @click="emit('close')"
            >
              Annuler
            </button>
            <button
              class="flex-1 rounded-xl py-2 text-xs font-semibold transition-opacity"
              style="background: rgba(99, 102, 241, 0.85); color: white"
              :class="{ 'opacity-40 pointer-events-none': loading || !name.trim() }"
              @click="save"
            >
              {{ loading ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
