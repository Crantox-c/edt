import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Course } from "@/lib/ics";
import {
  DEFAULT_ICS_URL,
  getCachedCourses,
  isStale,
  syncIcs,
  SyncResult,
} from "@/lib/sync";
import { asyncStorageKV } from "@/lib/storage";

export function useSchedule(url = DEFAULT_ICS_URL) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const performSync = useCallback(
    async (showLoading = false) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (showLoading) setIsSyncing(true);

      try {
        const result: SyncResult = await syncIcs(url, asyncStorageKV);
        setCourses(result.courses);
        setLastSync(result.lastSync);
        setError(result.error ?? null);
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [url]
  );

  // 1. Au montage de l'application :
  // Afficher immédiatement les cours en cache (sans attendre le réseau)
  // puis synchroniser en arrière-plan.
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
        performSync(cachedCount === 0);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [performSync]);

  // 2. Au retour au premier plan (Foreground / Active)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          performSync(false);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [performSync]);

  const refresh = useCallback(() => performSync(true), [performSync]);

  return {
    courses,
    lastSync,
    isSyncing,
    error,
    isStale: isStale(lastSync),
    refresh,
  };
}
