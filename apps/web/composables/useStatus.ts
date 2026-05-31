import { computed, onMounted, onUnmounted, ref } from 'vue';

export type Status = 'online' | 'busy' | 'away';

const STATUS_STORAGE_KEY = 'nook:user-status';
const IDLE_THRESHOLD_MS = 15 * 60 * 1000;
const IDLE_TICK_MS = 30 * 1000;

const isStatus = (v: unknown): v is Status => v === 'online' || v === 'busy' || v === 'away';

// Module-level singletons so the manual status + idle tracking are shared
// across every component that calls useStatus().
const manualStatus = ref<Status>('online');
const lastActivityAt = ref<number>(Date.now());
const now = ref<number>(Date.now());
const refCount = ref(0);
let activityHandler: (() => void) | null = null;
let tickId: ReturnType<typeof setInterval> | null = null;
let initialized = false;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const;

function init() {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(STATUS_STORAGE_KEY);
  if (isStatus(stored)) manualStatus.value = stored;
}

function attach() {
  if (typeof window === 'undefined') return;
  activityHandler = () => {
    lastActivityAt.value = Date.now();
  };
  for (const ev of ACTIVITY_EVENTS) {
    window.addEventListener(ev, activityHandler, { passive: true });
  }
  tickId = setInterval(() => {
    now.value = Date.now();
  }, IDLE_TICK_MS);
  activityHandler();
}

function detach() {
  if (typeof window === 'undefined') return;
  if (activityHandler) {
    for (const ev of ACTIVITY_EVENTS) {
      window.removeEventListener(ev, activityHandler);
    }
    activityHandler = null;
  }
  if (tickId !== null) {
    clearInterval(tickId);
    tickId = null;
  }
}

function setManualStatus(s: Status) {
  manualStatus.value = s;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STATUS_STORAGE_KEY, s);
    // Reset the idle clock so going back to "online" doesn't fall straight
    // into the idle branch from a stale lastActivityAt.
    lastActivityAt.value = Date.now();
  }
}

export function useStatus() {
  if (!initialized && typeof window !== 'undefined') {
    init();
    initialized = true;
  }

  const voice = useVoice();

  const isIdle = computed(() => now.value - lastActivityAt.value >= IDLE_THRESHOLD_MS);
  const inVoice = computed(() => voice.currentChannelId.value !== null);

  const effectiveStatus = computed<Status>(() => {
    if (manualStatus.value === 'away') return 'away';
    if (isIdle.value) return 'away';
    if (manualStatus.value === 'busy') return 'busy';
    if (inVoice.value) return 'busy';
    return 'online';
  });

  const autoOverride = computed<'idle' | 'voice' | null>(() => {
    if (manualStatus.value === 'away') return null;
    if (isIdle.value) return 'idle';
    if (manualStatus.value === 'online' && inVoice.value) return 'voice';
    return null;
  });

  onMounted(() => {
    refCount.value += 1;
    if (refCount.value === 1) attach();
  });
  onUnmounted(() => {
    refCount.value -= 1;
    if (refCount.value === 0) detach();
  });

  return {
    manualStatus,
    setManualStatus,
    effectiveStatus,
    autoOverride,
    isIdle,
    inVoice,
  };
}
