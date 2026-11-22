import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

import type { AccentPreset } from "@/constants/theme";
import type { Course } from "@/lib/ics";
import { getSubjectDictionarySnapshot } from "@/lib/subject-names";
import { buildWidgetTimelines } from "@/lib/widget-timeline";

type LoadedWidgets = {
  nextCourse: typeof import("@/widgets/next-course-widget").default;
  dayAgenda: typeof import("@/widgets/day-agenda-widget").default;
  weekOverview: typeof import("@/widgets/week-overview-widget").default;
};

let widgetsPromise: Promise<LoadedWidgets> | null = null;
let lastWidgetSyncAt: number | null = null;
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
  return lastWidgetSyncAt;
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
 * Calcule la timeline hors-ligne depuis le cache ICS et pousse les entrées
 * vers les 3 widgets WidgetKit iOS. Ne fait rien hors development build iOS.
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

    lastWidgetSyncAt = Date.now();
    notifyWidgetSyncListeners();
    return true;
  } catch (err) {
    console.warn("Impossible de synchroniser les widgets iOS:", err);
    return false;
  }
}
