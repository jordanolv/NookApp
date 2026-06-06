<script setup lang="ts">
import type { CreateServerInput } from '@nookapp/protocol';
import { DEFAULT_TEMPLATE_ID } from '~/components/world/scene/map-templates';

definePageMeta({ layout: 'app' });

const { t } = useI18n();
const { store, fetchServers, createServer } = useServers();
const { seedServerMap } = useMapTemplates();
const { user, signOut } = useAuth();
const socket = useSocket();
const dmHub = useDmHub();
const dmsStore = useDmsStore();
const dmRealtime = useDmRealtime();
const dmUnread = computed(() => dmsStore.totalUnread);

let teardownDm: (() => void) | null = null;
onMounted(() => {
  socket.connect();
  teardownDm = dmRealtime.setup();
});
onUnmounted(() => {
  teardownDm?.();
});

const showCreate = ref(false);
const createName = ref('');
const createTemplate = ref(DEFAULT_TEMPLATE_ID);
const createError = ref('');
const creating = ref(false);
const menuOpen = ref(false);

await fetchServers();

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

async function submitCreate() {
  const name = createName.value.trim();
  if (name.length < 2) {
    createError.value = t('nooks.create.nameTooShort');
    return;
  }
  creating.value = true;
  createError.value = '';
  try {
    const server = await createServer({ name } satisfies CreateServerInput);
    try {
      await seedServerMap(server.id, createTemplate.value);
    } catch {
      // Non-blocking: the server exists; it falls back to the default map.
    }
    showCreate.value = false;
    createName.value = '';
    await navigateTo(`/app/${server.id}`);
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    createError.value = err.data?.message ?? t('nooks.create.failed');
  } finally {
    creating.value = false;
  }
}

async function onSignOut() {
  menuOpen.value = false;
  await signOut();
  await navigateTo('/');
}
</script>

<template>
  <div class="nooks">
    <div class="nooks__grid" aria-hidden="true" />
    <div class="nooks__blob nooks__blob--a" aria-hidden="true" />
    <div class="nooks__blob nooks__blob--b" aria-hidden="true" />

    <header class="nooks__header">
      <div class="nooks__heading">
        <h1 class="nooks__title">{{ t('nooks.title') }}</h1>
        <p class="nooks__subtitle">{{ t('nooks.subtitle') }}</p>
      </div>

      <div class="nooks__actions">
        <button class="nooks__btn nooks__btn--ghost nooks__dm" @click="dmHub.toggle()">
          💬 Messages
          <span v-if="dmUnread > 0" class="nooks__dm-badge">{{ dmUnread }}</span>
        </button>

        <button class="nooks__btn nooks__btn--primary" @click="showCreate = true">
          <span aria-hidden="true">+</span>
          {{ t('nooks.newNook') }}
        </button>

        <div class="nooks__user" @click.stop>
          <button class="nooks__userchip" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span class="nooks__avatar">{{ initials(user?.name ?? '?') }}</span>
            <span class="nooks__username">{{ user?.name }}</span>
          </button>
          <div v-if="menuOpen" class="nooks__menu" role="menu">
            <button class="nooks__menu-item" role="menuitem" @click="onSignOut">
              {{ t('nooks.signOut') }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="nooks__main">
      <div v-if="!store.ready" class="nooks__state">{{ t('nooks.loading') }}</div>

      <div v-else-if="store.list.length === 0" class="nooks__empty">
        <div class="nooks__empty-art" aria-hidden="true">🏡</div>
        <h2 class="nooks__empty-title">{{ t('nooks.empty.title') }}</h2>
        <p class="nooks__empty-body">{{ t('nooks.empty.body') }}</p>
        <button class="nooks__btn nooks__btn--primary" @click="showCreate = true">
          {{ t('nooks.empty.cta') }}
        </button>
      </div>

      <div v-else class="nooks__cards">
        <NuxtLink
          v-for="server in store.list"
          :key="server.id"
          :to="`/app/${server.id}`"
          class="card"
        >
          <div
            v-if="server.iconUrl"
            class="card__icon card__icon--image"
            :style="{ backgroundImage: `url(${server.iconUrl})` }"
          />
          <div v-else class="card__icon">{{ initials(server.name) }}</div>

          <div class="card__body">
            <p class="card__name">{{ server.name }}</p>
            <p class="card__slug">{{ server.slug }}</p>
          </div>

          <span class="card__arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showCreate" class="modal" @click.self="showCreate = false">
        <div class="modal__panel">
          <h2 class="modal__title">{{ t('nooks.create.title') }}</h2>
          <form class="modal__form" @submit.prevent="submitCreate">
            <div class="modal__field">
              <label class="modal__label" for="server-name">
                {{ t('nooks.create.nameLabel') }}
              </label>
              <input
                id="server-name"
                v-model="createName"
                type="text"
                :placeholder="t('nooks.create.namePlaceholder')"
                autofocus
                class="modal__input"
              />
              <p v-if="createError" class="modal__error">{{ createError }}</p>
            </div>
            <div class="modal__field">
              <span class="modal__label">{{ t('nooks.create.templateLabel') }}</span>
              <div class="modal__templates">
                <WorldMapTemplateGallery v-model="createTemplate" />
              </div>
            </div>
            <div class="modal__actions">
              <button
                type="button"
                class="nooks__btn nooks__btn--ghost"
                @click="showCreate = false"
              >
                {{ t('nooks.create.cancel') }}
              </button>
              <button type="submit" :disabled="creating" class="nooks__btn nooks__btn--primary">
                {{ creating ? t('nooks.create.submitLoading') : t('nooks.create.submit') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <DmHub />
  </div>
</template>

<style scoped>
.nooks {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--page-bg);
  color: var(--ink);
  overflow: hidden;
}

.nooks__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--surface-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--surface-border) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at 50% 0%, #000 25%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 0%, #000 25%, transparent 70%);
  pointer-events: none;
  opacity: 0.55;
}

.nooks__blob {
  position: absolute;
  width: 440px;
  height: 440px;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.4;
}
.nooks__blob--a {
  top: -160px;
  left: -120px;
  background: var(--accent-leaf-soft);
}
.nooks__blob--b {
  top: -100px;
  right: -160px;
  background: var(--accent-cool-soft);
}

.nooks__header {
  position: relative;
  padding: 32px 48px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.nooks__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nooks__title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}
.nooks__subtitle {
  font-size: 14px;
  color: var(--ink-muted);
  margin: 0;
}

.nooks__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nooks__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
}
.nooks__btn:hover {
  transform: translateY(-1px);
}
.nooks__btn--primary {
  background: var(--ink);
  color: var(--ink-inverse);
}
.nooks__btn--primary:hover {
  background: var(--ink-soft);
}
.nooks__btn--ghost {
  background: var(--surface-strong);
  border-color: var(--surface-border);
  color: var(--ink);
}
.nooks__btn--ghost:hover {
  background: var(--surface-raised);
}

.nooks__dm {
  position: relative;
}
.nooks__dm-badge {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent-rose);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.nooks__user {
  position: relative;
}
.nooks__userchip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s ease;
}
.nooks__userchip:hover {
  background: var(--surface-raised);
}
.nooks__avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--accent-leaf-soft);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}
.nooks__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  padding: 6px;
  border-radius: 12px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-soft);
  z-index: 30;
}
.nooks__menu-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.12s ease;
}
.nooks__menu-item:hover {
  background: var(--surface-tinted);
}

.nooks__main {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 16px 48px 56px;
}

.nooks__state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
  color: var(--ink-muted);
  font-size: 14px;
}

.nooks__empty {
  margin: 40px auto;
  max-width: 460px;
  padding: 40px 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: var(--surface-strong);
  border: 1px dashed var(--surface-divider);
  border-radius: 20px;
}
.nooks__empty-art {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: var(--accent-warm-soft);
}
.nooks__empty-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.nooks__empty-body {
  font-size: 14px;
  color: var(--ink-muted);
  margin: 0;
}

.nooks__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  color: var(--ink);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
  overflow: hidden;
}
.card:hover {
  transform: translateY(-2px);
  background: var(--surface-raised);
  border-color: var(--surface-divider);
}

.card__icon {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--accent-violet-soft);
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.card__icon--image {
  background-size: cover;
  background-position: center;
  color: transparent;
}

.card__body {
  min-width: 0;
  flex: 1;
}
.card__name {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__slug {
  font-size: 12px;
  color: var(--ink-faint);
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__arrow {
  font-size: 16px;
  color: var(--ink-faint);
  transform: translateX(-4px);
  opacity: 0;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.card:hover .card__arrow {
  transform: translateX(0);
  opacity: 1;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(29, 42, 35, 0.36);
  backdrop-filter: blur(6px);
  padding: 24px;
}
.modal__panel {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  border-radius: 18px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lift);
}
.modal__title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
}
.modal__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal__templates {
  max-height: 252px;
  overflow-y: auto;
  margin-top: 8px;
  padding-right: 2px;
}
.modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.modal__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.modal__input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--surface-divider);
  background: var(--surface-raised);
  color: var(--ink);
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.modal__input:focus {
  outline: none;
  border-color: var(--accent-leaf);
  background: var(--surface-strong);
}
.modal__error {
  font-size: 12px;
  color: var(--accent-rose);
  margin: 0;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
