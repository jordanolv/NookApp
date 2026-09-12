import { Room } from 'livekit-client';
import { room } from '~/composables/voice/state';
import {
  loadMediaDevicePrefs,
  saveMediaDevicePrefs,
  type MediaDeviceKind,
  type MediaDevicePrefs,
} from '~/utils/media-device-prefs';

// Module-level singletons: device choices outlive the settings modal and are read by createRoom().
export const mediaDevicePrefs = ref<MediaDevicePrefs>(loadMediaDevicePrefs());
const devices = ref<MediaDeviceInfo[]>([]);
let listening = false;

export function useMediaDevices() {
  async function refresh(requestPermissions = false) {
    try {
      devices.value = await Room.getLocalDevices(undefined, requestPermissions);
    } catch {
      devices.value = [];
    }
  }

  function listen() {
    if (listening || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    listening = true;
    navigator.mediaDevices.addEventListener('devicechange', () => void refresh());
  }

  function byKind(kind: MediaDeviceKind) {
    return computed(() => devices.value.filter((d) => d.kind === kind));
  }

  async function select(kind: MediaDeviceKind, deviceId: string | null) {
    mediaDevicePrefs.value = { ...mediaDevicePrefs.value, [kind]: deviceId };
    saveMediaDevicePrefs(mediaDevicePrefs.value);
    if (room.value && deviceId) {
      await room.value.switchActiveDevice(kind, deviceId).catch(() => {});
    }
  }

  return { prefs: readonly(mediaDevicePrefs), devices, byKind, refresh, listen, select };
}
