import { requireOptionalNativeModule } from "expo";
import type { LiveActivityFactory } from "expo-widgets";
import { Platform } from "react-native";

import type { AccentPreset } from "@/constants/theme";
import type { Course } from "@/lib/geii-api";
import {
  type CourseLiveActivityProps,
  type LiveActivityPhase,
  type LiveActivityTarget,
  buildLiveActivityProps,
  getLiveActivityFingerprint,
} from "@/lib/live-activity-payload";
import { getSubjectDictionarySnapshot } from "@/lib/subject-names";

export type LiveActivityStatus = {
  isActive: boolean;
  activityId: string | null;
  courseKey: string | null;
  courseTitle: string | null;
  phase: LiveActivityPhase | null;
  isManualPin: boolean;
  lastUpdatedAt: number | null;
  lastError: string | null;
};

export type SyncCourseLiveActivityParams = {
  enabled: boolean;
  target: LiveActivityTarget | null;
  allCourses: Course[];
  accentPreset: AccentPreset;
  useOledDark?: boolean;
  allowStart?: boolean;
  nowMs?: number;
};

type CourseLiveActivityFactory = LiveActivityFactory<CourseLiveActivityProps>;

const INITIAL_STATUS: LiveActivityStatus = {
  isActive: false,
  activityId: null,
  courseKey: null,
  courseTitle: null,
  phase: null,
  isManualPin: false,
  lastUpdatedAt: null,
  lastError: null,
};

let factoryPromise: Promise<CourseLiveActivityFactory> | null = null;
let syncQueue: Promise<boolean> = Promise.resolve(false);
let lastFingerprint: string | null = null;
let liveActivityStatus: LiveActivityStatus = INITIAL_STATUS;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Vérifie sans crasher si ActivityKit / ExpoWidgets est disponible (iOS dev build).
 * Retourne false dans Expo Go, sur Web et sur Android.
 */
export function isLiveActivityAvailable(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    return requireOptionalNativeModule("ExpoWidgets") != null;
  } catch {
    return false;
  }
}

export function subscribeLiveActivityStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveActivityStatusSnapshot(): LiveActivityStatus {
  return liveActivityStatus;
}

async function loadFactory(): Promise<CourseLiveActivityFactory> {
  if (!factoryPromise) {
    factoryPromise = import("@/widgets/course-live-activity").then(
      (mod) => mod.default
    );
  }
  try {
    return await factoryPromise;
  } catch (err) {
    factoryPromise = null;
    throw err;
  }
}

function formatActivityKitError(err: unknown): string {
  const raw = String((err as Error)?.message ?? err ?? "");
  const lower = raw.toLowerCase();
  if (
    lower.includes("areactivitiesenabled") ||
    lower.includes("not supported") ||
    lower.includes("disabled") ||
    lower.includes("authorization")
  ) {
    return "Activités en direct désactivées dans Réglages iOS > EDT > Activités en direct.";
  }
  if (lower.includes("visibility")) {
    return "Impossible de démarrer une Live Activity lorsque l'app est en arrière-plan.";
  }
  return raw || "Erreur inconnue ActivityKit.";
}

async function endAllActiveInstances(
  factory: CourseLiveActivityFactory
): Promise<void> {
  const instances = factory.getInstances();
  for (const instance of instances) {
    try {
      await instance.end("immediate");
    } catch {
      // Ignorer une activité déjà expirée côté système
    }
  }
}

async function performSyncCourseLiveActivity(
  params: SyncCourseLiveActivityParams
): Promise<boolean> {
  if (!isLiveActivityAvailable()) {
    return false;
  }

  const {
    enabled,
    target,
    allCourses,
    accentPreset,
    useOledDark = false,
    allowStart = true,
    nowMs = Date.now(),
  } = params;

  try {
    const factory = await loadFactory();

    if (!enabled || !target) {
      await endAllActiveInstances(factory);
      lastFingerprint = null;
      liveActivityStatus = {
        ...INITIAL_STATUS,
        lastUpdatedAt: liveActivityStatus.isActive
          ? Date.now()
          : liveActivityStatus.lastUpdatedAt,
      };
      notifyListeners();
      return false;
    }

    const instances = factory.getInstances();
    if (instances.length > 1) {
      for (const extra of instances.slice(1)) {
        try {
          await extra.end("immediate");
        } catch {
          // Ignorer
        }
      }
    }

    const subjectDict = getSubjectDictionarySnapshot();
    const props = buildLiveActivityProps(
      target,
      allCourses,
      subjectDict,
      accentPreset,
      useOledDark,
      nowMs
    );
    const fingerprint = getLiveActivityFingerprint(
      props,
      target.staleDate.getTime()
    );

    if (instances.length >= 1) {
      const current = instances[0];
      if (lastFingerprint !== fingerprint) {
        await current.update(props, target.staleDate);
        lastFingerprint = fingerprint;
      }
      liveActivityStatus = {
        isActive: true,
        activityId: current.getId(),
        courseKey: target.course.key,
        courseTitle: props.title,
        phase: target.phase,
        isManualPin: target.isManualPin,
        lastUpdatedAt: Date.now(),
        lastError: null,
      };
      notifyListeners();
      return true;
    }

    if (!allowStart) {
      lastFingerprint = null;
      liveActivityStatus = INITIAL_STATUS;
      notifyListeners();
      return false;
    }

    const created = factory.start(props, "geiiedt://", target.staleDate);
    lastFingerprint = fingerprint;
    liveActivityStatus = {
      isActive: true,
      activityId: created.getId(),
      courseKey: target.course.key,
      courseTitle: props.title,
      phase: target.phase,
      isManualPin: target.isManualPin,
      lastUpdatedAt: Date.now(),
      lastError: null,
    };
    notifyListeners();
    return true;
  } catch (err) {
    console.warn("Impossible de synchroniser la Live Activity iOS:", err);
    liveActivityStatus = {
      ...liveActivityStatus,
      isActive: false,
      lastError: formatActivityKitError(err),
    };
    notifyListeners();
    return false;
  }
}

/**
 * Synchronise la Live Activity iOS en sérialisant les appels concurrents
 * (`start` / `update` / `end`) pour éviter toute course ActivityKit.
 */
export function syncCourseLiveActivity(
  params: SyncCourseLiveActivityParams
): Promise<boolean> {
  const nextRun = syncQueue
    .catch(() => false)
    .then(() => performSyncCourseLiveActivity(params));
  syncQueue = nextRun;
  return nextRun;
}

/**
 * Arrête immédiatement toute Live Activity en cours et réinitialise le statut.
 */
export async function stopCourseLiveActivity(): Promise<void> {
  if (!isLiveActivityAvailable()) {
    return;
  }

  const nextRun = syncQueue
    .catch(() => false)
    .then(async () => {
      try {
        const factory = await loadFactory();
        await endAllActiveInstances(factory);
        lastFingerprint = null;
        liveActivityStatus = {
          ...INITIAL_STATUS,
          lastUpdatedAt: Date.now(),
        };
        notifyListeners();
      } catch (err) {
        console.warn("Erreur arrêt Live Activity iOS:", err);
      }
      return false;
    });

  syncQueue = nextRun;
  await nextRun;
}
