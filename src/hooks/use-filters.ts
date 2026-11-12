import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AvailableFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  extractAvailableFilters,
  filterCourses,
  FilterCriteria,
} from "@/lib/filters";
import { Course } from "@/lib/ics";

const FILTERS_STORAGE_KEY = "schedule:filters_v1";

export function useFilters(courses: Course[]) {
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Charger les filtres sauvegardés au montage
  useEffect(() => {
    let mounted = true;

    async function loadSavedFilters() {
      try {
        const raw = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as Partial<FilterCriteria>;
          setCriteria((prev) => ({
            ...prev,
            ...parsed,
            searchQuery: "", // On ne restaure pas une recherche temporaire
          }));
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

  // 2. Sauvegarder les filtres à chaque modification (hors recherche)
  const saveFilters = useCallback(async (newCriteria: FilterCriteria) => {
    try {
      const toPersist = {
        selectedPromo: newCriteria.selectedPromo,
        selectedKind: newCriteria.selectedKind,
        selectedSubject: newCriteria.selectedSubject,
        selectedTag: newCriteria.selectedTag,
        selectedRoom: newCriteria.selectedRoom,
        selectedFloor: newCriteria.selectedFloor,
        hiddenSubjects: newCriteria.hiddenSubjects,
      };
      await AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toPersist));
    } catch (e) {
      console.warn("Erreur sauvegarde filtres:", e);
    }
  }, []);

  // Mettre à jour un ou plusieurs critères
  const updateCriteria = useCallback(
    (updater: Partial<FilterCriteria> | ((prev: FilterCriteria) => FilterCriteria)) => {
      setCriteria((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        saveFilters(next);
        return next;
      });
    },
    [saveFilters]
  );

  // Recherche textuelle (non persistée)
  const setSearchQuery = useCallback((query: string) => {
    setCriteria((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // Basculer le masquage d'une matière
  const toggleHiddenSubject = useCallback(
    (subject: string) => {
      setCriteria((prev) => {
        const isHidden = prev.hiddenSubjects.includes(subject);
        const nextHidden = isHidden
          ? prev.hiddenSubjects.filter((s) => s !== subject)
          : [...prev.hiddenSubjects, subject];

        const next = { ...prev, hiddenSubjects: nextHidden };
        saveFilters(next);
        return next;
      });
    },
    [saveFilters]
  );

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setCriteria(DEFAULT_FILTERS);
    saveFilters(DEFAULT_FILTERS);
  }, [saveFilters]);

  // Extraire les options dynamiques depuis les cours
  const availableFilters: AvailableFilters = useMemo(() => {
    return extractAvailableFilters(courses);
  }, [courses]);

  // Filtrer les cours
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
