import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GlassSurfaceContainer } from "@/components/ui/glass-surface";
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
  modifiedKeys?: Set<string>;
};

export function WeekView({
  courses,
  currentMonday,
  onSelectMonday,
  onSelectCourse,
  onGoToDay,
  modifiedKeys,
}: WeekViewProps) {
  const theme = useTheme();
  const glacier = theme.glacier;
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
                isToday && {
                  borderWidth: 1.5,
                  borderColor: glacier[300],
                },
              ]}
            >
              <Pressable
                onPress={() => onGoToDay?.(dateStr)}
                style={styles.daySectionHeader}
              >
                <View style={styles.dayTitleWithBadge}>
                  <ThemedText
                    type="smallBold"
                    style={[
                      styles.daySectionTitle,
                      isToday && { color: glacier[500] },
                    ]}
                  >
                    {formatDayHeader(dateStr)}
                  </ThemedText>
                  {isToday && (
                    <View
                      style={[
                        styles.todayBadge,
                        { backgroundColor: glacier[100] },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: glacier[700], fontSize: 10 }}
                      >
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
                <GlassSurfaceContainer spacing={Spacing.one} style={styles.dayCoursesList}>
                  {dayList.map((course) => (
                    <CourseCard
                      key={course.key}
                      course={course}
                      compact
                      isModified={modifiedKeys?.has(course.key)}
                      onPress={() => onSelectCourse(course)}
                    />
                  ))}
                </GlassSurfaceContainer>
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
  todayBadge: {
    paddingHorizontal: Spacing.one * 1.5,
    paddingVertical: 1,
    borderRadius: Spacing.one,
  },
  emptyDayText: {
    fontStyle: "italic",
    paddingVertical: Spacing.one,
  },
  dayCoursesList: {
    gap: Spacing.one,
  },
});
