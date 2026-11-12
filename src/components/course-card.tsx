import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDuration, formatTimeRange } from "@/lib/dates";
import { Course } from "@/lib/ics";

export type CourseCardProps = {
  course: Course;
  onPress?: () => void;
  compact?: boolean;
};

export function CourseCard({ course, onPress, compact = false }: CourseCardProps) {
  const theme = useTheme();
  const timeText = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";

  const isDS = course.kind === "DS" || course.title.toUpperCase().includes("_DS");
  const isSAE = course.subject === "SAE" || course.title.toUpperCase().startsWith("SAE");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          compact && styles.cardCompact,
          isDS && styles.dsCardBorder,
          isSAE && !isDS && styles.saeCardBorder,
        ]}
      >
        <View style={styles.headerRow}>
          <ThemedText type="smallBold" style={styles.timeText}>
            {timeText} ({duration})
          </ThemedText>

          <View style={styles.badgesRow}>
            {isDS && (
              <View style={[styles.badge, styles.dsBadge]}>
                <ThemedText type="smallBold" style={styles.dsText}>
                  DS
                </ThemedText>
              </View>
            )}
            {course.kind && !isDS && (
              <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{course.kind}</ThemedText>
              </View>
            )}
            {course.promo && (
              <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small">{course.promo}</ThemedText>
              </View>
            )}
          </View>
        </View>

        <ThemedText type="default" style={[styles.title, compact && styles.titleCompact]}>
          {course.title}
        </ThemedText>

        <View style={styles.footerRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Salle : {roomText}
          </ThemedText>
          {course.tags.length > 0 && !compact && (
            <ThemedText type="small" themeColor="textSecondary">
              {course.tags.join(" • ")}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardCompact: {
    padding: Spacing.two,
    gap: 2,
    borderRadius: Spacing.two,
  },
  dsCardBorder: {
    borderColor: "#EF444488",
  },
  saeCardBorder: {
    borderColor: "#3B82F666",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    opacity: 0.9,
  },
  badgesRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.one * 1.5,
    paddingVertical: 1,
    borderRadius: Spacing.one,
  },
  dsBadge: {
    backgroundColor: "#EF444422",
  },
  dsText: {
    color: "#EF4444",
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
});
