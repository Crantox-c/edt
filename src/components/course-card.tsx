import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing, getCourseColorTokens } from "@/constants/theme";
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

  // Tokens de couleur calculés dynamiquement depuis le hash de la matière
  // et modulés selon le type (kind)
  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const isDS = course.kind === "DS" || course.title.toUpperCase().includes("_DS");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: tokens.borderColor,
          },
          compact && styles.cardCompact,
        ]}
      >
        {/* Barre d'accentuation latérale colorée dérivée de la matière */}
        <View style={[styles.accentIndicator, { backgroundColor: tokens.accentColor }]} />

        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText
              type="smallBold"
              style={[styles.timeText, { color: tokens.textColor }]}
            >
              {timeText} ({duration})
            </ThemedText>

            <View style={styles.badgesRow}>
              {course.kind && (
                <View style={[styles.badge, { backgroundColor: tokens.badgeBg }]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: tokens.textColor, fontSize: 11 }}
                  >
                    {isDS ? "DS" : course.kind}
                  </ThemedText>
                </View>
              )}
              {course.promo && (
                <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.badgeText}>
                    {course.promo}
                  </ThemedText>
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
              <ThemedText type="small" themeColor="textMuted">
                {course.tags.join(" • ")}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderRadius: Spacing.three,
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
  },
  cardCompact: {
    borderRadius: Spacing.two,
  },
  accentIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    opacity: 0.95,
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
  badgeText: {
    fontSize: 11,
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
