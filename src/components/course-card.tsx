import React, { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import {
  Radius,
  Spacing,
  concentricRadius,
  getCourseColorTokens,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { extractFloor, formatDuration, formatTime } from "@/lib/dates";
import { Course } from "@/lib/ics";
import {
  getCourseNotesSnapshot,
  subscribeCourseNotes,
} from "@/lib/notes";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type CourseCardProps = {
  course: Course;
  onPress?: () => void;
  compact?: boolean;
  isModified?: boolean;
  isActive?: boolean;
  isPast?: boolean;
  nowMs?: number;
};

export function CourseCard({
  course,
  onPress,
  compact = false,
  isModified = false,
  isActive = false,
  isPast = false,
  nowMs,
}: CourseCardProps) {
  const theme = useTheme();
  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );
  const notesMap = useSyncExternalStore(
    subscribeCourseNotes,
    getCourseNotesSnapshot,
    getCourseNotesSnapshot
  );

  const startStr = formatTime(course.start);
  const endStr = formatTime(course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";
  const floorLabel = extractFloor(course.room);
  const readableName = resolveSubjectReadableName(course.subject, subjectDict);
  const personalNote = notesMap[course.key];

  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const isDS =
    course.kind === "DS" || course.title.toUpperCase().includes("_DS");

  const activeProgress =
    isActive && nowMs !== undefined
      ? Math.min(
          1,
          Math.max(
            0.03,
            (nowMs - course.start) / Math.max(1, course.end - course.start)
          )
        )
      : 0;

  return (
    <PressableScale onPress={onPress} haptic="tap" style={styles.pressable}>
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          {
            backgroundColor: theme.cardBg,
            borderColor: isActive
              ? theme.menthe[500]
              : isDS
                ? theme.corail[300]
                : theme.cardBorder,
            borderWidth: isActive ? 1.5 : StyleSheet.hairlineWidth,
          },
          !theme.isDark && {
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
      >
        <View style={styles.mainRow}>
          {/* Colonne horaire tabulaire à gauche */}
          <View style={[styles.timeColumn, compact && styles.timeColumnCompact]}>
            <ThemedText
              type="tabular"
              style={[
                styles.startTime,
                { color: isPast ? theme.textMuted : tokens.textColor },
              ]}
            >
              {startStr}
            </ThemedText>

            <View style={styles.durationBridge}>
              <View
                style={[styles.bridgeLine, { backgroundColor: theme.borderSubtle }]}
              />
              <ThemedText
                type="caption"
                themeColor="textMuted"
                style={styles.durationText}
              >
                {duration}
              </ThemedText>
              <View
                style={[styles.bridgeLine, { backgroundColor: theme.borderSubtle }]}
              />
            </View>

            <ThemedText
              type="tabular"
              themeColor={isPast ? "textMuted" : "textSecondary"}
              style={styles.endTime}
            >
              {endStr}
            </ThemedText>
          </View>

          {/* Barre verticale colorée dérivée du hash de la matière */}
          <View
            style={[
              styles.accentBar,
              isActive && styles.accentBarActive,
              {
                backgroundColor: isPast
                  ? theme.textMuted
                  : isActive
                    ? theme.menthe[500]
                    : tokens.accentColor,
              },
            ]}
          />

          {/* Colonne contenu à droite */}
          <View style={[styles.contentColumn, compact && styles.contentCompact]}>
            <View style={styles.topRow}>
              <View style={styles.titleWrapper}>
                <ThemedText
                  type={compact ? "smallBold" : "headline"}
                  themeColor={isPast ? "textSecondary" : "text"}
                  style={[styles.title, compact && styles.titleCompact]}
                  numberOfLines={1}
                >
                  {readableName ? readableName : course.title}
                </ThemedText>
                {readableName && (
                  <ThemedText
                    type="caption"
                    themeColor={isPast ? "textMuted" : "textSecondary"}
                    numberOfLines={1}
                  >
                    {course.title}
                  </ThemedText>
                )}
              </View>

              {/* Badges sémantiques */}
              <View style={styles.badgesRow}>
                {isActive && (
                  <View
                    style={[
                      styles.badge,
                      styles.iconBadge,
                      { backgroundColor: theme.menthe[100] },
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: theme.menthe[500] },
                      ]}
                    />
                    <ThemedText
                      type="captionBold"
                      style={[styles.badgeLabel, { color: theme.menthe[700] }]}
                    >
                      EN COURS
                    </ThemedText>
                  </View>
                )}
                {isPast && !isActive && (
                  <SymbolView
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    size={14}
                    tintColor={theme.textMuted}
                  />
                )}
                {isModified && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.ambre[100] },
                    ]}
                  >
                    <ThemedText
                      type="captionBold"
                      style={[styles.modifiedLabel, { color: theme.ambre[700] }]}
                    >
                      MODIFIÉ
                    </ThemedText>
                  </View>
                )}
                {(course.kind || isDS) && (
                  <View
                    style={[
                      styles.badge,
                      isDS && styles.iconBadge,
                      { backgroundColor: tokens.badgeBg },
                    ]}
                  >
                    {isDS && (
                      <SymbolView
                        name={{
                          ios: "exclamationmark.circle.fill",
                          android: "error",
                          web: "error",
                        }}
                        size={11}
                        tintColor={tokens.textColor}
                      />
                    )}
                    <ThemedText
                      type="captionBold"
                      style={[styles.kindLabel, { color: tokens.textColor }]}
                    >
                      {isDS ? "DS" : course.kind}
                    </ThemedText>
                  </View>
                )}
                {course.promo && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.surfaceMuted },
                    ]}
                  >
                    <ThemedText
                      type="captionBold"
                      themeColor="textSecondary"
                      style={styles.promoLabel}
                    >
                      {course.promo}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.roomRow}>
                <SymbolView
                  name={{
                    ios: "mappin.and.ellipse",
                    android: "place",
                    web: "place",
                  }}
                  size={12}
                  tintColor={course.room ? theme.textSecondary : theme.textMuted}
                />
                <ThemedText
                  type="caption"
                  themeColor={course.room ? "textSecondary" : "textMuted"}
                  style={!course.room && styles.italicRoom}
                >
                  {roomText}
                </ThemedText>
                {floorLabel && !compact && (
                  <View
                    style={[
                      styles.floorTag,
                      { backgroundColor: theme.surfaceMuted },
                    ]}
                  >
                    <ThemedText
                      type="captionBold"
                      themeColor="textMuted"
                      style={styles.floorText}
                    >
                      {floorLabel}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.tagsRow}>
                {personalNote && compact && (
                  <View
                    style={[
                      styles.noteIndicator,
                      { backgroundColor: theme.violet[100] },
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: "note.text",
                        android: "sticky_note_2",
                        web: "sticky_note_2",
                      }}
                      size={11}
                      tintColor={theme.violet[700]}
                    />
                  </View>
                )}
                {course.tags.length > 0 && !compact && (
                  <ThemedText type="caption" themeColor="textMuted">
                    {course.tags.join(" • ")}
                  </ThemedText>
                )}
              </View>
            </View>

            {personalNote && !compact && (
              <View
                style={[
                  styles.notePreviewStrip,
                  {
                    backgroundColor: theme.violet[50],
                    borderColor: theme.violet[300],
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "note.text",
                    android: "sticky_note_2",
                    web: "sticky_note_2",
                  }}
                  size={11}
                  tintColor={theme.violet[700]}
                />
                <ThemedText
                  type="captionBold"
                  style={[styles.notePreviewText, { color: theme.violet[700] }]}
                  numberOfLines={1}
                >
                  {personalNote}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {isActive && (
          <View
            style={[
              styles.activeProgressTrack,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <View
              style={[
                styles.activeProgressFill,
                {
                  width: `${Math.round(activeProgress * 100)}%`,
                  backgroundColor: theme.menthe[500],
                },
              ]}
            />
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
  },
  card: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    paddingVertical: Spacing.two + 5,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    overflow: "hidden",
  },
  cardCompact: {
    paddingVertical: Spacing.two + 1,
    paddingHorizontal: Spacing.two + 4,
    borderRadius: Radius.lg,
    borderCurve: "continuous",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.two + 2,
  },
  timeColumn: {
    width: 50,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: 1,
  },
  timeColumnCompact: {
    width: 46,
  },
  startTime: {
    fontSize: 14,
    lineHeight: 18,
  },
  durationBridge: {
    alignItems: "flex-end",
    gap: 1,
  },
  bridgeLine: {
    width: 1,
    height: 3,
    marginRight: 6,
  },
  durationText: {
    fontSize: 10,
    lineHeight: 13,
  },
  endTime: {
    fontSize: 12,
    lineHeight: 16,
  },
  accentBar: {
    width: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    marginVertical: 1,
  },
  accentBarActive: {
    width: 5,
  },
  contentColumn: {
    flex: 1,
    justifyContent: "space-between",
    gap: 6,
  },
  contentCompact: {
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  titleWrapper: {
    flex: 1,
    gap: 1,
  },
  title: {
    lineHeight: 20,
  },
  titleCompact: {
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  iconBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: Radius.pill,
  },
  badgeLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  modifiedLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  kindLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  promoLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  italicRoom: {
    fontStyle: "italic",
  },
  floorTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm - 2,
    borderCurve: "continuous",
    marginLeft: 2,
  },
  floorText: {
    fontSize: 10,
    lineHeight: 13,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteIndicator: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.sm - 2,
    borderCurve: "continuous",
  },
  notePreviewStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: concentricRadius(Radius.xl, 12),
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  notePreviewText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  activeProgressTrack: {
    height: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  activeProgressFill: {
    height: "100%",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
});
