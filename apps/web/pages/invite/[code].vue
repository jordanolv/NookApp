<script setup lang="ts">
const route = useRoute();
const code = route.params.code as string;

const { joinViaInvite } = useInvites();
const { fetchServers } = useServers();

const status = ref<'joining' | 'success' | 'error'>('joining');
const errorMessage = ref('');
const serverId = ref('');

onMounted(async () => {
  try {
    const server = await joinViaInvite(code);
    serverId.value = server.id;
    await fetchServers();
    status.value = 'success';
    await navigateTo(`/app/${server.id}`);
  } catch (err: unknown) {
    status.value = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Already a member')) {
      errorMessage.value = 'You are already a member of this server.';
    } else if (msg.includes('expired')) {
      errorMessage.value = 'This invite link has expired.';
    } else if (msg.includes('maximum uses')) {
      errorMessage.value = 'This invite link has reached its maximum uses.';
    } else if (msg.includes('not found') || msg.includes('404')) {
      errorMessage.value = 'This invite link is invalid or does not exist.';
    } else {
      errorMessage.value = 'Something went wrong. Please try again.';
    }
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-950">
    <div class="flex flex-col items-center gap-4 text-center">
      <div v-if="status === 'joining'" class="flex flex-col items-center gap-3">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        />
        <p class="text-sm text-neutral-400">Joining server…</p>
      </div>

      <div v-else-if="status === 'error'" class="flex flex-col items-center gap-4">
        <p class="text-sm text-red-400">{{ errorMessage }}</p>
        <NuxtLink to="/app" class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Back to app
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
