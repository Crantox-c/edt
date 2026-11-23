import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { SegmentedControl, type SegmentedOption } from "@/components/segmented-control";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import {
  formatDayHeaderCompact,
  formatTotalDuration,
  getParisDateString,
  getTodayParisDateString,
} from "@/lib/dates";
import { Course, isCourseDS } from "@/lib/geii-api";
import { CourseCard } from "./course-card";

type ListScope = "upcoming" | "all";

export type ListViewProps = {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  modifiedKeys?: Set<string>;
};

export function ListView({
  courses,
  onSelectCourse,
  modifiedKeys,
}: ListViewProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;
  const corail = theme.corail;
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const [scope, setScope] = useState<ListScope>("upcoming");

  const upcomingCourses = useMemo(
    () => courses.filter((c) => getParisDateString(c.start) >= todayStr),
    [courses, todayStr]
  );

  const scopeOptions: readonly SegmentedOption<ListScope>[] = useMemo(
    () => [
      {
        key: "upcoming",
        label: `À venir (${upcomingCourses.length})`,
        icon: { ios: "calendar", android: "event", web: "event" },
      },
      {
        key: "all",
        label: `Tout (${courses.length})`,
        icon: { ios: "list.bullet", android: "list", web: "list" },
      },
    ],
    [upcomingCourses.length, courses.length]
  );

  const displayedCourses = scope === "upcoming" ? upcomingCourses : courses;

  const sections = useMemo(() => {
    const map = new Map<string, Course[]>();
    displayedCourses.forEach((c) => {
      const d = getParisDateString(c.start);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(c);
    });

    return Array.from(map.entries()).map(([dateStr, list]) => ({
      dateStr,
      title: formatDayHeaderCompact(dateStr),
      isToday: dateStr === todayStr,
      hasDS: list.some((c) => isCourseDS(c)),
      duration: formatTotalDuration(list),
      data: list,
    }));
  }, [displayedCourses, todayStr]);

  return (
    <View style={styles.container}>
      {courses.length > 0 && (
        <SegmentedControl
          compact
          options={scopeOptions}
          value={scope}
          onChange={setScope}
        />
      )}

      {sections.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: theme.cardBgSubtle,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <SymbolView
            name={{ ios: "calendar", android: "event", web: "event" }}
            size={28}
            tintColor={theme.textMuted}
          />
          <ThemedText type="headline" style={styles.emptyTitle}>
            {scope === "upcoming" && courses.length > 0
              ? "Aucun cours à venir"
              : "Aucun cours disponible"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {scope === "upcoming" && courses.length > 0
              ? "Basculez sur « Tout » pour consulter l'historique."
              : "Tirez vers le bas pour synchroniser."}
          </ThemedText>
        </View>
      ) : (
        sections.map((section) => (
          <View key={section.dateStr} style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.sectionTitle,
                  section.isToday && { color: accent.primary },
                ]}
              >
                {section.title}
              </ThemedText>

              {section.isToday && (
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: accent.softBg },
                  ]}
                >
                  <ThemedText
                    type="captionBold"
                    style={[styles.badgeText, { color: accent.text }]}
                  >
                    {"Aujourd'hui"}
                  </ThemedText>
                </View>
              )}

              {section.hasDS && (
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: corail[100] },
                  ]}
                >
                  <ThemedText
                    type="captionBold"
                    style={[styles.badgeText, { color: corail[700] }]}
                  >
                    DS
                  </ThemedText>
                </View>
              )}

              <ThemedText
                type="caption"
                themeColor="textSecondary"
                style={styles.sectionCount}
              >
                {section.data.length} cours • {section.duration}
              </ThemedText>
            </View>

            <View style={styles.coursesGroup}>
              {section.data.map((course) => (
                <CourseCard
                  key={course.key}
                  course={course}
                  isModified={modifiedKeys?.has(course.key)}
                  isActive={
                    section.isToday &&
                    nowMs >= course.start &&
                    nowMs < course.end
                  }
                  isPast={nowMs >= course.end}
                  nowMs={nowMs}
                  onPress={() => onSelectCourse(course)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two + 4,
  },
  sectionContainer: {
    gap: Spacing.one + 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  sectionCount: {
    marginLeft: "auto",
  },
  coursesGroup: {
    gap: Spacing.two,
  },
  emptyContainer: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one + 2,
  },
  emptyTitle: {
    marginTop: 4,
  },
});
