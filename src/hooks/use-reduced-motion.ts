import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReducedMotionPreference = "system" | "on" | "off";

const REDUCED_MOTION_KEY = "app:reduced_motion_v1";

let prefCache: ReducedMotionPreference = "system";
let initialized = false;
let initStarted = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function initReducedMotionPref(): Promise<void> {
  if (initialized) return;
  initStarted = true;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(REDUCED_MOTION_KEY);
    if (raw === "system" || raw === "on" || raw === "off") {
      prefCache = raw;
      notify();
    }
  } catch (e) {
    console.warn("Erreur lecture préférence mouvement réduit:", e);
  }
}

function getSnapshot(): ReducedMotionPreference {
  return prefCache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initStarted) {
    initStarted = true;
    void initReducedMotionPref();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function setReducedMotionPreference(
  pref: ReducedMotionPreference
): Promise<void> {
  prefCache = pref;
  initStarted = true;
  initialized = true;
  notify();
  try {
    await AsyncStorage.setItem(REDUCED_MOTION_KEY, pref);
  } catch (e) {
    console.warn("Erreur sauvegarde préférence mouvement réduit:", e);
  }
}

/**
 * Retourne si le mode mouvement réduit est actif (réglage système + préférence utilisateur).
 */
export function useReducedMotion(): {
  isReduced: boolean;
  preference: ReducedMotionPreference;
  setPreference: (pref: ReducedMotionPreference) => void;
} {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setSystemReduced(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setSystemReduced(enabled);
      }
    );

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const setPreference = useCallback((pref: ReducedMotionPreference) => {
    setReducedMotionPreference(pref);
  }, []);

  const isReduced =
    preference === "on" ? true : preference === "off" ? false : systemReduced;

  return { isReduced, preference, setPreference };
}
