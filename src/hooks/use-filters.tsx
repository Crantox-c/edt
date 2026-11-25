import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AvailableFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  extractAvailableFilters,
  filterCourses,
  FilterCriteria,
} from "@/lib/filters";
import { Course } from "@/lib/geii-api";

const FILTERS_STORAGE_KEY = "schedule:filters_v1";

type FiltersContextValue = {
  criteria: FilterCriteria;
  isLoaded: boolean;
  setSearchQuery: (query: string) => void;
  updateCriteria: (
    updater: Partial<FilterCriteria> | ((prev: FilterCriteria) => FilterCriteria)
  ) => void;
  toggleHiddenSubject: (subject: string) => void;
  resetFilters: () => void;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

async function persistFilters(nextCriteria: FilterCriteria): Promise<void> {
  try {
    const toPersist = {
      selectedPromo: nextCriteria.selectedPromo,
      selectedKind: nextCriteria.selectedKind,
      selectedSubject: nextCriteria.selectedSubject,
      selectedTeacher: nextCriteria.selectedTeacher,
      selectedTag: nextCriteria.selectedTag,
      selectedRoom: nextCriteria.selectedRoom,
      selectedFloor: nextCriteria.selectedFloor,
      hiddenSubjects: nextCriteria.hiddenSubjects,
    };
    await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toPersist));
  } catch (e) {
    console.warn("Erreur sauvegarde filtres:", e);
  }
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);
  const criteriaRef = useRef<FilterCriteria>(DEFAULT_FILTERS);

  useEffect(() => {
    let mounted = true;

    async function loadSavedFilters() {
      try {
        const raw = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as Partial<FilterCriteria>;
          const hydrated: FilterCriteria = {
            ...DEFAULT_FILTERS,
            selectedPromo:
              typeof parsed.selectedPromo === "string"
                ? parsed.selectedPromo
                : null,
            selectedKind:
              typeof parsed.selectedKind === "string"
                ? parsed.selectedKind
                : null,
            selectedSubject:
              typeof parsed.selectedSubject === "string"
                ? parsed.selectedSubject
                : null,
            selectedTeacher:
              typeof parsed.selectedTeacher === "string"
                ? parsed.selectedTeacher
                : null,
            selectedTag:
              typeof parsed.selectedTag === "string"
                ? parsed.selectedTag
                : null,
            selectedRoom:
              typeof parsed.selectedRoom === "string"
                ? parsed.selectedRoom
                : null,
            selectedFloor:
              typeof parsed.selectedFloor === "string"
                ? parsed.selectedFloor
                : null,
            hiddenSubjects: Array.isArray(parsed.hiddenSubjects)
              ? parsed.hiddenSubjects.filter(
                  (s): s is string => typeof s === "string"
                )
              : [],
            searchQuery: "", // On ne restaure pas une recherche temporaire
          };
          criteriaRef.current = hydrated;
          setCriteria(hydrated);
        }
      } catch (e) {
        console.warn("Erreur chargement filtres:", e);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    loadSavedFilters();

    return () => {
      mounted = false;
    };
  }, []);

  const updateCriteria = useCallback(
    (
      updater:
        | Partial<FilterCriteria>
        | ((prev: FilterCriteria) => FilterCriteria)
    ) => {
      const prev = criteriaRef.current;
      const next =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      criteriaRef.current = next;
      setCriteria(next);
      void persistFilters(next);
    },
    []
  );

  const setSearchQuery = useCallback((query: string) => {
    const next = { ...criteriaRef.current, searchQuery: query };
    criteriaRef.current = next;
    setCriteria(next);
  }, []);

  const toggleHiddenSubject = useCallback((subject: string) => {
    const prev = criteriaRef.current;
    const isHidden = prev.hiddenSubjects.includes(subject);
    const nextHidden = isHidden
      ? prev.hiddenSubjects.filter((s) => s !== subject)
      : [...prev.hiddenSubjects, subject];
    const next = { ...prev, hiddenSubjects: nextHidden };
    criteriaRef.current = next;
    setCriteria(next);
    void persistFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    criteriaRef.current = DEFAULT_FILTERS;
    setCriteria(DEFAULT_FILTERS);
    void persistFilters(DEFAULT_FILTERS);
  }, []);

  const value = useMemo<FiltersContextValue>(
    () => ({
      criteria,
      isLoaded,
      setSearchQuery,
      updateCriteria,
      toggleHiddenSubject,
      resetFilters,
    }),
    [
      criteria,
      isLoaded,
      setSearchQuery,
      updateCriteria,
      toggleHiddenSubject,
      resetFilters,
    ]
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters doit être utilisé dans un FiltersProvider");
  }
  return ctx;
}

export function useFilters(courses: Course[]) {
  const {
    criteria,
    isLoaded,
    setSearchQuery,
    updateCriteria,
    toggleHiddenSubject,
    resetFilters,
  } = useFiltersContext();

  const availableFilters: AvailableFilters = useMemo(() => {
    return extractAvailableFilters(courses);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return filterCourses(courses, criteria, availableFilters);
  }, [courses, criteria, availableFilters]);

  const activeFilterCount = useMemo(() => {
    return countActiveFilters(criteria);
  }, [criteria]);

  return {
    criteria,
    availableFilters,
    filteredCourses,
    activeFilterCount,
    isLoaded,
    setSearchQuery,
    updateCriteria,
    toggleHiddenSubject,
    resetFilters,
  };
}
