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

import { CourseDetailModal } from "@/components/course-detail-modal";
import { DayView } from "@/components/day-view";
import { ListView } from "@/components/list-view";
import { NextCourseCard } from "@/components/next-course-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WeekView } from "@/components/week-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
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
  const { courses, lastSync, isSyncing, error, isStale, refresh } =
    useSchedule();

  const todayStr = getTodayParisDateString();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonday, setSelectedMonday] = useState<string>(
    getMondayOfWeek(todayStr)
  );
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  const handleSelectCourse = (course: Course) => {
    setActiveCourse(course);
  };

  const handleGoToDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setViewMode("day");
  };

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
            tintColor={theme.text}
          />
        }
      >
        {/* En-tête principal */}
        <View style={styles.header}>
          <ThemedText type="title">Emploi du temps</ThemedText>

          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {isSyncing
                ? "Synchronisation en cours..."
                : `Dernière synchro : ${formatLastSync(lastSync)}`}
            </ThemedText>
            {courses.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {courses.length} cours
              </ThemedText>
            )}
          </View>

          {isStale && (
            <View style={styles.staleBanner}>
              <ThemedText type="smallBold" style={styles.staleText}>
                Données anciennes (&gt; 24h)
              </ThemedText>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <ThemedText type="small" style={styles.errorText}>
                Réseau indisponible ({error}). Dernier flux valide conservé.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Carte Prochain cours avec compte à rebours */}
        {courses.length > 0 && (
          <NextCourseCard
            courses={courses}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {/* Sélecteur de vue : Jour | Semaine | Liste */}
        <ThemedView type="backgroundElement" style={styles.viewSwitcher}>
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
              themeColor={viewMode === "day" ? "text" : "textSecondary"}
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
              themeColor={viewMode === "week" ? "text" : "textSecondary"}
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
              themeColor={viewMode === "list" ? "text" : "textSecondary"}
            >
              Liste
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Contenu selon la vue active */}
        {courses.length === 0 && isSyncing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.text} />
            <ThemedText type="small" themeColor="textSecondary">
              Chargement des cours...
            </ThemedText>
          </View>
        ) : (
          <>
            {viewMode === "day" && (
              <DayView
                courses={courses}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectCourse={handleSelectCourse}
              />
            )}

            {viewMode === "week" && (
              <WeekView
                courses={courses}
                currentMonday={selectedMonday}
                onSelectMonday={setSelectedMonday}
                onSelectCourse={handleSelectCourse}
                onGoToDay={handleGoToDay}
              />
            )}

            {viewMode === "list" && (
              <ListView
                courses={courses}
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
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  staleBanner: {
    backgroundColor: "#F59E0B22",
    borderColor: "#F59E0B88",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  staleText: {
    color: "#D97706",
  },
  errorBanner: {
    backgroundColor: "#EF444422",
    borderColor: "#EF444488",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  errorText: {
    color: "#DC2626",
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
});
