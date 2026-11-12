import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDayHeader, getParisDateString, getTodayParisDateString } from "@/lib/dates";
import { Course } from "@/lib/ics";
import { CourseCard } from "./course-card";

export type ListViewProps = {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
};

export function ListView({ courses, onSelectCourse }: ListViewProps) {
  const theme = useTheme();
  const glacier = theme.glacier;
  const todayStr = getTodayParisDateString();

  // Grouper les cours par date pour une liste chronologique
  const sections = useMemo(() => {
    const map = new Map<string, Course[]>();
    courses.forEach((c) => {
      const d = getParisDateString(c.start);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(c);
    });

    return Array.from(map.entries()).map(([dateStr, list]) => ({
      dateStr,
      title: formatDayHeader(dateStr),
      isToday: dateStr === todayStr,
      data: list,
    }));
  }, [courses, todayStr]);

  if (courses.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.emptyContainer}>
        <ThemedText type="default">Aucun cours disponible</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tirez vers le bas pour synchroniser.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.dateStr} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ThemedText
              type="smallBold"
              style={[
                styles.sectionTitle,
                section.isToday && { color: glacier[500] },
              ]}
            >
              {section.title}
            </ThemedText>
            {section.isToday && (
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
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.sectionCount}
            >
              {section.data.length} cours
            </ThemedText>
          </View>

          <View style={styles.coursesGroup}>
            {section.data.map((course) => (
              <CourseCard
                key={course.key}
                course={course}
                onPress={() => onSelectCourse(course)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  sectionContainer: {
    gap: Spacing.one,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
  },
  todayBadge: {
    paddingHorizontal: Spacing.one * 1.5,
    paddingVertical: 1,
    borderRadius: Spacing.one,
  },
  sectionCount: {
    marginLeft: "auto",
  },
  coursesGroup: {
    gap: Spacing.two,
  },
  emptyContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
});
