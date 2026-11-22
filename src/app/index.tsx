import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { ActiveFilterPills } from "@/components/active-filter-pills";
import { CourseDetailModal } from "@/components/course-detail-modal";
import { DayView } from "@/components/day-view";
import { FilterModal } from "@/components/filter-modal";
import { ListView } from "@/components/list-view";
import { NextCourseCard } from "@/components/next-course-card";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control";
import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import {
  GlassSurface,
  GlassSurfaceContainer,
} from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import { WeekView } from "@/components/week-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useFilters } from "@/hooks/use-filters";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import {
  formatMonthYear,
  getMondayOfWeek,
  getTodayParisDateString,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course } from "@/lib/ics";

type ViewMode = "day" | "week" | "list";

const VIEW_MODE_OPTIONS: readonly SegmentedOption<ViewMode>[] = [
  {
    key: "day",
    label: "Jour",
    icon: { ios: "calendar.day.timeline.left", android: "today", web: "today" },
  },
  {
    key: "week",
    label: "Semaine",
    icon: { ios: "calendar", android: "view_week", web: "view_week" },
  },
  {
    key: "list",
    label: "Liste",
    icon: { ios: "list.bullet", android: "list", web: "list" },
  },
];

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
  const { isReduced } = useReducedMotion();
  const ambre = theme.ambre;
  const corail = theme.corail;
  const accent = theme.accentTiers;

  const {
    courses,
    lastSync,
    isSyncing,
    error,
    modifiedKeys,
    isStale,
    refresh,
  } = useSchedule();

  const {
    criteria,
    availableFilters,
    filteredCourses,
    activeFilterCount,
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

  const spinDeg = useSharedValue(0);

  useEffect(() => {
    if (isSyncing && !isReduced) {
      spinDeg.value = 0;
      spinDeg.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(spinDeg);
      spinDeg.value = 0;
    }
    return () => cancelAnimation(spinDeg);
  }, [isSyncing, isReduced, spinDeg]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));

  const handleSelectCourse = (course: Course) => {
    setActiveCourse(course);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedMonday(getMondayOfWeek(dateStr));
  };

  const handleGoToDay = (dateStr: string) => {
    handleSelectDate(dateStr);
    setViewMode("day");
  };

  const handleChangeViewMode = (nextMode: ViewMode) => {
    if (nextMode === "week" && viewMode === "day") {
      setSelectedMonday(getMondayOfWeek(selectedDate));
    }
    setViewMode(nextMode);
  };

  const handlePullRefresh = () => {
    haptics.toggle();
    refresh();
  };

  const isFiltering = activeFilterCount > 0;
  const monthLabel = formatMonthYear(
    viewMode === "week" ? selectedMonday : selectedDate
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <AmbientBackground />

      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "ios" ? Spacing.one : insets.top + Spacing.two,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handlePullRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {/* En-tête éditorial compact + 2 actions flottantes en Liquid Glass (44pt iOS) */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <ThemedText type="overline" themeColor="accent">
                {monthLabel}
              </ThemedText>
              <ThemedText type="largeTitle">Emploi du temps</ThemedText>
              <View style={styles.syncMetaRow}>
                <SymbolView
                  name={{
                    ios: isSyncing
                      ? "arrow.triangle.2.circlepath"
                      : "checkmark.circle.fill",
                    android: isSyncing ? "sync" : "check_circle",
                    web: isSyncing ? "sync" : "check_circle",
                  }}
                  size={12}
                  tintColor={isSyncing ? accent.primary : theme.menthe[500]}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {isSyncing
                    ? "Synchronisation..."
                    : `Synchro ${formatLastSync(lastSync)}`}
                  {courses.length > 0 &&
                    ` • ${
                      isFiltering
                        ? `${filteredCourses.length}/${courses.length} cours`
                        : `${courses.length} cours`
                    }`}
                </ThemedText>
              </View>
            </View>

            <GlassSurfaceContainer spacing={10} style={styles.headerActions}>
              {/* Bouton filtres combinables avec pastille compteur */}
              <View style={styles.filterBtnWrapper}>
                <PressableScale
                  onPress={() => setIsFilterModalOpen(true)}
                  haptic="soft"
                  hitSlop={6}
                  accessibilityLabel="Filtres"
                >
                  <GlassSurface
                    glassEffectStyle="regular"
                    isInteractive={true}
                    style={styles.circleActionBtn}
                    fallbackStyle={{
                      backgroundColor:
                        activeFilterCount > 0
                          ? accent.softBg
                          : theme.backgroundElement,
                      borderColor:
                        activeFilterCount > 0 ? accent.primary : theme.border,
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "slider.horizontal.3",
                        android: "tune",
                        web: "tune",
                      }}
                      size={20}
                      weight="medium"
                      tintColor={
                        activeFilterCount > 0 ? accent.primary : theme.text
                      }
                    />
                  </GlassSurface>
                </PressableScale>

                {activeFilterCount > 0 && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.filterCountBadge,
                      {
                        backgroundColor: accent.solidBg,
                        borderColor: theme.background,
                      },
                    ]}
                  >
                    <ThemedText
                      type="captionBold"
                      style={[
                        styles.filterCountText,
                        { color: theme.textOnAccent },
                      ]}
                    >
                      {activeFilterCount}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Bouton rafraîchir */}
              <PressableScale
                onPress={refresh}
                haptic="toggle"
                hitSlop={6}
                accessibilityLabel="Actualiser le flux"
              >
                <GlassSurface
                  glassEffectStyle="regular"
                  isInteractive={true}
                  style={styles.circleActionBtn}
                  fallbackStyle={{
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  }}
                >
                  <Animated.View style={spinStyle}>
                    <SymbolView
                      name={{
                        ios: "arrow.clockwise",
                        android: "refresh",
                        web: "refresh",
                      }}
                      size={20}
                      weight="medium"
                      tintColor={accent.primary}
                    />
                  </Animated.View>
                </GlassSurface>
              </PressableScale>
            </GlassSurfaceContainer>
          </View>

          {isStale && (
            <View
              style={[
                styles.banner,
                { backgroundColor: ambre[100], borderColor: ambre[300] },
              ]}
            >
              <SymbolView
                name={{
                  ios: "exclamationmark.triangle.fill",
                  android: "warning",
                  web: "warning",
                }}
                size={14}
                tintColor={ambre[700]}
              />
              <ThemedText
                type="captionBold"
                style={{ color: ambre[700] }}
              >
                Données anciennes (&gt; 24h) — tirez pour actualiser
              </ThemedText>
            </View>
          )}

          {error && (
            <View
              style={[
                styles.banner,
                { backgroundColor: corail[100], borderColor: corail[300] },
              ]}
            >
              <SymbolView
                name={{
                  ios: "wifi.slash",
                  android: "wifi_off",
                  web: "wifi_off",
                }}
                size={14}
                tintColor={corail[700]}
              />
              <ThemedText
                type="caption"
                style={[styles.errorBannerText, { color: corail[700] }]}
              >
                Hors-ligne ({error}). Dernier flux valide conservé.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Pilules des filtres actifs */}
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

        {/* Carte Prochain cours / En cours (vedette Liquid Glass) */}
        {filteredCourses.length > 0 && (
          <NextCourseCard
            courses={filteredCourses}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {/* Sélecteur de vue glissant en Liquid Glass : Jour | Semaine | Liste */}
        <SegmentedControl
          options={VIEW_MODE_OPTIONS}
          value={viewMode}
          onChange={handleChangeViewMode}
        />

        {/* Contenu selon la vue active */}
        {courses.length === 0 && isSyncing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              Synchronisation du flux ICS...
            </ThemedText>
          </View>
        ) : filteredCourses.length === 0 && isFiltering ? (
          <View
            style={[
              styles.noFilterResultsCard,
              {
                backgroundColor: theme.cardBgSubtle,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search_off",
                web: "search_off",
              }}
              size={26}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="headline" style={styles.noResultsTitle}>
              Aucun cours ne correspond aux filtres
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Modifiez vos filtres pour réafficher vos cours.
            </ThemedText>
            <PressableScale
              haptic="none"
              onPress={() => {
                haptics.warning();
                resetFilters();
              }}
              style={[
                styles.resetFilterBtn,
                { backgroundColor: accent.solidBg },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: theme.textOnAccent }}
              >
                Réinitialiser les filtres
              </ThemedText>
            </PressableScale>
          </View>
        ) : (
          <>
            {viewMode === "day" && (
              <DayView
                courses={filteredCourses}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onSelectCourse={handleSelectCourse}
                modifiedKeys={modifiedKeys}
              />
            )}

            {viewMode === "week" && (
              <WeekView
                courses={filteredCourses}
                currentMonday={selectedMonday}
                onSelectMonday={setSelectedMonday}
                onSelectCourse={handleSelectCourse}
                onGoToDay={handleGoToDay}
                modifiedKeys={modifiedKeys}
              />
            )}

            {viewMode === "list" && (
              <ListView
                courses={filteredCourses}
                onSelectCourse={handleSelectCourse}
                modifiedKeys={modifiedKeys}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Feuille détail du cours */}
      <CourseDetailModal
        course={activeCourse}
        visible={activeCourse !== null}
        onClose={() => setActiveCourse(null)}
        onFilterBySubject={(subject) =>
          updateCriteria({ selectedSubject: subject })
        }
        onHideSubject={(subject) => {
          if (!criteria.hiddenSubjects.includes(subject)) {
            toggleHiddenSubject(subject);
          }
        }}
      />

      {/* Feuille des filtres */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        criteria={criteria}
        availableFilters={availableFilters}
        resultCount={filteredCourses.length}
        onUpdateCriteria={updateCriteria}
        onToggleHiddenSubject={toggleHiddenSubject}
        onResetFilters={resetFilters}
      />
    </View>
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
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 2,
  },
  header: {
    gap: Spacing.one + 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
  },
  syncMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleActionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnWrapper: {
    position: "relative",
  },
  filterCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  filterCountText: {
    fontSize: 11,
    lineHeight: 13,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  errorBannerText: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  noFilterResultsCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  noResultsTitle: {
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
});
