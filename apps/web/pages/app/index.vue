<script setup lang="ts">
import type { CreateServerInput } from '@nookapp/protocol';

definePageMeta({ layout: 'app' });

const { store, fetchServers, createServer } = useServers();
const { user } = useAuth();

const showCreate = ref(false);
const createName = ref('');
const createError = ref('');
const creating = ref(false);

await fetchServers();

async function submitCreate() {
  const name = createName.value.trim();
  if (name.length < 2) {
    createError.value = 'Name must be at least 2 characters';
    return;
  }
  creating.value = true;
  createError.value = '';
  try {
    const server = await createServer({ name } satisfies CreateServerInput);
    showCreate.value = false;
    createName.value = '';
    await navigateTo(`/app/${server.id}`);
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    createError.value = err.data?.message ?? 'Failed to create server';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <header class="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <h1 class="text-lg font-semibold">Your Nooks</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-neutral-400">{{ user?.name }}</span>
        <button
          class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500 transition-colors"
          @click="showCreate = true"
        >
          + New Nook
        </button>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6">
      <div v-if="!store.ready" class="flex items-center justify-center h-48 text-neutral-500">
        Loading…
      </div>

      <div
        v-else-if="store.list.length === 0"
        class="flex flex-col items-center justify-center h-48 gap-3"
      >
        <p class="text-neutral-400">No Nook yet.</p>
        <button
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors"
          @click="showCreate = true"
        >
          Create your first Nook
        </button>
      </div>

      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NuxtLink
          v-for="server in store.list"
          :key="server.id"
          :to="`/app/${server.id}`"
          class="group flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-800/50 p-5 hover:border-indigo-500 hover:bg-neutral-800 transition-all"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold"
          >
            {{ server.name[0]?.toUpperCase() }}
          </div>
          <div>
            <p class="font-medium truncate">{{ server.name }}</p>
            <p class="text-xs text-neutral-500 truncate">{{ server.slug }}</p>
          </div>
        </NuxtLink>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="showCreate"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showCreate = false"
      >
        <div class="w-full max-w-md rounded-xl bg-neutral-800 p-6 shadow-2xl">
          <h2 class="mb-4 text-lg font-semibold">Create a Nook</h2>
          <form class="flex flex-col gap-4" @submit.prevent="submitCreate">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-neutral-300">Server name</label>
              <input
                v-model="createName"
                type="text"
                placeholder="My awesome team"
                autofocus
                class="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
              <p v-if="createError" class="text-xs text-red-400">{{ createError }}</p>
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                @click="showCreate = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {{ creating ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
