import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatDuration, formatTimeRange, getNextOrCurrentCourse } from "@/lib/dates";
import { Course } from "@/lib/ics";

export type NextCourseCardProps = {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
};

export function NextCourseCard({ courses, onSelectCourse }: NextCourseCardProps) {
  const now = useCurrentTime();
  const info = getNextOrCurrentCourse(courses, now);
  const course = info.course;

  if (!course) {
    return null;
  }

  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";

  return (
    <Pressable
      onPress={() => onSelectCourse?.(course)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <ThemedView
        type="backgroundElement"
        style={[
          styles.container,
          info.isCurrent ? styles.currentContainer : styles.nextContainer,
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.badge,
              info.isCurrent ? styles.currentBadge : styles.nextBadge,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={info.isCurrent ? styles.currentBadgeText : styles.nextBadgeText}
            >
              {info.isCurrent ? "EN COURS" : "PROCHAIN COURS"}
            </ThemedText>
          </View>

          <View style={styles.countdownBadge}>
            <ThemedText type="smallBold" style={styles.countdownText}>
              ⏱ {info.countdown}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="default" style={styles.title}>
          {course.title}
        </ThemedText>

        <View style={styles.bottomRow}>
          <ThemedText type="smallBold" style={styles.timeText}>
            {timeRange} ({duration})
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Salle : {roomText}
          </ThemedText>
        </View>
      </ThemedView>
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
  currentContainer: {
    borderColor: "#10B98188",
    backgroundColor: "#10B98110",
  },
  nextContainer: {
    borderColor: "#3B82F666",
    backgroundColor: "#3B82F610",
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
  currentBadge: {
    backgroundColor: "#10B98125",
  },
  currentBadgeText: {
    color: "#059669",
    fontSize: 11,
  },
  nextBadge: {
    backgroundColor: "#3B82F625",
  },
  nextBadgeText: {
    color: "#2563EB",
    fontSize: 11,
  },
  countdownBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    backgroundColor: "rgba(150, 150, 150, 0.15)",
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
    opacity: 0.9,
  },
});
