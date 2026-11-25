import { requireOptionalNativeModule } from "expo";
import { Linking, Platform } from "react-native";

import type { Course } from "@/lib/geii-api";
import {
  buildScheduleIntentsSnapshot,
  getIntentsSnapshotFingerprint,
} from "@/lib/intents-snapshot";
import { getSubjectDictionarySnapshot } from "@/lib/subject-names";

type NativeScheduleIntentsModule = {
  isSupported?: boolean;
  writeSnapshot?: (json: string) => boolean;
  clearSnapshot?: () => void;
  openShortcutsApp?: () => boolean;
};

export type AppIntentsSyncStatus = {
  lastSyncAt: number | null;
  courseCount: number;
  groupName: string | null;
  lastError: string | null;
};

const INITIAL_STATUS: AppIntentsSyncStatus = {
  lastSyncAt: null,
  courseCount: 0,
  groupName: null,
  lastError: null,
};

let statusCache: AppIntentsSyncStatus = INITIAL_STATUS;
let lastFingerprint: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function getNativeModule(): NativeScheduleIntentsModule | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    return requireOptionalNativeModule<NativeScheduleIntentsModule>(
      "ScheduleIntents"
    );
  } catch {
    return null;
  }
}

/**
 * Indique si le module natif ScheduleIntents est présent et supporté (iOS 16.4+ dev build).
 */
export function isAppIntentsAvailable(): boolean {
  const mod = getNativeModule();
  return mod != null && mod.isSupported === true;
}

export function subscribeAppIntentsStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppIntentsStatusSnapshot(): AppIntentsSyncStatus {
  return statusCache;
}

/**
 * Sérialise l'emploi du temps filtré et l'écrit dans le stockage natif
 * utilisé hors ligne par Siri et Apple Raccourcis.
 */
export function syncScheduleIntents(
  courses: Course[],
  groupName: string,
  lastSyncMs: number | null,
  options: { force?: boolean } = {}
): boolean {
  if (!isAppIntentsAvailable()) {
    return false;
  }

  try {
    const mod = getNativeModule();
    if (!mod?.writeSnapshot) {
      return false;
    }

    const subjectDict = getSubjectDictionarySnapshot();
    const snapshot = buildScheduleIntentsSnapshot(
      courses,
      groupName,
      lastSyncMs,
      subjectDict
    );
    const fingerprint = getIntentsSnapshotFingerprint(snapshot);

    if (!options.force && lastFingerprint === fingerprint) {
      return true;
    }

    const ok = mod.writeSnapshot(JSON.stringify(snapshot));
    if (!ok) {
      statusCache = {
        ...statusCache,
        lastError:
          "Impossible d'écrire le cache natif pour Siri et Raccourcis.",
      };
      notifyListeners();
      return false;
    }

    lastFingerprint = fingerprint;
    statusCache = {
      lastSyncAt: Date.now(),
      courseCount: snapshot.courses.length,
      groupName: snapshot.groupName,
      lastError: null,
    };
    notifyListeners();
    return true;
  } catch (err) {
    console.warn("Erreur synchronisation App Intents:", err);
    statusCache = {
      ...statusCache,
      lastError: String((err as Error)?.message ?? err),
    };
    notifyListeners();
    return false;
  }
}

/**
 * Ouvre l'application Raccourcis d'Apple sur iOS.
 */
export function openIosShortcutsApp(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }

  const mod = getNativeModule();
  if (mod?.openShortcutsApp) {
    try {
      return mod.openShortcutsApp();
    } catch {
      // Repli ci-dessous via Linking
    }
  }

  void Linking.openURL("shortcuts://").catch(() => {});
  return true;
}
