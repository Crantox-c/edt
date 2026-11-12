import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import {
  addDays,
  formatDayHeader,
  formatDayShort,
  getMondayOfWeek,
  getParisDateString,
  getTodayParisDateString,
  getWeekDays,
} from "@/lib/dates";
import { Course } from "@/lib/ics";
import { CourseCard } from "./course-card";
import { NowIndicator } from "./now-indicator";

export type DayViewProps = {
  courses: Course[];
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  onSelectCourse: (course: Course) => void;
};

export function DayView({
  courses,
  selectedDate,
  onSelectDate,
  onSelectCourse,
}: DayViewProps) {
  const theme = useTheme();
  const glacier = theme.glacier;
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const isToday = selectedDate === todayStr;

  // Filtrer les cours pour le jour sélectionné
  const dayCourses = useMemo(() => {
    return courses.filter((c) => getParisDateString(c.start) === selectedDate);
  }, [courses, selectedDate]);

  // Jours de la semaine courante pour la mini barre de navigation
  const mondayStr = getMondayOfWeek(selectedDate);
  const weekDays = useMemo(() => getWeekDays(mondayStr, false), [mondayStr]);

  // Ensemble des dates ayant au moins un cours pour afficher une pastille
  const datesWithCourses = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => set.add(getParisDateString(c.start)));
    return set;
  }, [courses]);

  const handlePrevDay = () => onSelectDate(addDays(selectedDate, -1));
  const handleNextDay = () => onSelectDate(addDays(selectedDate, 1));
  const handleToday = () => onSelectDate(todayStr);

  return (
    <View style={styles.container}>
      {/* Barre de navigation du jour */}
      <View style={styles.navBar}>
        <Pressable
          onPress={handlePrevDay}
          style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold">◀ Jour préc.</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleToday}
          style={[
            styles.todayBtn,
            isToday && { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText type="smallBold">{"Aujourd'hui"}</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleNextDay}
          style={[styles.navBtn, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold">Jour suiv. ▶</ThemedText>
        </Pressable>
      </View>

      {/* Mini sélecteur de la semaine */}
      <View style={styles.weekBar}>
        {weekDays.map((dStr) => {
          const { weekday, dayNum } = formatDayShort(dStr);
          const isSelected = dStr === selectedDate;
          const isCurrentDay = dStr === todayStr;
          const hasCourse = datesWithCourses.has(dStr);

          return (
            <Pressable
              key={dStr}
              onPress={() => onSelectDate(dStr)}
              style={[
                styles.dayTab,
                { backgroundColor: theme.backgroundElement },
                isSelected && {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: glacier[500],
                  borderWidth: 1.5,
                },
              ]}
            >
              <ThemedText
                type="small"
                themeColor={isSelected ? "text" : "textSecondary"}
                style={styles.dayTabWeekday}
              >
                {weekday}
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={[
                  styles.dayTabNumber,
                  isCurrentDay && { color: glacier[500] },
                ]}
              >
                {dayNum}
              </ThemedText>
              <View
                style={[
                  styles.courseDot,
                  { backgroundColor: hasCourse ? glacier[500] : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* En-tête du jour sélectionné */}
      <View style={styles.dayHeaderRow}>
        <ThemedText type="default" style={styles.dayHeaderTitle}>
          {formatDayHeader(selectedDate)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {dayCourses.length} cours
        </ThemedText>
      </View>

      {/* Liste des cours ou état vide */}
      {dayCourses.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="default" style={styles.emptyTitle}>
            Aucun cours ce jour-là
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Profitez de votre journée libre !
          </ThemedText>
          {isToday && <NowIndicator />}
        </ThemedView>
      ) : (
        <View style={styles.courseList}>
          {/* Si aujourd'hui et avant le premier cours */}
          {isToday && nowMs < dayCourses[0].start && <NowIndicator />}

          {dayCourses.map((course, idx) => {
            const nextCourse = dayCourses[idx + 1];
            const isNowBetweenThisAndNext =
              isToday &&
              nowMs >= course.start &&
              (!nextCourse || nowMs < nextCourse.start);

            return (
              <React.Fragment key={course.key}>
                <CourseCard
                  course={course}
                  onPress={() => onSelectCourse(course)}
                />
                {isNowBetweenThisAndNext && <NowIndicator />}
              </React.Fragment>
            );
          })}
        </View>
      )}
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
  todayBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  weekBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  dayTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  dayTabWeekday: {
    fontSize: 11,
  },
  dayTabNumber: {
    fontSize: 14,
  },
  courseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.one,
    paddingHorizontal: 2,
  },
  dayHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  courseList: {
    gap: Spacing.two,
  },
  emptyCard: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
