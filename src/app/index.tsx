import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActiveFilterPills } from "@/components/active-filter-pills";
import { CourseDetailModal } from "@/components/course-detail-modal";
import { DayView } from "@/components/day-view";
import { FilterModal } from "@/components/filter-modal";
import { ListView } from "@/components/list-view";
import { NextCourseCard } from "@/components/next-course-card";
import { SearchBar } from "@/components/search-bar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GlassSurface } from "@/components/ui/glass-surface";
import { WeekView } from "@/components/week-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useFilters } from "@/hooks/use-filters";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import { getMondayOfWeek, getTodayParisDateString } from "@/lib/dates";
import { Course } from "@/lib/ics";

type ViewMode = "day" | "week" | "list";

function formatLastSync(lastSync: number | null): string {
  if (!lastSync) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(lastSync));
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const ambre = theme.ambre;
  const corail = theme.corail;

  const { courses, lastSync, isSyncing, error, isStale, refresh } =
    useSchedule();

  const {
    criteria,
    availableFilters,
    filteredCourses,
    activeFilterCount,
    setSearchQuery,
    updateCriteria,
    toggleHiddenSubject,
    resetFilters,
  } = useFilters(courses);

  const todayStr = getTodayParisDateString();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonday, setSelectedMonday] = useState<string>(
    getMondayOfWeek(todayStr)
  );
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleSelectCourse = (course: Course) => {
    setActiveCourse(course);
  };

  const handleGoToDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setViewMode("day");
  };

  const isFiltering = activeFilterCount > 0 || criteria.searchQuery.trim().length > 0;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={refresh}
            tintColor={theme.accent}
          />
        }
      >
        {/* En-tête principal avec sélecteur de thème */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="title">Emploi du temps</ThemedText>
          </View>

          {/* Sélecteur de thème (Nuit / Clair / OLED / Auto) */}
          <ThemeSwitcher />

          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {isSyncing
                ? "Synchronisation en cours..."
                : `Dernière synchro : ${formatLastSync(lastSync)}`}
            </ThemedText>
            {courses.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {isFiltering
                  ? `${filteredCourses.length} / ${courses.length} cours`
                  : `${courses.length} cours`}
              </ThemedText>
            )}
          </View>

          {isStale && (
            <View
              style={[
                styles.staleBanner,
                { backgroundColor: ambre[50], borderColor: ambre[300] },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: ambre[700] }}
              >
                Données anciennes (&gt; 24h)
              </ThemedText>
            </View>
          )}

          {error && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: corail[50], borderColor: corail[300] },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: corail[700] }}
              >
                Réseau indisponible ({error}). Dernier flux valide conservé.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Barre de recherche et bouton filtres */}
        <SearchBar
          value={criteria.searchQuery}
          onChangeText={setSearchQuery}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setIsFilterModalOpen(true)}
        />

        {/* Badges des filtres actifs */}
        <ActiveFilterPills
          criteria={criteria}
          onClearPromo={() => updateCriteria({ selectedPromo: null })}
          onClearKind={() => updateCriteria({ selectedKind: null })}
          onClearSubject={() => updateCriteria({ selectedSubject: null })}
          onClearTag={() => updateCriteria({ selectedTag: null })}
          onClearRoom={() => updateCriteria({ selectedRoom: null })}
          onClearFloor={() => updateCriteria({ selectedFloor: null })}
          onClearHiddenSubjects={() => updateCriteria({ hiddenSubjects: [] })}
          onClearAll={resetFilters}
        />

        {/* Carte Prochain cours avec compte à rebours */}
        {filteredCourses.length > 0 && (
          <NextCourseCard
            courses={filteredCourses}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {/* Sélecteur de vue : Jour | Semaine | Liste */}
        <GlassSurface
          glassEffectStyle="clear"
          style={styles.viewSwitcher}
          fallbackStyle={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          }}
        >
          <Pressable
            onPress={() => setViewMode("day")}
            style={[
              styles.switcherTab,
              viewMode === "day" && [
                styles.activeSwitcherTab,
                { backgroundColor: theme.backgroundSelected },
              ],
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: viewMode === "day" ? theme.accent : theme.textSecondary,
              }}
            >
              Jour
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("week")}
            style={[
              styles.switcherTab,
              viewMode === "week" && [
                styles.activeSwitcherTab,
                { backgroundColor: theme.backgroundSelected },
              ],
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: viewMode === "week" ? theme.accent : theme.textSecondary,
              }}
            >
              Semaine
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("list")}
            style={[
              styles.switcherTab,
              viewMode === "list" && [
                styles.activeSwitcherTab,
                { backgroundColor: theme.backgroundSelected },
              ],
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: viewMode === "list" ? theme.accent : theme.textSecondary,
              }}
            >
              Liste
            </ThemedText>
          </Pressable>
        </GlassSurface>

        {/* Contenu selon la vue active */}
        {courses.length === 0 && isSyncing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              Chargement des cours...
            </ThemedText>
          </View>
        ) : filteredCourses.length === 0 && isFiltering ? (
          <ThemedView type="backgroundElement" style={styles.noFilterResultsCard}>
            <ThemedText type="default" style={styles.noResultsTitle}>
              Aucun cours ne correspond aux filtres
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Essayez de modifier votre recherche ou de réinitialiser vos critères.
            </ThemedText>
            <Pressable
              onPress={resetFilters}
              style={[styles.resetFilterBtn, { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="smallBold">Réinitialiser les filtres</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            {viewMode === "day" && (
              <DayView
                courses={filteredCourses}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectCourse={handleSelectCourse}
              />
            )}

            {viewMode === "week" && (
              <WeekView
                courses={filteredCourses}
                currentMonday={selectedMonday}
                onSelectMonday={setSelectedMonday}
                onSelectCourse={handleSelectCourse}
                onGoToDay={handleGoToDay}
              />
            )}

            {viewMode === "list" && (
              <ListView
                courses={filteredCourses}
                onSelectCourse={handleSelectCourse}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Détail du cours */}
      <CourseDetailModal
        course={activeCourse}
        visible={activeCourse !== null}
        onClose={() => setActiveCourse(null)}
      />

      {/* Modal des Filtres */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        criteria={criteria}
        availableFilters={availableFilters}
        onUpdateCriteria={updateCriteria}
        onToggleHiddenSubject={toggleHiddenSubject}
        onResetFilters={resetFilters}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  staleBanner: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.one,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.one,
  },
  viewSwitcher: {
    flexDirection: "row",
    borderRadius: Spacing.two,
    padding: 3,
    marginBottom: Spacing.two,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: Spacing.one * 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two - 2,
  },
  activeSwitcherTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  noFilterResultsCard: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginVertical: Spacing.three,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
