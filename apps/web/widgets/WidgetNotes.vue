<script setup lang="ts">
defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
}>();
</script>

<template>
  <div class="placeholder">
    <p class="title">📝 Notes — {{ channelName }}</p>
    <p class="hint">Widget Notes (stub) — implémentation visuelle dans la prochaine phase.</p>
  </div>
</template>

<style scoped>
.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.title {
  font-size: 18px;
  font-weight: 700;
}
.hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
