<script setup lang="ts">
const route = useRoute();
const channelId = computed(() => route.params.channelId as string);
const { store } = useServers();
const channel = computed(() => store.channels.find((c) => c.id === channelId.value));
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Channel header -->
    <header class="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
      <span class="text-neutral-500">#</span>
      <span class="font-semibold">{{ channel?.name ?? '…' }}</span>
    </header>

    <!-- Chat area (filled in feat/web-chat) -->
    <div class="flex flex-1 items-center justify-center text-neutral-600">
      <p class="text-sm">Messages coming soon</p>
    </div>
  </div>
</template>
