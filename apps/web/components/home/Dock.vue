<script setup lang="ts">
import { Pin, Users } from 'lucide-vue-next';

defineEmits<{
  pin: [];
  members: [];
}>();
</script>

<template>
  <div class="home-dock">
    <button class="home-dock__icon" title="Épinglés" @click="$emit('pin')">
      <Pin :size="16" />
    </button>
    <button class="home-dock__icon" title="Membres" @click="$emit('members')">
      <Users :size="16" />
    </button>
  </div>
</template>

<style scoped>
.home-dock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  width: 100%;
}

.home-dock__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.45);
  background: transparent;
  transition:
    background 140ms,
    color 140ms;
  cursor: pointer;
}

.home-dock__icon:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
}
</style>
