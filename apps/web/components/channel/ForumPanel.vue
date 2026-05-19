<script setup lang="ts">
const props = defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
  side?: 'left' | 'right';
  offset?: number;
}>();
const emit = defineEmits<{
  close: [];
  'open-post': [channelId: string];
}>();

const { store, createChannel } = useChannels();

const posts = computed(() => store.channels.filter((c) => c.parentId === props.channelId));

const newPostName = ref('');
const creatingPost = ref(false);
const showNewPost = ref(false);

async function submitPost() {
  if (!newPostName.value.trim()) return;
  creatingPost.value = true;
  try {
    const post = await createChannel(props.serverId, {
      name: newPostName.value.trim(),
      type: 'text',
      parentId: props.channelId,
      showStat: true,
    });
    newPostName.value = '';
    showNewPost.value = false;
    emit('open-post', post.id);
  } finally {
    creatingPost.value = false;
  }
}
</script>

<template>
  <div
    class="fixed top-4 bottom-4 z-50 flex flex-col rounded-2xl overflow-hidden"
    :style="{
      left: (props.side ?? 'right') === 'left' ? (props.offset ?? 76) + 'px' : 'auto',
      right: (props.side ?? 'right') === 'right' ? (props.offset ?? 76) + 'px' : 'auto',
      width: '228px',
      transition: 'left 200ms cubic-bezier(0.4,0,0.2,1), right 200ms cubic-bezier(0.4,0,0.2,1)',
      background: 'rgba(10, 10, 16, 0.82)',
      backdropFilter: 'blur(28px) saturate(160%)',
      WebkitBackdropFilter: 'blur(28px) saturate(160%)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
    }"
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
      style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="currentColor"
        style="color: rgba(255, 255, 255, 0.25); flex-shrink: 0"
      >
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
      </svg>
      <span class="flex-1 text-xs font-semibold truncate" style="color: rgba(255, 255, 255, 0.8)">
        {{ channelName }}
      </span>
      <button
        class="flex-shrink-0 rounded-md p-0.5 transition-colors"
        style="color: rgba(255, 255, 255, 0.25)"
        @mouseenter="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'"
        @click="emit('close')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <!-- Posts list -->
    <div
      class="flex-1 overflow-y-auto py-1"
      style="scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.08) transparent"
    >
      <div v-if="!posts.length" class="px-3 py-8 text-center">
        <p class="text-xs" style="color: rgba(255, 255, 255, 0.2)">Aucun post pour l'instant.</p>
      </div>

      <button
        v-for="post in posts"
        :key="post.id"
        class="w-full flex items-center gap-2 px-3 py-2 text-left post-row"
        @click="emit('open-post', post.id)"
      >
        <span class="text-xs font-mono" style="color: rgba(255, 255, 255, 0.2)">#</span>
        <span class="text-xs font-medium truncate" style="color: rgba(255, 255, 255, 0.6)">{{
          post.name
        }}</span>
      </button>
    </div>

    <!-- New post -->
    <div class="flex-shrink-0 p-2.5" style="border-top: 1px solid rgba(255, 255, 255, 0.06)">
      <div v-if="showNewPost" class="flex flex-col gap-1.5">
        <input
          v-model="newPostName"
          type="text"
          class="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
          style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.8);
          "
          placeholder="Nom du post…"
          maxlength="100"
          autofocus
          @keydown.enter="submitPost"
          @keydown.esc="
            showNewPost = false;
            newPostName = '';
          "
        />
        <div class="flex gap-1.5">
          <button
            class="flex-1 rounded-xl py-1.5 text-xs font-medium transition-opacity"
            style="background: rgba(99, 102, 241, 0.85); color: white"
            :class="{ 'opacity-40 pointer-events-none': creatingPost || !newPostName.trim() }"
            @click="submitPost"
          >
            {{ creatingPost ? '…' : 'Créer' }}
          </button>
          <button
            class="rounded-xl px-2.5 py-1.5 text-xs"
            style="background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.35)"
            @click="
              showNewPost = false;
              newPostName = '';
            "
          >
            ✕
          </button>
        </div>
      </div>

      <button
        v-else
        class="w-full rounded-xl py-1.5 text-xs font-medium transition-all"
        style="
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.4);
        "
        @mouseenter="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'"
        @click="showNewPost = true"
      >
        + Nouveau post
      </button>
    </div>
  </div>
</template>

<style scoped>
.post-row {
  transition: background 120ms;
}
.post-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
</style>
