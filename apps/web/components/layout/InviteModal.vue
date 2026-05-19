<script setup lang="ts">
defineProps<{
  open: boolean;
  serverName?: string | null;
  url: string;
  loading: boolean;
  copied: boolean;
}>();

defineEmits<{
  close: [];
  copy: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="veil" @click.self="$emit('close')">
      <div class="modal">
        <header class="modal__head">
          <h2>Invite people to {{ serverName }}</h2>
          <button class="modal__close" @click="$emit('close')">✕</button>
        </header>

        <div v-if="loading" class="modal__loading">
          <span class="spinner" />
        </div>

        <div v-else class="modal__body">
          <p class="modal__hint">Share this link to invite people.</p>
          <div class="modal__field">
            <span class="modal__url">{{ url }}</span>
            <button class="modal__copy" @click="$emit('copy')">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.modal {
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(12, 12, 18, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__head h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.modal__close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.modal__close:hover {
  color: rgba(255, 255, 255, 0.7);
}

.modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}

.spinner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.25);
  border-top-color: rgb(99, 102, 241);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.modal__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal__hint {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.modal__field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.modal__url {
  flex: 1;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal__copy {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgb(99, 102, 241);
  color: white;
  font-size: 11px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 120ms;
}

.modal__copy:hover {
  background: rgb(129, 140, 248);
}
</style>
