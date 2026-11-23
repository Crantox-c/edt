import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";
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
import { GlassButton } from "@/components/ui/glass-button";
import {
  GlassSurface,
  GlassSurfaceContainer,
} from "@/components/ui/glass-surface";
import { StatusBarProgressiveBlur } from "@/components/ui/status-bar-blur";
import { WeekView } from "@/components/week-view";
import {
  MaxContentWidth,
  Radius,
  Spacing,
  getTabScrollPaddingBottom,
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
import { Course } from "@/lib/geii-api";

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
    activeGroup,
    courses,
    lastSync,
    isSyncing,
    loadingWeek,
    error,
    modifiedKeys,
    isStale,
    refresh,
    ensureWeekLoaded,
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
  const [syncSeq, setSyncSeq] = useState(0);
  const [hiddenSyncKey, setHiddenSyncKey] = useState<string | null>(null);

  useEffect(() => {
    void ensureWeekLoaded(selectedMonday);
  }, [selectedMonday, activeGroup.id, ensureWeekLoaded]);

  const syncKey = `${lastSync ?? "none"}-${syncSeq}`;
  const showSyncMeta = isSyncing || hiddenSyncKey !== syncKey;

  const spinDeg = useSharedValue(0);
  const syncMetaProgress = useSharedValue(showSyncMeta ? 1 : 0);

  useEffect(() => {
    const target = showSyncMeta ? 1 : 0;
    if (isReduced) {
      cancelAnimation(syncMetaProgress);
      syncMetaProgress.value = target;
      return;
    }
    syncMetaProgress.value = withTiming(target, {
      duration: showSyncMeta ? 240 : 340,
      easing: Easing.out(Easing.cubic),
    });
  }, [showSyncMeta, isReduced, syncMetaProgress]);

  useEffect(() => {
    if (isSyncing) {
      return;
    }
    const timer = setTimeout(() => {
      setHiddenSyncKey(syncKey);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSyncing, syncKey]);

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

  const syncMetaCollapseStyle = useAnimatedStyle(() => ({
    height: syncMetaProgress.value * 18,
    marginTop: syncMetaProgress.value * 2,
    opacity: syncMetaProgress.value,
    transform: [{ translateY: (1 - syncMetaProgress.value) * -4 }],
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
    setSyncSeq((n) => n + 1);
    refresh();
  };

  const handleManualRefresh = () => {
    setSyncSeq((n) => n + 1);
    refresh();
  };

  const isFiltering = activeFilterCount > 0;
  const monthLabel = formatMonthYear(
    viewMode === "week" ? selectedMonday : selectedDate
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollViewMarker
        style={[styles.scrollView, styles.scrollLayer]}
        scrollEdgeEffects={{ top: "soft", bottom: "soft" }}
      >
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop:
                Platform.OS === "ios" ? Spacing.one : insets.top + Spacing.two,
              paddingBottom: getTabScrollPaddingBottom(insets.bottom),
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
        {/* En-tête éditorial compact + actions Liquid Glass colorées opaques */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <ThemedText type="overline" themeColor="accent">
                {monthLabel}
              </ThemedText>
              <ThemedText
                type="largeTitle"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Emploi du temps
              </ThemedText>
              <Animated.View
                pointerEvents={showSyncMeta ? "auto" : "none"}
                style={[styles.syncMetaRow, syncMetaCollapseStyle]}
              >
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
                <ThemedText
                  type="caption"
                  themeColor="textSecondary"
                  numberOfLines={1}
                >
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
              </Animated.View>
            </View>

            <GlassSurfaceContainer spacing={8} style={styles.headerActions}>
              {/* Bouton pilule Filtres combinables en Liquid Glass transparent */}
              <Pressable
                onPress={() => {
                  haptics.soft();
                  setIsFilterModalOpen(true);
                }}
                hitSlop={6}
                accessibilityLabel="Filtres"
              >
                <GlassSurface
                  glassEffectStyle="regular"
                  isInteractive={true}
                  style={styles.filterPillBtn}
                  fallbackStyle={{
                    backgroundColor:
                      activeFilterCount > 0 ? accent.softBg : theme.cardBg,
                    borderColor:
                      activeFilterCount > 0 ? accent.border : theme.cardBorder,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "slider.horizontal.3",
                      android: "tune",
                      web: "tune",
                    }}
                    size={17}
                    weight="medium"
                    tintColor={activeFilterCount > 0 ? accent.primary : theme.text}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: activeFilterCount > 0 ? accent.primary : theme.text,
                    }}
                  >
                    Filtres
                  </ThemedText>
                  {activeFilterCount > 0 && (
                    <View
                      style={[
                        styles.filterCountBadge,
                        { backgroundColor: accent.solidBg },
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
                </GlassSurface>
              </Pressable>

              {/* Bouton rafraîchir en Liquid Glass opaque couleur d'accentuation */}
              <GlassButton
                onPress={handleManualRefresh}
                haptic="toggle"
                hitSlop={6}
                accessibilityLabel="Actualiser l'emploi du temps"
                tintColor={accent.solidBg}
                borderColor={accent.primary}
                style={styles.circleActionBtn}
              >
                <Animated.View style={spinStyle}>
                  <SymbolView
                    name={{
                      ios: "arrow.clockwise",
                      android: "refresh",
                      web: "refresh",
                    }}
                    size={19}
                    weight="medium"
                    tintColor={theme.textOnAccent}
                  />
                </Animated.View>
              </GlassButton>
            </GlassSurfaceContainer>
          </View>

          {isStale && (
            <Animated.View
              entering={isReduced ? undefined : FadeIn.duration(220)}
              exiting={isReduced ? undefined : FadeOut.duration(220)}
              layout={isReduced ? undefined : LinearTransition.duration(260)}
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
            </Animated.View>
          )}

          {error && (
            <Animated.View
              entering={isReduced ? undefined : FadeIn.duration(220)}
              exiting={isReduced ? undefined : FadeOut.duration(220)}
              layout={isReduced ? undefined : LinearTransition.duration(260)}
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
                Hors-ligne ({error}) — dernière synchro :{" "}
                {formatLastSync(lastSync)}.
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Pilules des filtres actifs */}
        <ActiveFilterPills
          criteria={criteria}
          onClearPromo={() => updateCriteria({ selectedPromo: null })}
          onClearKind={() => updateCriteria({ selectedKind: null })}
          onClearSubject={() => updateCriteria({ selectedSubject: null })}
          onClearTeacher={() => updateCriteria({ selectedTeacher: null })}
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
              Chargement de l&apos;emploi du temps...
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
            <GlassButton
              haptic="none"
              tintColor={accent.solidBg}
              borderColor={accent.primary}
              onPress={() => {
                haptics.warning();
                resetFilters();
              }}
              style={styles.resetFilterBtn}
            >
              <ThemedText
                type="smallBold"
                style={{ color: theme.textOnAccent }}
              >
                Réinitialiser les filtres
              </ThemedText>
            </GlassButton>
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
                isLoadingWeek={loadingWeek === getMondayOfWeek(selectedDate)}
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
                isLoadingWeek={loadingWeek === selectedMonday}
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
      </ScrollViewMarker>

      <AmbientBackground />
      <StatusBarProgressiveBlur />

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
  scrollLayer: {
    zIndex: 1,
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
    overflow: "hidden",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  filterPillBtn: {
    height: 44,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  circleActionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
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
