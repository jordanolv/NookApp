<script setup lang="ts">
import { clearError, type NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error?.statusCode === 404);
const title = computed(() => (isNotFound.value ? 'Page introuvable' : 'Une erreur est survenue'));
const message = computed(() =>
  isNotFound.value
    ? "Cette page n'existe pas ou a été déplacée."
    : (props.error?.message ?? 'Quelque chose s’est mal passé de notre côté.'),
);

function goHome() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center px-6 text-center"
    :style="{ background: 'var(--surface-base)', color: 'var(--ink)' }"
  >
    <p class="text-6xl font-black mb-2" :style="{ color: 'var(--accent-violet)' }">
      {{ error?.statusCode ?? 500 }}
    </p>
    <h1 class="text-xl font-semibold mb-2">{{ title }}</h1>
    <p class="text-sm mb-6 max-w-sm" :style="{ color: 'var(--ink-muted)' }">{{ message }}</p>
    <button
      class="rounded-xl px-5 py-2.5 text-sm font-medium"
      :style="{
        background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cool))',
        color: '#fff',
      }"
      @click="goHome"
    >
      Retour à l'accueil
    </button>
  </div>
</template>
