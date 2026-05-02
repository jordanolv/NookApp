<script setup lang="ts">
const { store } = useServers();

const firstTextChannel = computed(() => store.textChannels[0]);

watchEffect(() => {
  const ch = firstTextChannel.value;
  const route = useRoute();
  if (ch) {
    navigateTo(`/app/${route.params.serverId}/channels/${ch.id}`, { replace: true });
  }
});
</script>

<template>
  <div class="flex flex-1 items-center justify-center text-neutral-500">
    <span v-if="!firstTextChannel">No channels yet</span>
  </div>
</template>
