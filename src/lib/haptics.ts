import { useCallback, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const HAPTICS_STORAGE_KEY = "app:haptics_enabled_v1";

let enabledCache = true;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function initHapticsPref(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(HAPTICS_STORAGE_KEY);
    if (raw === "false") {
      enabledCache = false;
      notify();
    } else if (raw === "true") {
      enabledCache = true;
      notify();
    }
  } catch (e) {
    console.warn("Erreur lecture préférence haptique:", e);
  }
}

function getSnapshot(): boolean {
  if (!initialized) {
    initHapticsPref();
  }
  return enabledCache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  enabledCache = enabled;
  initialized = true;
  notify();
  try {
    await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
  } catch (e) {
    console.warn("Erreur sauvegarde préférence haptique:", e);
  }
}

export function useHapticsPreference(): {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
} {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setEnabled = useCallback((v: boolean) => {
    setHapticsEnabled(v);
  }, []);
  return { enabled, setEnabled };
}

function canTrigger(): boolean {
  if (Platform.OS === "web") return false;
  if (!initialized) {
    initHapticsPref();
  }
  return enabledCache;
}

/**
 * Retours haptiques sémantiques calibrés selon le geste utilisateur.
 */
export const haptics = {
  /** Changements d'onglet, sélecteurs segmentés, bande de jours, thèmes */
  selection() {
    if (!canTrigger()) return;
    Haptics.selectionAsync().catch(() => {});
  },
  /** Tap léger sur cartes de cours, flèches, chips standards */
  tap() {
    if (!canTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Actions douces : retour Aujourd'hui, ouverture de modales/filtres */
  soft() {
    if (!canTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  },
  /** Interrupteurs (Switch), rafraîchissement manuel */
  toggle() {
    if (!canTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Validation réussie : sauvegarde note, URL ICS, ajout matière */
  success() {
    if (!canTrigger()) return;
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  },
  /** Réinitialisation, masquage de matière, suppression */
  warning() {
    if (!canTrigger()) return;
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
  },
  /** Erreur réseau lors d'un rafraîchissement manuel */
  error() {
    if (!canTrigger()) return;
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
  },
};
