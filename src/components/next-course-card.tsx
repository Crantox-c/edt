import React, { useEffect, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radius, Spacing, getCourseColorTokens } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import {
  extractFloor,
  formatDuration,
  formatTime,
  formatTimeRange,
  getNextOrCurrentCourse,
} from "@/lib/dates";
import { Course, isCourseDS } from "@/lib/geii-api";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type NextCourseCardProps = {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
};

/**
 * Carte vedette « Prochain cours / En cours » :
 * Utilise le Liquid Glass natif cristallin (sans tint boueux) avec pilules colorées internes.
 */
export function NextCourseCard({ courses, onSelectCourse }: NextCourseCardProps) {
  const theme = useTheme();
  const now = useCurrentTime();
  const { isReduced } = useReducedMotion();
  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const info = getNextOrCurrentCourse(courses, now);
  const course = info.course;
  const isCurrent = info.isCurrent;

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isCurrent || isReduced) {
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
      return;
    }
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulseScale);
  }, [isCurrent, isReduced, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!course) {
    return null;
  }

  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";
  const floorLabel = extractFloor(course.room);
  const readableSubject = resolveSubjectReadableName(course.subject, subjectDict);

  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const statusScale = isCurrent ? theme.menthe : theme.accentScale;
  const isDS = isCourseDS(course);

  const progress = isCurrent
    ? Math.min(
        1,
        Math.max(
          0.04,
          (now - course.start) / Math.max(1, course.end - course.start)
        )
      )
    : 0;

  return (
    <PressableScale
      onPress={() => onSelectCourse?.(course)}
      haptic="tap"
      style={styles.pressable}
    >
      <GlassSurface
        glassEffectStyle="regular"
        isInteractive={true}
        style={styles.container}
        fallbackStyle={{
          backgroundColor: theme.backgroundElement,
          borderColor: isCurrent ? statusScale[500] : theme.cardBorder,
          borderWidth: 1,
        }}
      >
        {/* Barre supérieure d'état + Compte à rebours */}
        <View style={styles.topRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusScale[100],
                borderColor: statusScale[300],
              },
            ]}
          >
            <View style={styles.dotContainer}>
              {isCurrent && !isReduced && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { backgroundColor: statusScale[300] },
                    pulseStyle,
                  ]}
                />
              )}
              <View
                style={[styles.liveDot, { backgroundColor: statusScale[500] }]}
              />
            </View>
            <ThemedText
              type="overline"
              style={[styles.statusLabel, { color: statusScale[700] }]}
            >
              {isCurrent ? "EN COURS" : "PROCHAIN COURS"}
            </ThemedText>
          </View>

          <View
            style={[
              styles.countdownPill,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <SymbolView
              name={{ ios: "timer", android: "schedule", web: "schedule" }}
              size={13}
              tintColor={statusScale[700]}
            />
            <ThemedText
              type="tabular"
              style={[styles.countdownText, { color: statusScale[700] }]}
            >
              {info.countdown}
            </ThemedText>
          </View>
        </View>

        {/* Corps avec repère coloré matière à gauche */}
        <View style={styles.middleRow}>
          <View
            style={[
              styles.heroAccentBar,
              { backgroundColor: tokens.accentColor },
            ]}
          />

          <View style={styles.titleBlock}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {readableSubject
                ? `${readableSubject} (${course.subject})`
                : course.title}
            </ThemedText>
            {readableSubject && (
              <ThemedText
                type="caption"
                themeColor="textSecondary"
                numberOfLines={1}
              >
                {course.title}
              </ThemedText>
            )}
            {course.teacher && (
              <View style={styles.teacherMetaRow}>
                <SymbolView
                  name={{
                    ios: "person.fill",
                    android: "person",
                    web: "person",
                  }}
                  size={11}
                  tintColor={theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  themeColor="textSecondary"
                  style={styles.teacherMetaText}
                  numberOfLines={1}
                >
                  {course.teacher}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.badgesGroup}>
            {(course.kind || isDS) && (
              <View style={[styles.kindBadge, { backgroundColor: tokens.badgeBg }]}>
                <ThemedText
                  type="captionBold"
                  style={{ color: tokens.textColor }}
                >
                  {isDS ? "DS" : course.kind}
                </ThemedText>
              </View>
            )}
            {course.promo && (
              <View
                style={[
                  styles.kindBadge,
                  { backgroundColor: theme.surfaceMuted },
                ]}
              >
                <ThemedText type="captionBold" themeColor="textSecondary">
                  {course.promo}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Barre de progression en direct si EN COURS */}
        {isCurrent && (
          <View style={styles.progressSection}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.surfaceMuted },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: statusScale[500],
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <ThemedText
                type="tabular"
                themeColor="textMuted"
                style={styles.progressTimeText}
              >
                {formatTime(course.start)}
              </ThemedText>
              <ThemedText
                type="captionBold"
                style={[styles.progressPct, { color: statusScale[700] }]}
              >
                {Math.round(progress * 100)}% écoulé
              </ThemedText>
              <ThemedText
                type="tabular"
                themeColor="textMuted"
                style={styles.progressTimeText}
              >
                {formatTime(course.end)}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Pied de carte : Horaire & Salle */}
        <View style={styles.bottomRow}>
          <View style={styles.metaItem}>
            <SymbolView
              name={{
                ios: "clock.fill",
                android: "access_time",
                web: "access_time",
              }}
              size={13}
              tintColor={tokens.textColor}
            />
            <ThemedText type="tabular" style={{ color: tokens.textColor }}>
              {timeRange}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              ({duration})
            </ThemedText>
          </View>

          <View
            style={[
              styles.roomPill,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <SymbolView
              name={{
                ios: "mappin.and.ellipse",
                android: "place",
                web: "place",
              }}
              size={12}
              tintColor={course.room ? theme.text : theme.textMuted}
            />
            <ThemedText
              type="smallBold"
              themeColor={course.room ? "text" : "textMuted"}
              style={styles.roomLabel}
            >
              {roomText}
              {floorLabel ? ` • ${floorLabel}` : ""}
            </ThemedText>
          </View>
        </View>
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Radius.xxl,
    borderCurve: "continuous",
  },
  container: {
    borderRadius: Radius.xxl,
    borderCurve: "continuous",
    padding: 18,
    gap: Spacing.two + 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  dotContainer: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  statusLabel: {
    lineHeight: 13,
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  countdownText: {
    fontSize: 12,
    lineHeight: 16,
  },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: Spacing.two,
  },
  heroAccentBar: {
    width: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    marginVertical: 2,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  teacherMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  teacherMetaText: {
    flexShrink: 1,
  },
  badgesGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  kindBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  progressSection: {
    gap: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTimeText: {
    fontSize: 11,
    lineHeight: 15,
  },
  progressPct: {
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
    gap: Spacing.two,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    flexShrink: 1,
  },
  roomLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
});
