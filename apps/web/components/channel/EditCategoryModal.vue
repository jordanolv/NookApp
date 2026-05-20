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
            Modifier la catégorie
          </span>
        </div>

        <div class="p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)"
              >Nom</label
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
              <label
                for="colorEnabled"
                class="text-xs font-medium"
                style="color: rgba(255, 255, 255, 0.4)"
                >Activer une couleur</label
              >
            </div>
            <div v-if="colorEnabled" class="flex items-center gap-3">
              <input
                v-model="colorValue"
                type="color"
                class="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <span class="text-xs font-mono" style="color: rgba(255, 255, 255, 0.4)">{{
                colorValue
              }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              Icône
              <span class="ml-1" style="color: rgba(255, 255, 255, 0.15)">optionnel</span>
            </label>
            <div
              class="relative rounded-xl overflow-hidden cursor-pointer"
              style="border: 1px dashed rgba(255, 255, 255, 0.1)"
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
                style="height: 52px; background: rgba(255, 255, 255, 0.025)"
              >
                <span class="text-xs" style="color: rgba(255, 255, 255, 0.2)"
                  >Choisir une image</span
                >
              </div>
              <button
                v-if="iconDisplaySrc"
                class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style="background: rgba(0, 0, 0, 0.6); color: rgba(255, 255, 255, 0.7)"
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
            <label class="text-xs font-medium px-0.5" style="color: rgba(255, 255, 255, 0.25)">
              Bannière
              <span class="ml-1" style="color: rgba(255, 255, 255, 0.15)">optionnel</span>
            </label>
            <div
              class="relative rounded-xl overflow-hidden cursor-pointer"
              style="border: 1px dashed rgba(255, 255, 255, 0.1)"
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
                style="height: 52px; background: rgba(255, 255, 255, 0.025)"
              >
                <span class="text-xs" style="color: rgba(255, 255, 255, 0.2)"
                  >Choisir une image</span
                >
              </div>
              <button
                v-if="bannerDisplaySrc"
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
              style="background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4)"
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
