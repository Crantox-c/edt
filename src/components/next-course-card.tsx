import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing, getCourseColorTokens } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import { formatDuration, formatTimeRange, getNextOrCurrentCourse } from "@/lib/dates";
import { Course } from "@/lib/ics";

export type NextCourseCardProps = {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
};

export function NextCourseCard({ courses, onSelectCourse }: NextCourseCardProps) {
  const theme = useTheme();
  const now = useCurrentTime();
  const info = getNextOrCurrentCourse(courses, now);
  const course = info.course;

  if (!course) {
    return null;
  }

  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";

  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const badgeScale = info.isCurrent ? theme.menthe : theme.glacier;

  return (
    <Pressable
      onPress={() => onSelectCourse?.(course)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: info.isCurrent ? badgeScale[50] : tokens.cardBg,
            borderColor: info.isCurrent ? badgeScale[300] : tokens.borderColor,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeScale[100] },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: badgeScale[700], fontSize: 11 }}
            >
              {info.isCurrent ? "EN COURS" : "PROCHAIN COURS"}
            </ThemedText>
          </View>

          <View style={[styles.countdownBadge, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={styles.countdownText}>
              ⏱ {info.countdown}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="default" style={styles.title}>
          {course.title}
        </ThemedText>

        <View style={styles.bottomRow}>
          <ThemedText
            type="smallBold"
            style={[styles.timeText, { color: tokens.textColor }]}
          >
            {timeRange} ({duration})
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Salle : {roomText}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  countdownBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  countdownText: {
    fontSize: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  timeText: {
    opacity: 0.95,
  },
});
