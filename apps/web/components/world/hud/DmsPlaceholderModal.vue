<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next';

defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div class="dms-veil" @click.self="$emit('close')">
      <div class="dms-modal">
        <div class="dms-modal__icon">
          <MessageCircle :size="28" :stroke-width="1.8" />
        </div>
        <h2 class="dms-modal__title">Messages privés</h2>
        <p class="dms-modal__text">
          Les MPs arrivent bientôt. Tu pourras discuter directement avec n'importe quel membre de
          ton Nook.
        </p>
        <button type="button" class="dms-modal__btn" @click="$emit('close')">Fermer</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dms-veil {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}
.dms-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 340px;
  padding: 28px 24px 22px;
  border-radius: 16px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  text-align: center;
}
.dms-modal__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-violet-soft);
  color: var(--accent-violet);
}
.dms-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.dms-modal__text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-soft);
}
.dms-modal__btn {
  margin-top: 4px;
  padding: 8px 18px;
  border: none;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.9);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms;
}
.dms-modal__btn:hover {
  background: rgb(99, 102, 241);
}
</style>
