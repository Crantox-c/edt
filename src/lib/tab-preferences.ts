import { useCallback, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SHOW_QIBLA_TAB_KEY = "app:show_qibla_tab_v1";

let showQiblaTabCache = true;
let initialized = false;
let initStarted = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function initQiblaTabPref(): Promise<void> {
  if (initialized) return;
  initStarted = true;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(SHOW_QIBLA_TAB_KEY);
    if (raw === "false") {
      showQiblaTabCache = false;
      notify();
    } else if (raw === "true") {
      showQiblaTabCache = true;
      notify();
    }
  } catch (e) {
    console.warn("Erreur lecture préférence onglet Qibla:", e);
  }
}

function getSnapshot(): boolean {
  return showQiblaTabCache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initStarted) {
    initStarted = true;
    void initQiblaTabPref();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function setShowQiblaTab(visible: boolean): Promise<void> {
  showQiblaTabCache = visible;
  initStarted = true;
  initialized = true;
  notify();
  try {
    await AsyncStorage.setItem(SHOW_QIBLA_TAB_KEY, String(visible));
  } catch (e) {
    console.warn("Erreur sauvegarde préférence onglet Qibla:", e);
  }
}

export function useQiblaTabPreference(): {
  showQiblaTab: boolean;
  setShowQiblaTab: (visible: boolean) => void;
} {
  const showQiblaTab = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const update = useCallback((visible: boolean) => {
    void setShowQiblaTab(visible);
  }, []);
  return { showQiblaTab, setShowQiblaTab: update };
}
