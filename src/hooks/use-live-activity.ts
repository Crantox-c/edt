import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { AccentPreset } from "@/constants/theme";
import type { Course } from "@/lib/geii-api";
import {
  type LiveActivityTarget,
  selectLiveActivityTarget,
  selectNextCourseForManualStart,
} from "@/lib/live-activity-payload";
import {
  useLiveActivitySettings,
  type LiveActivitySettings,
} from "@/lib/live-activity-settings";
import {
  getLiveActivityStatusSnapshot,
  isLiveActivityAvailable,
  type LiveActivityStatus,
  stopCourseLiveActivity,
  subscribeLiveActivityStatus,
  syncCourseLiveActivity,
} from "@/lib/live-activity-sync";
import {
  getSubjectDictionarySnapshot,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type UseLiveActivityParams = {
  courses: Course[];
  accentPreset: AccentPreset;
  isOled: boolean;
  nowMs: number;
  filtersLoaded: boolean;
};

export type LiveActivityController = {
  available: boolean;
  settings: LiveActivitySettings;
  isLoaded: boolean;
  status: LiveActivityStatus;
  updateSettings: (partial: Partial<LiveActivitySettings>) => void;
  startForCourse: (course: Course) => Promise<boolean>;
  startForNextCourse: () => Promise<boolean>;
  stop: () => Promise<void>;
};

export function useLiveActivity({
  courses,
  accentPreset,
  isOled,
  nowMs,
  filtersLoaded,
}: UseLiveActivityParams): LiveActivityController {
  const available = isLiveActivityAvailable();
  const { settings, isLoaded: settingsLoaded, updateSettings } =
    useLiveActivitySettings();

  const status = useSyncExternalStore(
    subscribeLiveActivityStatus,
    getLiveActivityStatusSnapshot,
    getLiveActivityStatusSnapshot
  );

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const [manualCourseKey, setManualCourseKey] = useState<string | null>(null);
  const manualCourseKeyRef = useRef<string | null>(null);

  const effectiveManualKey = useMemo(() => {
    if (!settings.enabled || !manualCourseKey) {
      return null;
    }
    const existsAndFuture = courses.some(
      (c) => c.key === manualCourseKey && c.end > nowMs
    );
    return existsAndFuture ? manualCourseKey : null;
  }, [settings.enabled, manualCourseKey, courses, nowMs]);

  useEffect(() => {
    manualCourseKeyRef.current = effectiveManualKey;
  }, [effectiveManualKey]);

  const handleUpdateSettings = useCallback(
    (partial: Partial<LiveActivitySettings>) => {
      if (partial.enabled === false) {
        manualCourseKeyRef.current = null;
        setManualCourseKey(null);
      }
      updateSettings(partial);
    },
    [updateSettings]
  );

  const target = useMemo(
    () =>
      selectLiveActivityTarget(
        courses,
        nowMs,
        settings.leadTimeMinutes,
        effectiveManualKey
      ),
    [courses, nowMs, settings.leadTimeMinutes, effectiveManualKey]
  );

  const latestSyncInputRef = useRef({
    courses,
    accentPreset,
    isOled,
    enabled: settings.enabled,
    leadTimeMinutes: settings.leadTimeMinutes,
    settingsLoaded,
    filtersLoaded,
  });

  useEffect(() => {
    latestSyncInputRef.current = {
      courses,
      accentPreset,
      isOled,
      enabled: settings.enabled,
      leadTimeMinutes: settings.leadTimeMinutes,
      settingsLoaded,
      filtersLoaded,
    };
  }, [
    courses,
    accentPreset,
    isOled,
    settings.enabled,
    settings.leadTimeMinutes,
    settingsLoaded,
    filtersLoaded,
  ]);

  // Synchronisation automatique dès qu'un paramètre, un cours, le thème ou le temps change
  useEffect(() => {
    if (!available || !settingsLoaded || !filtersLoaded) {
      return;
    }
    void syncCourseLiveActivity({
      enabled: settings.enabled,
      target,
      allCourses: courses,
      accentPreset,
      useOledDark: isOled,
      allowStart: AppState.currentState === "active",
      nowMs,
    });
  }, [
    available,
    settingsLoaded,
    filtersLoaded,
    settings.enabled,
    target,
    courses,
    accentPreset,
    isOled,
    subjectDict,
    nowMs,
  ]);

  // Re-synchroniser au retour au premier plan pour mettre à jour ou démarrer l'activité
  useEffect(() => {
    if (!available) return;

    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState !== "active") return;
        const latest = latestSyncInputRef.current;
        if (!latest.settingsLoaded || !latest.filtersLoaded) return;

        const now = Date.now();
        const nextTarget = selectLiveActivityTarget(
          latest.courses,
          now,
          latest.leadTimeMinutes,
          manualCourseKeyRef.current
        );

        void syncCourseLiveActivity({
          enabled: latest.enabled,
          target: nextTarget,
          allCourses: latest.courses,
          accentPreset: latest.accentPreset,
          useOledDark: latest.isOled,
          allowStart: true,
          nowMs: now,
        });
      }
    );

    return () => {
      sub.remove();
    };
  }, [available]);

  const startForCourse = useCallback(
    async (course: Course): Promise<boolean> => {
      if (!available) return false;
      const now = Date.now();
      if (course.end <= now) return false;

      if (!settings.enabled) {
        updateSettings({ enabled: true });
      }

      const isCurrent = course.start <= now;
      const pinnedTarget: LiveActivityTarget = {
        course,
        phase: isCurrent ? "active" : "upcoming",
        staleDate: new Date(isCurrent ? course.end : course.start),
        isManualPin: true,
      };

      manualCourseKeyRef.current = course.key;
      setManualCourseKey(course.key);

      return syncCourseLiveActivity({
        enabled: true,
        target: pinnedTarget,
        allCourses: courses,
        accentPreset,
        useOledDark: isOled,
        allowStart: true,
        nowMs: now,
      });
    },
    [available, settings.enabled, updateSettings, courses, accentPreset, isOled]
  );

  const startForNextCourse = useCallback(async (): Promise<boolean> => {
    if (!available) return false;
    const now = Date.now();
    const nextTarget = selectNextCourseForManualStart(courses, now);
    if (!nextTarget) {
      return false;
    }

    if (!settings.enabled) {
      updateSettings({ enabled: true });
    }

    manualCourseKeyRef.current = nextTarget.course.key;
    setManualCourseKey(nextTarget.course.key);

    return syncCourseLiveActivity({
      enabled: true,
      target: nextTarget,
      allCourses: courses,
      accentPreset,
      useOledDark: isOled,
      allowStart: true,
      nowMs: now,
    });
  }, [available, settings.enabled, updateSettings, courses, accentPreset, isOled]);

  const stop = useCallback(async (): Promise<void> => {
    manualCourseKeyRef.current = null;
    setManualCourseKey(null);
    await stopCourseLiveActivity();
  }, []);

  return useMemo(
    () => ({
      available,
      settings,
      isLoaded: settingsLoaded,
      status,
      updateSettings: handleUpdateSettings,
      startForCourse,
      startForNextCourse,
      stop,
    }),
    [
      available,
      settings,
      settingsLoaded,
      status,
      handleUpdateSettings,
      startForCourse,
      startForNextCourse,
      stop,
    ]
  );
}
