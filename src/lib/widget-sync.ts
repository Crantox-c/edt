import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

import type { AccentPreset } from "@/constants/theme";
import type { Course } from "@/lib/geii-api";
import { getSubjectDictionarySnapshot } from "@/lib/subject-names";
import { buildWidgetTimelines } from "@/lib/widget-timeline";

type LoadedWidgets = {
  nextCourse: typeof import("@/widgets/next-course-widget").default;
  dayAgenda: typeof import("@/widgets/day-agenda-widget").default;
  weekOverview: typeof import("@/widgets/week-overview-widget").default;
};

type NativeExpoWidgetsModule = {
  widgetsDirectory?: string | null;
  reloadAllWidgets?: () => void;
};

export type WidgetSyncStatus = {
  lastSyncAt: number | null;
  entryCount: number;
  appGroupAccessible: boolean | null;
  lastError: string | null;
};

let widgetsPromise: Promise<LoadedWidgets> | null = null;
let widgetSyncStatus: WidgetSyncStatus = {
  lastSyncAt: null,
  entryCount: 0,
  appGroupAccessible: null,
  lastError: null,
};
const syncListeners = new Set<() => void>();

function notifyWidgetSyncListeners(): void {
  syncListeners.forEach((listener) => listener());
}

/**
 * Vérifie sans crasher si le module natif ExpoWidgets est présent (iOS dev build).
 * Dans Expo Go, Web ou Android, retourne false avant tout import de expo-widgets.
 */
export function isWidgetsAvailable(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    return requireOptionalNativeModule("ExpoWidgets") != null;
  } catch {
    return false;
  }
}

export function subscribeWidgetSync(listener: () => void): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getLastWidgetSyncSnapshot(): number | null {
  return widgetSyncStatus.lastSyncAt;
}

export function getWidgetSyncStatusSnapshot(): WidgetSyncStatus {
  return widgetSyncStatus;
}

async function loadWidgets(): Promise<LoadedWidgets> {
  if (!widgetsPromise) {
    widgetsPromise = Promise.all([
      import("@/widgets/next-course-widget"),
      import("@/widgets/day-agenda-widget"),
      import("@/widgets/week-overview-widget"),
    ]).then(([nextMod, dayMod, weekMod]) => ({
      nextCourse: nextMod.default,
      dayAgenda: dayMod.default,
      weekOverview: weekMod.default,
    }));
  }
  try {
    return await widgetsPromise;
  } catch (err) {
    widgetsPromise = null;
    throw err;
  }
}

/**
 * Calcule la timeline hors-ligne depuis le cache local GEII, pousse les entrées
 * vers les 3 widgets WidgetKit iOS et vérifie l'accès au conteneur App Group partagé.
 */
export async function syncWidgetsFromSchedule(
  courses: Course[],
  lastSync: number | null,
  accentPreset: AccentPreset,
  useOledDark = false
): Promise<boolean> {
  if (!isWidgetsAvailable()) {
    return false;
  }

  try {
    const nativeModule =
      requireOptionalNativeModule<NativeExpoWidgetsModule>("ExpoWidgets");
    const widgets = await loadWidgets();
    const subjectDict = getSubjectDictionarySnapshot();
    const payload = buildWidgetTimelines(
      courses,
      lastSync,
      subjectDict,
      accentPreset,
      useOledDark
    );

    widgets.nextCourse.updateTimeline(payload.nextCourseEntries);
    widgets.dayAgenda.updateTimeline(payload.dayAgendaEntries);
    widgets.weekOverview.updateTimeline(payload.weekOverviewEntries);
    nativeModule?.reloadAllWidgets?.();

    const appGroupAccessible =
      nativeModule != null ? nativeModule.widgetsDirectory != null : null;

    if (appGroupAccessible === false) {
      widgetSyncStatus = {
        lastSyncAt: null,
        entryCount: 0,
        appGroupAccessible: false,
        lastError:
          "Conteneur App Group partagé inaccessible : l'app a été signée sans App Group partagé entre l'app et les widgets.",
      };
      notifyWidgetSyncListeners();
      return false;
    }

    let confirmedCount = payload.dayAgendaEntries.length;
    try {
      const persisted = await widgets.dayAgenda.getTimeline();
      if (persisted.length === 0 && payload.dayAgendaEntries.length > 0) {
        widgetSyncStatus = {
          lastSyncAt: null,
          entryCount: 0,
          appGroupAccessible,
          lastError:
            "Les entrées widget n'ont pas pu être relues depuis le stockage partagé App Group.",
        };
        notifyWidgetSyncListeners();
        return false;
      }
      confirmedCount = persisted.length;
    } catch {
      // Si getTimeline échoue ponctuellement mais widgetsDirectory est accessible, garder payload count
    }

    widgetSyncStatus = {
      lastSyncAt: Date.now(),
      entryCount: confirmedCount,
      appGroupAccessible,
      lastError: null,
    };
    notifyWidgetSyncListeners();
    return true;
  } catch (err) {
    console.warn("Impossible de synchroniser les widgets iOS:", err);
    widgetSyncStatus = {
      ...widgetSyncStatus,
      lastError: String((err as Error)?.message ?? err),
    };
    notifyWidgetSyncListeners();
    return false;
  }
}
