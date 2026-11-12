import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Spacing, getCourseColorTokens } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDuration, formatTimeRange } from "@/lib/dates";
import { Course } from "@/lib/ics";

export type CourseCardProps = {
  course: Course;
  onPress?: () => void;
  compact?: boolean;
  isModified?: boolean;
};

export function CourseCard({
  course,
  onPress,
  compact = false,
  isModified = false,
}: CourseCardProps) {
  const theme = useTheme();
  const timeText = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";

  // Tokens de couleur calculés dynamiquement depuis le hash de la matière
  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const isDS = course.kind === "DS" || course.title.toUpperCase().includes("_DS");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <GlassSurface
        glassEffectStyle="regular"
        tintColor={tokens.cardBg}
        isInteractive={true}
        style={[
          styles.card,
          compact && styles.cardCompact,
        ]}
        fallbackStyle={{
          backgroundColor: theme.backgroundElement,
          borderColor: tokens.borderColor,
        }}
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
              {isModified && (
                <View style={[styles.badge, { backgroundColor: theme.ambre[100] }]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.ambre[700], fontSize: 10 }}
                  >
                    MODIFIÉ
                  </ThemedText>
                </View>
              )}
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
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderRadius: Spacing.three,
    flexDirection: "row",
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
