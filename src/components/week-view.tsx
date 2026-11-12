import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  addDays,
  formatDayHeader,
  formatWeekHeader,
  getMondayOfWeek,
  getParisDateString,
  getTodayParisDateString,
  getWeekDays,
} from "@/lib/dates";
import { Course } from "@/lib/ics";
import { CourseCard } from "./course-card";

export type WeekViewProps = {
  courses: Course[];
  currentMonday: string; // "YYYY-MM-DD"
  onSelectMonday: (mondayStr: string) => void;
  onSelectCourse: (course: Course) => void;
  onGoToDay?: (dateStr: string) => void;
};

export function WeekView({
  courses,
  currentMonday,
  onSelectMonday,
  onSelectCourse,
  onGoToDay,
}: WeekViewProps) {
  const theme = useTheme();
  const todayStr = getTodayParisDateString();
  const thisWeekMonday = getMondayOfWeek(todayStr);

  const isCurrentWeek = currentMonday === thisWeekMonday;

  // Lundi à samedi de la semaine
  const weekDays = useMemo(() => getWeekDays(currentMonday, false), [currentMonday]);

  // Grouper les cours par date
  const coursesByDate = useMemo(() => {
    const map = new Map<string, Course[]>();
    weekDays.forEach((d) => map.set(d, []));
    courses.forEach((c) => {
      const d = getParisDateString(c.start);
      if (map.has(d)) {
        map.get(d)!.push(c);
      }
    });
    return map;
  }, [courses, weekDays]);

  const totalCoursesInWeek = useMemo(() => {
    let count = 0;
    coursesByDate.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [coursesByDate]);

  const handlePrevWeek = () => onSelectMonday(addDays(currentMonday, -7));
  const handleNextWeek = () => onSelectMonday(addDays(currentMonday, 7));
  const handleThisWeek = () => onSelectMonday(thisWeekMonday);

  return (
    <View style={styles.container}>
      {/* Navigation de la semaine */}
      <View style={styles.navBar}>
        <Pressable
          onPress={handlePrevWeek}
          style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold">◀ Semaine préc.</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleThisWeek}
          style={[
            styles.thisWeekBtn,
            isCurrentWeek && { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText type="smallBold">Cette semaine</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleNextWeek}
          style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold">Semaine suiv. ▶</ThemedText>
        </Pressable>
      </View>

      {/* Titre de la semaine */}
      <View style={styles.weekHeaderRow}>
        <ThemedText type="default" style={styles.weekHeaderTitle}>
          {formatWeekHeader(currentMonday)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {totalCoursesInWeek} cours
        </ThemedText>
      </View>

      {/* Sections par jour */}
      <View style={styles.daysList}>
        {weekDays.map((dateStr) => {
          const dayList = coursesByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;

          return (
            <ThemedView
              key={dateStr}
              type="backgroundElement"
              style={[
                styles.daySection,
                isToday && styles.todaySection,
              ]}
            >
              <Pressable
                onPress={() => onGoToDay?.(dateStr)}
                style={styles.daySectionHeader}
              >
                <View style={styles.dayTitleWithBadge}>
                  <ThemedText
                    type="smallBold"
                    style={[styles.daySectionTitle, isToday && styles.todayTitle]}
                  >
                    {formatDayHeader(dateStr)}
                  </ThemedText>
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <ThemedText type="smallBold" style={styles.todayBadgeText}>
                        {"Aujourd'hui"}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  {dayList.length} cours
                </ThemedText>
              </Pressable>

              {dayList.length === 0 ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyDayText}
                >
                  Aucun cours
                </ThemedText>
              ) : (
                <View style={styles.dayCoursesList}>
                  {dayList.map((course) => (
                    <CourseCard
                      key={course.key}
                      course={course}
                      compact
                      onPress={() => onSelectCourse(course)}
                    />
                  ))}
                </View>
              )}
            </ThemedView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.one,
  },
  navBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  thisWeekBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.one,
    paddingHorizontal: 2,
  },
  weekHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  daysList: {
    gap: Spacing.two,
  },
  daySection: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  todaySection: {
    borderWidth: 1.5,
    borderColor: "#3B82F666",
  },
  daySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayTitleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  daySectionTitle: {
    fontSize: 15,
  },
  todayTitle: {
    color: "#3B82F6",
  },
  todayBadge: {
    paddingHorizontal: Spacing.one * 1.5,
    paddingVertical: 1,
    borderRadius: Spacing.one,
    backgroundColor: "#3B82F622",
  },
  todayBadgeText: {
    color: "#3B82F6",
    fontSize: 10,
  },
  emptyDayText: {
    fontStyle: "italic",
    paddingVertical: Spacing.one,
  },
  dayCoursesList: {
    gap: Spacing.one,
  },
});
