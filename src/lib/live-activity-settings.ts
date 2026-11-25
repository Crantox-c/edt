import { useCallback, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LIVE_ACTIVITY_SETTINGS_KEY = "app:live_activity_settings_v1";

export const LIVE_ACTIVITY_LEAD_TIMES = [15, 20, 30, 45] as const;

export type LiveActivitySettings = {
  enabled: boolean;
  leadTimeMinutes: number;
};

export const DEFAULT_LIVE_ACTIVITY_SETTINGS: LiveActivitySettings = {
  enabled: true,
  leadTimeMinutes: 20,
};

export type LiveActivitySettingsSnapshot = {
  settings: LiveActivitySettings;
  isLoaded: boolean;
};

let snapshotCache: LiveActivitySettingsSnapshot = {
  settings: DEFAULT_LIVE_ACTIVITY_SETTINGS,
  isLoaded: false,
};
let initialized = false;
let initStarted = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function isValidLeadTime(value: unknown): value is number {
  return (
    typeof value === "number" &&
    (LIVE_ACTIVITY_LEAD_TIMES as readonly number[]).includes(value)
  );
}

async function initLiveActivitySettings(): Promise<void> {
  if (initialized) return;
  initStarted = true;
  let nextSettings = snapshotCache.settings;

  try {
    const raw = await AsyncStorage.getItem(LIVE_ACTIVITY_SETTINGS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<LiveActivitySettings>;
      nextSettings = {
        enabled:
          typeof parsed.enabled === "boolean"
            ? parsed.enabled
            : DEFAULT_LIVE_ACTIVITY_SETTINGS.enabled,
        leadTimeMinutes: isValidLeadTime(parsed.leadTimeMinutes)
          ? parsed.leadTimeMinutes
          : DEFAULT_LIVE_ACTIVITY_SETTINGS.leadTimeMinutes,
      };
    }
  } catch (e) {
    console.warn("Erreur lecture réglages Live Activity:", e);
  } finally {
    initialized = true;
    snapshotCache = {
      settings: nextSettings,
      isLoaded: true,
    };
    notify();
  }
}

export function getLiveActivitySettingsSnapshot(): LiveActivitySettingsSnapshot {
  return snapshotCache;
}

export function subscribeLiveActivitySettings(
  listener: () => void
): () => void {
  listeners.add(listener);
  if (!initStarted) {
    initStarted = true;
    void initLiveActivitySettings();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function updateLiveActivitySettings(
  partial: Partial<LiveActivitySettings>
): Promise<LiveActivitySettings> {
  const prev = snapshotCache.settings;
  const next: LiveActivitySettings = {
    enabled:
      typeof partial.enabled === "boolean" ? partial.enabled : prev.enabled,
    leadTimeMinutes: isValidLeadTime(partial.leadTimeMinutes)
      ? partial.leadTimeMinutes
      : prev.leadTimeMinutes,
  };

  initStarted = true;
  initialized = true;
  snapshotCache = {
    settings: next,
    isLoaded: true,
  };
  notify();

  try {
    await AsyncStorage.setItem(
      LIVE_ACTIVITY_SETTINGS_KEY,
      JSON.stringify(next)
    );
  } catch (e) {
    console.warn("Erreur sauvegarde réglages Live Activity:", e);
  }

  return next;
}

export function useLiveActivitySettings(): {
  settings: LiveActivitySettings;
  isLoaded: boolean;
  updateSettings: (partial: Partial<LiveActivitySettings>) => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeLiveActivitySettings,
    getLiveActivitySettingsSnapshot,
    getLiveActivitySettingsSnapshot
  );

  const updateSettings = useCallback(
    (partial: Partial<LiveActivitySettings>) => {
      void updateLiveActivitySettings(partial);
    },
    []
  );

  return {
    settings: snapshot.settings,
    isLoaded: snapshot.isLoaded,
    updateSettings,
  };
}
