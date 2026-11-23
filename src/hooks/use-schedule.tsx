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
import { useNotifications } from "@/hooks/use-notifications";
import { useThemeContext } from "@/hooks/use-theme";
import {
  Course,
  CourseChanges,
  DEFAULT_API_BASE,
  DEFAULT_GROUP,
  DEFAULT_GROUP_ID,
  FALLBACK_FLAT_GROUPS,
  FlatGroup,
  PRELOAD_WEEK_OFFSETS,
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
  lastSync: number | null;
  isSyncing: boolean;
  loadingWeek: string | null;
  error: string | null;
  changes: CourseChanges;
  modifiedKeys: Set<string>;
  isStale: boolean;
  refresh: () => Promise<void>;
  selectGroup: (groupId: string) => Promise<void>;
  ensureWeekLoaded: (mondayIso: string) => Promise<void>;
  updateApiBaseUrl: (nextBaseUrl: string) => Promise<void>;
  refreshWidgets: () => Promise<boolean>;
  notifications: ReturnType<typeof useNotifications>;
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

  const [groups, setGroups] = useState<FlatGroup[]>(FALLBACK_FLAT_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState<string>(DEFAULT_GROUP_ID);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(DEFAULT_API_BASE);

  const [courses, setCourses] = useState<Course[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [loadingWeek, setLoadingWeek] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<CourseChanges>({ added: [], removed: [] });

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

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const activeGroup = useMemo(
    () => resolveGroupById(groups, activeGroupId),
    [groups, activeGroupId]
  );

  // Gestionnaire de notifications partagé sur la classe active
  const notifications = useNotifications(courses);

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

      const cachedEvents = await loadCachedGroupEvents(initialGroup.id);
      if (!mountedRef.current) return;

      loadedMondaysRef.current = new Set(cachedEvents.loadedMondays);
      initializedRef.current = true;

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

  // 2. Au retour au premier plan (Foreground / Active)
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
      setLoadingWeek(null);
      await saveSelectedGroupId(nextGroup.id);

      const cached = await loadCachedGroupEvents(nextGroup.id);
      if (!mountedRef.current || syncGenRef.current !== gen) return;

      loadedMondaysRef.current = new Set(cached.loadedMondays);
      setCourses(cached.courses);
      setLastSync(cached.lastSync);
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

  // 3. Synchroniser les widgets iOS dès que les cours, le thème ou le dictionnaire changent
  useEffect(() => {
    if (courses.length === 0 && lastSync === null) return;
    void syncWidgetsFromSchedule(courses, lastSync, accentPreset, isOled);
  }, [courses, lastSync, accentPreset, isOled, subjectDict]);

  const refreshWidgets = useCallback(
    () => syncWidgetsFromSchedule(courses, lastSync, accentPreset, isOled),
    [courses, lastSync, accentPreset, isOled]
  );

  const modifiedKeys = useMemo(() => {
    const set = new Set<string>();
    changes.added.forEach((c) => set.add(c.key));
    return set;
  }, [changes]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      groups,
      activeGroup,
      apiBaseUrl,
      courses,
      lastSync,
      isSyncing,
      loadingWeek,
      error,
      changes,
      modifiedKeys,
      isStale: isSyncStale(lastSync),
      refresh,
      selectGroup,
      ensureWeekLoaded,
      updateApiBaseUrl,
      refreshWidgets,
      notifications,
    }),
    [
      groups,
      activeGroup,
      apiBaseUrl,
      courses,
      lastSync,
      isSyncing,
      loadingWeek,
      error,
      changes,
      modifiedKeys,
      refresh,
      selectGroup,
      ensureWeekLoaded,
      updateApiBaseUrl,
      refreshWidgets,
      notifications,
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
