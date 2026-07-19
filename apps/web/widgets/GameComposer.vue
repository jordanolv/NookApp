<script setup lang="ts">
import { ref } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { Plus } from 'lucide-vue-next';

const props = defineProps<{
  serverId: string;
  parentChannelId: string;
}>();

const emit = defineEmits<{
  created: [game: ChannelPublic];
  cancel: [];
}>();

const { createChannel, setChannelIcon } = useChannels();

const newName = ref('');
const creating = ref(false);
const pendingFile = ref<File | null>(null);
const previewSrc = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function pickFile() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (previewSrc.value) URL.revokeObjectURL(previewSrc.value);
  pendingFile.value = file;
  previewSrc.value = URL.createObjectURL(file);
}

function reset() {
  if (previewSrc.value) URL.revokeObjectURL(previewSrc.value);
  pendingFile.value = null;
  previewSrc.value = null;
  newName.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

async function submit() {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const game = await createChannel(props.serverId, {
      name,
      type: 'text',
      parentId: props.parentChannelId,
      showStat: true,
    });
    if (pendingFile.value) {
      await setChannelIcon(props.serverId, game.id, pendingFile.value);
    }
    reset();
    emit('created', game);
  } finally {
    creating.value = false;
  }
}

function onCancel() {
  reset();
  emit('cancel');
}
</script>

<template>
  <div class="composer">
    <button type="button" class="composer-cover" title="Ajouter une image" @click="pickFile">
      <img v-if="previewSrc" :src="previewSrc" class="composer-cover-img" />
      <Plus v-else :size="22" />
    </button>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
    <div class="composer-body">
      <input
        v-model="newName"
        type="text"
        class="composer-input"
        placeholder="Nom du jeu (ex: Valorant, Rocket League…)"
        maxlength="80"
        autofocus
        @keydown.enter="submit"
        @keydown.esc="onCancel"
      />
      <div class="composer-actions">
        <button
          class="composer-btn solid"
          :class="{ disabled: creating || !newName.trim() }"
          @click="submit"
        >
          {{ creating ? '…' : 'Ajouter' }}
        </button>
        <button class="composer-btn ghost" @click="onCancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composer {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed rgba(99, 102, 241, 0.4);
  margin-bottom: 14px;
}
.composer-cover {
  width: 80px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px dashed rgba(99, 102, 241, 0.4);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 140ms,
    background 140ms,
    color 140ms;
}
.composer-cover:hover {
  border-color: rgba(99, 102, 241, 0.7);
  color: rgba(255, 255, 255, 0.85);
}
.composer-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.composer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.composer-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}
.composer-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
}
.composer-actions {
  display: flex;
  gap: 6px;
}
.composer-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 120ms;
}
.composer-btn.solid {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}
.composer-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}
.composer-btn.disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
