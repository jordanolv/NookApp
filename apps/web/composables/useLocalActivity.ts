import { ref } from 'vue';
import { ACTIVITY_STORAGE_KEY } from '~/components/world/name-tag/constants';

const stored =
  typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVITY_STORAGE_KEY) : null;
const localActivity = ref<string | null>(stored);

function setLocalActivity(icon: string | null) {
  localActivity.value = icon;
  if (typeof window === 'undefined') return;
  if (icon) window.localStorage.setItem(ACTIVITY_STORAGE_KEY, icon);
  else window.localStorage.removeItem(ACTIVITY_STORAGE_KEY);
}

export function useLocalActivity() {
  return { localActivity, setLocalActivity };
}
