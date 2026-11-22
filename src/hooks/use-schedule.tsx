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
import { haptics } from "@/lib/haptics";
import { Course } from "@/lib/ics";
import { asyncStorageKV } from "@/lib/storage";
import {
  getSubjectDictionarySnapshot,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";
import {
  DEFAULT_ICS_URL,
  getCachedCourses,
  isStale,
  syncIcs,
  SyncResult,
} from "@/lib/sync";
import { syncWidgetsFromSchedule } from "@/lib/widget-sync";

const CUSTOM_URL_STORAGE_KEY = "ics:custom_url_v1";

let currentIcsUrl = DEFAULT_ICS_URL;
const urlListeners = new Set<(url: string) => void>();

export async function setCustomIcsUrl(nextUrl: string): Promise<void> {
  const clean = nextUrl.trim() || DEFAULT_ICS_URL;
  currentIcsUrl = clean;
  await asyncStorageKV.set(CUSTOM_URL_STORAGE_KEY, clean);
  urlListeners.forEach((l) => l(clean));
}

export type ScheduleContextValue = {
  icsUrl: string;
  updateUrl: (newUrl: string) => Promise<void>;
  courses: Course[];
  lastSync: number | null;
  isSyncing: boolean;
  error: string | null;
  changes: { added: Course[]; removed: Course[] };
  modifiedKeys: Set<string>;
  isStale: boolean;
  refresh: () => Promise<void>;
  refreshWidgets: () => Promise<boolean>;
  notifications: ReturnType<typeof useNotifications>;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { accentPreset, themeMode } = useThemeContext();
  const [icsUrl, setIcsUrlState] = useState<string>(currentIcsUrl);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<{ added: Course[]; removed: Course[] }>(
    { added: [], removed: [] }
  );
  const isSyncingRef = useRef(false);

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  // Un seul gestionnaire de notifications partagé pour toute l'application
  const notifications = useNotifications(courses);

  // Charger l'URL personnalisée éventuelle au démarrage
  useEffect(() => {
    let mounted = true;
    asyncStorageKV.get(CUSTOM_URL_STORAGE_KEY).then((saved) => {
      if (saved && saved.trim() && mounted) {
        currentIcsUrl = saved.trim();
        setIcsUrlState(saved.trim());
      }
    });
    const sub = (newUrl: string) => {
      if (mounted) setIcsUrlState(newUrl);
    };
    urlListeners.add(sub);
    return () => {
      mounted = false;
      urlListeners.delete(sub);
    };
  }, []);

  const performSync = useCallback(
    async (showLoading = false, targetUrl = icsUrl, notifyHaptics = false) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (showLoading) setIsSyncing(true);

      try {
        const result: SyncResult = await syncIcs(targetUrl, asyncStorageKV);
        setCourses(result.courses);
        setLastSync(result.lastSync);
        setChanges(result.changes);
        setError(result.error ?? null);

        if (notifyHaptics) {
          if (result.error) {
            haptics.error();
          } else {
            haptics.success();
          }
        }
      } catch (e) {
        setError(String((e as Error).message ?? e));
        if (notifyHaptics) {
          haptics.error();
        }
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [icsUrl]
  );

  // 1. Au montage ou changement d'URL : afficher le cache tout de suite, puis sync en arrière-plan
  useEffect(() => {
    let mounted = true;

    async function init() {
      let cachedCount = 0;
      try {
        const cached = await getCachedCourses(asyncStorageKV);
        if (mounted && cached.courses.length > 0) {
          cachedCount = cached.courses.length;
          setCourses(cached.courses);
          setLastSync(cached.lastSync);
        }
      } catch (e) {
        console.warn("Erreur lecture cache initial:", e);
      }

      if (mounted) {
        performSync(cachedCount === 0, icsUrl, false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [icsUrl, performSync]);

  // 2. Au retour au premier plan (Foreground / Active)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          performSync(false, icsUrl, false);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [icsUrl, performSync]);

  const refresh = useCallback(
    () => performSync(true, icsUrl, true),
    [performSync, icsUrl]
  );

  // 3. Synchroniser les widgets iOS dès que le cache, la synchro, le thème ou le dictionnaire changent
  useEffect(() => {
    if (courses.length === 0 && lastSync === null) return;
    void syncWidgetsFromSchedule(
      courses,
      lastSync,
      accentPreset,
      themeMode === "oled"
    );
  }, [courses, lastSync, accentPreset, themeMode, subjectDict]);

  const refreshWidgets = useCallback(
    () =>
      syncWidgetsFromSchedule(
        courses,
        lastSync,
        accentPreset,
        themeMode === "oled"
      ),
    [courses, lastSync, accentPreset, themeMode]
  );

  const updateUrl = useCallback(
    async (newUrl: string) => {
      await setCustomIcsUrl(newUrl);
      await performSync(true, newUrl.trim() || DEFAULT_ICS_URL, true);
    },
    [performSync]
  );

  const modifiedKeys = useMemo(() => {
    const set = new Set<string>();
    changes.added.forEach((c) => set.add(c.key));
    return set;
  }, [changes]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      icsUrl,
      updateUrl,
      courses,
      lastSync,
      isSyncing,
      error,
      changes,
      modifiedKeys,
      isStale: isStale(lastSync),
      refresh,
      refreshWidgets,
      notifications,
    }),
    [
      icsUrl,
      updateUrl,
      courses,
      lastSync,
      isSyncing,
      error,
      changes,
      modifiedKeys,
      refresh,
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
