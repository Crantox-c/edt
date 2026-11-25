import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useFiltersContext } from "@/hooks/use-filters";
import { useLiveActivity } from "@/hooks/use-live-activity";
import { useNotifications } from "@/hooks/use-notifications";
import { useThemeContext } from "@/hooks/use-theme";
import { extractAvailableFilters, filterCourses } from "@/lib/filters";
import {
  Course,
  CourseChanges,
  DEFAULT_API_BASE,
  DEFAULT_GROUP,
  DEFAULT_GROUP_ID,
  FALLBACK_FLAT_GROUPS,
  FlatGroup,
  PRELOAD_WEEK_OFFSETS,
  STALE_AFTER_MS,
  addDaysIso,
  fetchAndMergeWeek,
  fetchGroups,
  getParisMondayIso,
  isSyncStale,
  loadApiBaseUrl,
  loadCachedGroupEvents,
  loadCachedGroups,
  loadSelectedGroupId,
  normalizeBaseUrl,
  saveApiBaseUrl,
  saveSelectedGroupId,
  syncGroupSchedule,
} from "@/lib/geii-api";
import { haptics } from "@/lib/haptics";
import { syncScheduleIntents } from "@/lib/intents-sync";
import {
  type ScheduleChangeBatch,
  appendChangeBatch,
  clearChangeHistory,
  countUnreadChanges,
  getUrgent48hChanges,
  hasUnreadUrgentChanges,
  loadChangeHistory,
  markChangeHistoryRead,
} from "@/lib/change-history";
import { notifyUrgentScheduleChanges } from "@/lib/notifications";
import {
  getSubjectDictionarySnapshot,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";
import { syncWidgetsFromSchedule } from "@/lib/widget-sync";

export type ScheduleContextValue = {
  groups: FlatGroup[];
  activeGroup: FlatGroup;
  apiBaseUrl: string;
  courses: Course[];
  filteredCourses: Course[];
  lastSync: number | null;
  isSyncing: boolean;
  loadingWeek: string | null;
  error: string | null;
  changes: CourseChanges;
  changeHistory: ScheduleChangeBatch[];
  unreadChangesCount: number;
  hasUnreadUrgent: boolean;
  modifiedKeys: Set<string>;
  isStale: boolean;
  refresh: () => Promise<void>;
  selectGroup: (groupId: string) => Promise<void>;
  ensureWeekLoaded: (mondayIso: string) => Promise<void>;
  updateApiBaseUrl: (nextBaseUrl: string) => Promise<void>;
  refreshWidgets: () => Promise<boolean>;
  refreshAppIntents: () => boolean;
  markChangesRead: () => Promise<void>;
  clearChangesHistory: () => Promise<void>;
  notifications: ReturnType<typeof useNotifications>;
  liveActivity: ReturnType<typeof useLiveActivity>;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

function resolveGroupById(list: FlatGroup[], id: string): FlatGroup {
  return (
    list.find((g) => g.id === id) ??
    list.find((g) => g.id === DEFAULT_GROUP_ID) ??
    list[0] ??
    DEFAULT_GROUP
  );
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentPreset } = useThemeContext();
  const isOled = theme.name === "oled";
  const nowMs = useCurrentTime();
  const { criteria, isLoaded: filtersLoaded } = useFiltersContext();

  const [groups, setGroups] = useState<FlatGroup[]>(FALLBACK_FLAT_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState<string>(DEFAULT_GROUP_ID);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(DEFAULT_API_BASE);

  const [courses, setCourses] = useState<Course[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [loadingWeek, setLoadingWeek] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<CourseChanges>({ added: [], removed: [] });
  const [changeHistory, setChangeHistory] = useState<ScheduleChangeBatch[]>([]);

  const persistentCriteria = useMemo(
    () => ({ ...criteria, searchQuery: "" }),
    [criteria]
  );
  const availableFilters = useMemo(
    () => extractAvailableFilters(courses),
    [courses]
  );
  const effectiveCourses = useMemo(
    () => filterCourses(courses, persistentCriteria, availableFilters),
    [courses, persistentCriteria, availableFilters]
  );

  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const syncGenRef = useRef(0);
  const syncAbortRef = useRef<AbortController | null>(null);
  const groupsRef = useRef<FlatGroup[]>(FALLBACK_FLAT_GROUPS);
  const activeGroupIdRef = useRef<string>(DEFAULT_GROUP_ID);
  const apiBaseUrlRef = useRef<string>(DEFAULT_API_BASE);
  const loadedMondaysRef = useRef<Set<string>>(new Set());
  const inFlightMondaysRef = useRef<Set<string>>(new Set());
  const pendingWeekRef = useRef<string | null>(null);
  const latestWidgetInputsRef = useRef({
    courses: effectiveCourses,
    lastSync,
    accentPreset,
    isOled,
    filtersLoaded,
  });

  useEffect(() => {
    latestWidgetInputsRef.current = {
      courses: effectiveCourses,
      lastSync,
      accentPreset,
      isOled,
      filtersLoaded,
    };
  }, [effectiveCourses, lastSync, accentPreset, isOled, filtersLoaded]);

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const persistentCriteriaRef = useRef(persistentCriteria);
  const subjectDictRef = useRef(subjectDict);
  useEffect(() => {
    persistentCriteriaRef.current = persistentCriteria;
    subjectDictRef.current = subjectDict;
  }, [persistentCriteria, subjectDict]);

  const activeGroup = useMemo(
    () => resolveGroupById(groups, activeGroupId),
    [groups, activeGroupId]
  );

  // Gestionnaire de notifications partagé sur la classe active et les filtres persistants
  const notifications = useNotifications(effectiveCourses);
  const notifSettingsRef = useRef(notifications.settings);
  useEffect(() => {
    notifSettingsRef.current = notifications.settings;
  }, [notifications.settings]);

  // Gestionnaire de Live Activity & Dynamic Island (iOS)
  const liveActivity = useLiveActivity({
    courses: effectiveCourses,
    accentPreset,
    isOled,
    nowMs,
    filtersLoaded,
  });

  const ensureWeekLoadedInternal = useCallback(
    async (group: FlatGroup, baseUrl: string, mondayIso: string, gen: number) => {
      if (!mondayIso) return;
      if (
        loadedMondaysRef.current.has(mondayIso) ||
        inFlightMondaysRef.current.has(mondayIso)
      ) {
        return;
      }

      inFlightMondaysRef.current.add(mondayIso);
      if (mountedRef.current) {
        setLoadingWeek(mondayIso);
      }

      try {
        const updatedCache = await fetchAndMergeWeek(group, mondayIso, baseUrl);
        if (!mountedRef.current || syncGenRef.current !== gen) return;
        loadedMondaysRef.current = new Set(updatedCache.loadedMondays);
        setCourses(updatedCache.courses);
        setLastSync(updatedCache.lastSync);
      } catch (e) {
        // On ne signale pas d'erreur bloquante si du cache existe déjà sur d'autres semaines
        console.warn(`Erreur chargement semaine ${mondayIso}:`, e);
      } finally {
        inFlightMondaysRef.current.delete(mondayIso);
        if (mountedRef.current && syncGenRef.current === gen) {
          setLoadingWeek((prev) => (prev === mondayIso ? null : prev));
        }
      }
    },
    []
  );

  const syncGroup = useCallback(
    async (
      group: FlatGroup,
      baseUrl: string,
      options: { showLoading?: boolean; notifyHaptics?: boolean; refreshGroupList?: boolean } = {}
    ) => {
      const { showLoading = false, notifyHaptics = false, refreshGroupList = false } = options;

      syncAbortRef.current?.abort();
      const controller = new AbortController();
      syncAbortRef.current = controller;
      const gen = ++syncGenRef.current;

      if (showLoading && mountedRef.current) {
        setIsSyncing(true);
      }

      // Enregistrer les 8 semaines préchargées comme déjà en cours pour éviter les doubles fetchs
      const curMonday = getParisMondayIso(Date.now());
      const preloadMondays = PRELOAD_WEEK_OFFSETS.map((o) => addDaysIso(curMonday, o * 7));
      preloadMondays.forEach((m) => inFlightMondaysRef.current.add(m));

      const groupsPromise = refreshGroupList
        ? fetchGroups(baseUrl, controller.signal)
            .then((freshGroups) => {
              if (!mountedRef.current || controller.signal.aborted) return;
              groupsRef.current = freshGroups;
              setGroups(freshGroups);
            })
            .catch(() => {})
        : Promise.resolve();

      try {
        const [result] = await Promise.all([
          syncGroupSchedule(group, baseUrl, controller.signal),
          groupsPromise,
        ]);

        if (!mountedRef.current || syncGenRef.current !== gen || controller.signal.aborted) {
          return;
        }

        loadedMondaysRef.current = new Set(result.loadedMondays);
        setCourses(result.courses);
        setLastSync(result.lastSync);
        setChanges(result.changes);
        setError(result.error ?? null);

        if (result.changes.added.length > 0 || result.changes.removed.length > 0) {
          const hiddenSet = new Set(persistentCriteriaRef.current.hiddenSubjects);
          const filteredDiff: CourseChanges = {
            added: result.changes.added.filter((c) => !hiddenSet.has(c.subject)),
            removed: result.changes.removed.filter((c) => !hiddenSet.has(c.subject)),
          };
          if (filteredDiff.added.length > 0 || filteredDiff.removed.length > 0) {
            const { history, newBatch } = await appendChangeBatch(
              group.id,
              filteredDiff
            );
            if (
              mountedRef.current &&
              syncGenRef.current === gen &&
              activeGroupIdRef.current === group.id
            ) {
              setChangeHistory(history);
            }
            const urgent = getUrgent48hChanges(newBatch);
            if (urgent.length > 0) {
              void notifyUrgentScheduleChanges(
                urgent,
                notifSettingsRef.current,
                subjectDictRef.current
              );
            }
          }
        }

        if (notifyHaptics) {
          if (result.error) haptics.error();
          else haptics.success();
        }
      } catch (e) {
        if (!mountedRef.current || syncGenRef.current !== gen || controller.signal.aborted) {
          return;
        }
        setError(String((e as Error)?.message ?? e));
        if (notifyHaptics) {
          haptics.error();
        }
      } finally {
        preloadMondays.forEach((m) => inFlightMondaysRef.current.delete(m));
        if (mountedRef.current && syncGenRef.current === gen) {
          setIsSyncing(false);
        }
      }

      if (
        mountedRef.current &&
        syncGenRef.current === gen &&
        pendingWeekRef.current
      ) {
        const queued = pendingWeekRef.current;
        pendingWeekRef.current = null;
        await ensureWeekLoadedInternal(group, baseUrl, queued, gen);
      }
    },
    [ensureWeekLoadedInternal]
  );

  // 1. Hydratation initiale : charger config + cache instantané, puis synchro live
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const [savedBaseUrl, cachedGroups, savedGroupId] = await Promise.all([
        loadApiBaseUrl(),
        loadCachedGroups(),
        loadSelectedGroupId(),
      ]);

      if (!mountedRef.current) return;

      const effectiveGroups = cachedGroups ?? FALLBACK_FLAT_GROUPS;
      const initialGroup = resolveGroupById(effectiveGroups, savedGroupId);

      groupsRef.current = effectiveGroups;
      activeGroupIdRef.current = initialGroup.id;
      apiBaseUrlRef.current = savedBaseUrl;

      setGroups(effectiveGroups);
      setActiveGroupId(initialGroup.id);
      setApiBaseUrl(savedBaseUrl);

      const [cachedEvents, cachedHistory] = await Promise.all([
        loadCachedGroupEvents(initialGroup.id),
        loadChangeHistory(initialGroup.id),
      ]);
      if (!mountedRef.current) return;

      loadedMondaysRef.current = new Set(cachedEvents.loadedMondays);
      initializedRef.current = true;
      setChangeHistory(cachedHistory);

      if (cachedEvents.courses.length > 0) {
        setCourses(cachedEvents.courses);
        setLastSync(cachedEvents.lastSync);
        setIsSyncing(false);
      }

      await syncGroup(initialGroup, savedBaseUrl, {
        showLoading: cachedEvents.courses.length === 0,
        notifyHaptics: false,
        refreshGroupList: true,
      });
    }

    init();

    return () => {
      mountedRef.current = false;
      syncAbortRef.current?.abort();
    };
  }, [syncGroup]);

  // 2. Au retour au premier plan (Foreground / Active) & au passage en arrière-plan (Background)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && initializedRef.current) {
          const group = resolveGroupById(groupsRef.current, activeGroupIdRef.current);
          void syncGroup(group, apiBaseUrlRef.current, {
            showLoading: false,
            notifyHaptics: false,
            refreshGroupList: false,
          });
        } else if (nextState === "background" && initializedRef.current) {
          const snapshot = latestWidgetInputsRef.current;
          if (
            snapshot.filtersLoaded &&
            (snapshot.courses.length > 0 || snapshot.lastSync !== null)
          ) {
            void syncWidgetsFromSchedule(
              snapshot.courses,
              snapshot.lastSync,
              snapshot.accentPreset,
              snapshot.isOled
            );
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [syncGroup]);

  const refresh = useCallback(async () => {
    const group = resolveGroupById(groupsRef.current, activeGroupIdRef.current);
    await syncGroup(group, apiBaseUrlRef.current, {
      showLoading: true,
      notifyHaptics: true,
      refreshGroupList: true,
    });
  }, [syncGroup]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      const nextGroup = resolveGroupById(groupsRef.current, groupId);
      const gen = ++syncGenRef.current;
      syncAbortRef.current?.abort();
      inFlightMondaysRef.current.clear();
      pendingWeekRef.current = null;

      activeGroupIdRef.current = nextGroup.id;
      setActiveGroupId(nextGroup.id);
      setError(null);
      setChanges({ added: [], removed: [] });
      setChangeHistory([]);
      setLoadingWeek(null);
      await saveSelectedGroupId(nextGroup.id);

      const [cached, groupHistory] = await Promise.all([
        loadCachedGroupEvents(nextGroup.id),
        loadChangeHistory(nextGroup.id),
      ]);
      if (!mountedRef.current || syncGenRef.current !== gen) return;

      loadedMondaysRef.current = new Set(cached.loadedMondays);
      setCourses(cached.courses);
      setLastSync(cached.lastSync);
      setChangeHistory(groupHistory);
      setIsSyncing(cached.courses.length === 0);

      await syncGroup(nextGroup, apiBaseUrlRef.current, {
        showLoading: cached.courses.length === 0,
        notifyHaptics: false,
        refreshGroupList: false,
      });
    },
    [syncGroup]
  );

  const ensureWeekLoaded = useCallback(
    async (mondayIso: string) => {
      if (!mondayIso) return;
      if (!initializedRef.current) {
        pendingWeekRef.current = mondayIso;
        return;
      }
      const group = resolveGroupById(groupsRef.current, activeGroupIdRef.current);
      await ensureWeekLoadedInternal(
        group,
        apiBaseUrlRef.current,
        mondayIso,
        syncGenRef.current
      );
    },
    [ensureWeekLoadedInternal]
  );

  const updateApiBaseUrl = useCallback(
    async (nextBaseUrl: string) => {
      const normalized = normalizeBaseUrl(nextBaseUrl);
      await saveApiBaseUrl(normalized);
      apiBaseUrlRef.current = normalized;
      setApiBaseUrl(normalized);

      const group = resolveGroupById(groupsRef.current, activeGroupIdRef.current);
      await syncGroup(group, normalized, {
        showLoading: true,
        notifyHaptics: true,
        refreshGroupList: true,
      });
    },
    [syncGroup]
  );

  // 3. Synchroniser les widgets iOS dès que les cours filtrés, le thème ou le dictionnaire changent
  useEffect(() => {
    if (!filtersLoaded) return;
    if (effectiveCourses.length === 0 && lastSync === null) return;
    void syncWidgetsFromSchedule(
      effectiveCourses,
      lastSync,
      accentPreset,
      isOled
    );
  }, [effectiveCourses, lastSync, accentPreset, isOled, subjectDict, filtersLoaded]);

  const refreshWidgets = useCallback(
    () =>
      syncWidgetsFromSchedule(
        effectiveCourses,
        lastSync,
        accentPreset,
        isOled
      ),
    [effectiveCourses, lastSync, accentPreset, isOled]
  );

  // 4. Synchroniser le snapshot natif pour Siri & Raccourcis iOS
  useEffect(() => {
    if (!filtersLoaded) return;
    if (effectiveCourses.length === 0 && lastSync === null) return;
    syncScheduleIntents(effectiveCourses, activeGroup.text, lastSync);
  }, [
    effectiveCourses,
    activeGroup.text,
    lastSync,
    subjectDict,
    filtersLoaded,
  ]);

  const refreshAppIntents = useCallback(
    () =>
      syncScheduleIntents(effectiveCourses, activeGroup.text, lastSync, {
        force: true,
      }),
    [effectiveCourses, activeGroup.text, lastSync]
  );

  const markChangesRead = useCallback(async () => {
    const groupId = activeGroupIdRef.current;
    const nextHistory = await markChangeHistoryRead(groupId);
    if (mountedRef.current && activeGroupIdRef.current === groupId) {
      setChangeHistory(nextHistory);
    }
  }, []);

  const clearChangesHistory = useCallback(async () => {
    const groupId = activeGroupIdRef.current;
    await clearChangeHistory(groupId);
    if (mountedRef.current && activeGroupIdRef.current === groupId) {
      setChangeHistory([]);
      setChanges({ added: [], removed: [] });
    }
  }, []);

  const unreadChangesCount = useMemo(
    () => countUnreadChanges(changeHistory),
    [changeHistory]
  );

  const hasUnreadUrgent = useMemo(
    () => hasUnreadUrgentChanges(changeHistory),
    [changeHistory]
  );

  const modifiedKeys = useMemo(() => {
    const set = new Set<string>();
    changes.added.forEach((c) => set.add(c.key));
    for (const batch of changeHistory) {
      if (!batch.unread) continue;
      for (const item of batch.items) {
        if (item.kind !== "removed") {
          set.add(item.courseKey);
        }
      }
    }
    return set;
  }, [changes, changeHistory]);

  const isStale = isSyncStale(lastSync, STALE_AFTER_MS, nowMs);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      groups,
      activeGroup,
      apiBaseUrl,
      courses,
      filteredCourses: effectiveCourses,
      lastSync,
      isSyncing,
      loadingWeek,
      error,
      changes,
      changeHistory,
      unreadChangesCount,
      hasUnreadUrgent,
      modifiedKeys,
      isStale,
      refresh,
      selectGroup,
      ensureWeekLoaded,
      updateApiBaseUrl,
      refreshWidgets,
      refreshAppIntents,
      markChangesRead,
      clearChangesHistory,
      notifications,
      liveActivity,
    }),
    [
      groups,
      activeGroup,
      apiBaseUrl,
      courses,
      effectiveCourses,
      lastSync,
      isSyncing,
      loadingWeek,
      error,
      changes,
      changeHistory,
      unreadChangesCount,
      hasUnreadUrgent,
      modifiedKeys,
      isStale,
      refresh,
      selectGroup,
      ensureWeekLoaded,
      updateApiBaseUrl,
      refreshWidgets,
      refreshAppIntents,
      markChangesRead,
      clearChangesHistory,
      notifications,
      liveActivity,
    ]
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useSchedule doit être utilisé dans un ScheduleProvider");
  }
  return ctx;
}
