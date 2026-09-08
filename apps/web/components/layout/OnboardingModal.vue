<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useDialogA11y } from '~/composables/useDialogA11y';

const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{
  finish: [];
  createNook: [];
}>();

const { t } = useI18n();

const STEPS = ['welcome', 'move', 'chat', 'start'] as const;
const stepIndex = ref(0);
const step = computed(() => STEPS[stepIndex.value]);
const isLast = computed(() => stepIndex.value === STEPS.length - 1);

const joinCode = ref('');

const moveKeys = computed(() => t('onboarding.move.keys').split(''));

const panel = ref<HTMLElement | null>(null);
useDialogA11y(toRef(props, 'open'), panel, () => emit('finish'));

function next() {
  if (!isLast.value) stepIndex.value += 1;
}

function back() {
  if (stepIndex.value > 0) stepIndex.value -= 1;
}

function onCreate() {
  emit('finish');
  emit('createNook');
}

async function onJoin() {
  const raw = joinCode.value.trim();
  if (!raw) return;
  const code = raw.split('/').filter(Boolean).pop() ?? raw;
  emit('finish');
  await navigateTo(`/invite/${code}`);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="veil">
      <div
        ref="panel"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="t('onboarding.ariaLabel')"
        tabindex="-1"
      >
        <div class="modal__dots" aria-hidden="true">
          <span
            v-for="(s, i) in STEPS"
            :key="s"
            class="modal__dot"
            :class="{ 'modal__dot--active': i === stepIndex }"
          />
        </div>

        <div class="modal__body">
          <template v-if="step === 'welcome'">
            <div class="modal__art" aria-hidden="true">🏡</div>
            <h2>{{ t('onboarding.welcome.title') }}</h2>
            <p>{{ t('onboarding.welcome.body') }}</p>
          </template>

          <template v-else-if="step === 'move'">
            <div class="modal__art" aria-hidden="true">
              <span class="modal__keys">
                <kbd>{{ moveKeys[0] }}</kbd>
                <span class="modal__keys-row">
                  <kbd v-for="k in moveKeys.slice(1)" :key="k">{{ k }}</kbd>
                </span>
              </span>
            </div>
            <h2>{{ t('onboarding.move.title') }}</h2>
            <p>{{ t('onboarding.move.body') }}</p>
          </template>

          <template v-else-if="step === 'chat'">
            <div class="modal__art" aria-hidden="true">💬🎙️</div>
            <h2>{{ t('onboarding.chat.title') }}</h2>
            <p>{{ t('onboarding.chat.body') }}</p>
          </template>

          <template v-else>
            <div class="modal__art" aria-hidden="true">🚀</div>
            <h2>{{ t('onboarding.start.title') }}</h2>
            <p>{{ t('onboarding.start.body') }}</p>
            <button class="modal__btn modal__btn--primary" @click="onCreate">
              {{ t('onboarding.start.create') }}
            </button>
            <form class="modal__join" @submit.prevent="onJoin">
              <input
                v-model="joinCode"
                type="text"
                :placeholder="t('onboarding.start.codePlaceholder')"
                :aria-label="t('onboarding.start.codePlaceholder')"
              />
              <button type="submit" class="modal__btn" :disabled="!joinCode.trim()">
                {{ t('onboarding.start.join') }}
              </button>
            </form>
          </template>
        </div>

        <footer class="modal__foot">
          <button v-if="stepIndex > 0" class="modal__nav" @click="back">
            {{ t('onboarding.back') }}
          </button>
          <span v-else />
          <div class="modal__foot-right">
            <button class="modal__skip" @click="emit('finish')">
              {{ t('onboarding.skip') }}
            </button>
            <button v-if="!isLast" class="modal__btn modal__btn--primary" @click="next">
              {{ t('onboarding.next') }}
            </button>
          </div>
        </footer>
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
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px rgba(20, 35, 25, 0.55);
}

.modal__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.modal__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--surface-border);
  transition: background 0.2s;
}

.modal__dot--active {
  background: var(--accent, #6ea8fe);
}

.modal__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  min-height: 14rem;
  justify-content: center;
}

.modal__body h2 {
  margin: 0;
  font-size: 18px;
  color: var(--ink);
}

.modal__body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.modal__art {
  font-size: 40px;
}

.modal__keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.modal__keys-row {
  display: flex;
  gap: 4px;
}

.modal__keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-tinted);
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
}

.modal__btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-tinted);
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
}

.modal__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.modal__btn--primary {
  background: var(--accent, #6ea8fe);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.modal__join {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 20rem;
}

.modal__join input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-tinted-strong, var(--surface-tinted));
  color: var(--ink);
  font-size: 13px;
}

.modal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__foot-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal__nav,
.modal__skip {
  background: none;
  border: none;
  padding: 4px;
  font-size: 12px;
  color: var(--ink-muted);
  cursor: pointer;
}

.modal__nav:hover,
.modal__skip:hover {
  color: var(--ink);
}
</style>
