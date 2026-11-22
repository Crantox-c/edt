import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import {
  Radius,
  Spacing,
  concentricRadius,
  getSubjectTint,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import {
  addDays,
  formatDayHeaderCompact,
  formatDayShort,
  formatGapBetween,
  formatTotalDuration,
  getMondayOfWeek,
  getParisDateString,
  getTodayParisDateString,
  getWeekDays,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course } from "@/lib/ics";
import { CourseCard } from "./course-card";
import { NowIndicator } from "./now-indicator";

export type DayViewProps = {
  courses: Course[];
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  onSelectCourse: (course: Course) => void;
  modifiedKeys?: Set<string>;
};

export function DayView({
  courses,
  selectedDate,
  onSelectDate,
  onSelectCourse,
  modifiedKeys,
}: DayViewProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const isToday = selectedDate === todayStr;

  const dayCourses = useMemo(() => {
    return courses.filter((c) => getParisDateString(c.start) === selectedDate);
  }, [courses, selectedDate]);

  const mondayStr = getMondayOfWeek(selectedDate);
  const weekDays = useMemo(() => getWeekDays(mondayStr, false), [mondayStr]);

  // Jusqu'à 3 pastilles de couleur matière par jour sur la bande semaine
  const dayTintsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of courses) {
      const d = getParisDateString(c.start);
      const list = map.get(d) ?? [];
      const color = theme[getSubjectTint(c.subject)][500];
      if (!list.includes(color) && list.length < 3) {
        list.push(color);
        map.set(d, list);
      }
    }
    return map;
  }, [courses, theme]);

  // Prochain jour avec un cours après la date sélectionnée (saut rapide sur jour libre)
  const nextActiveDate = useMemo(() => {
    const next = courses.find(
      (c) => getParisDateString(c.start) > selectedDate
    );
    return next ? getParisDateString(next.start) : null;
  }, [courses, selectedDate]);

  const handlePrevWeek = () => {
    haptics.tap();
    onSelectDate(addDays(selectedDate, -7));
  };

  const handleNextWeek = () => {
    haptics.tap();
    onSelectDate(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    haptics.soft();
    onSelectDate(todayStr);
  };

  const handleTapDay = (dStr: string) => {
    if (dStr !== selectedDate) {
      haptics.selection();
      onSelectDate(dStr);
    }
  };

  // Position de l'indicateur "maintenant" (hors d'un cours déjà actif)
  const hasActiveCourse =
    isToday && dayCourses.some((c) => c.start <= nowMs && nowMs < c.end);
  const nowInsertIndex = useMemo(() => {
    if (!isToday || hasActiveCourse || dayCourses.length === 0) return -1;
    const idx = dayCourses.findIndex((c) => c.start > nowMs);
    return idx === -1 ? dayCourses.length : idx;
  }, [isToday, hasActiveCourse, dayCourses, nowMs]);

  const totalDayDuration = useMemo(
    () => formatTotalDuration(dayCourses),
    [dayCourses]
  );

  return (
    <View style={styles.container}>
      {/* Bande unifiée de la semaine dans un seul GlassSurface cristallin */}
      <GlassSurface
        glassEffectStyle="regular"
        style={styles.weekStripSurface}
        fallbackStyle={{
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        }}
      >
        <Pressable
          onPress={handlePrevWeek}
          hitSlop={6}
          style={styles.weekArrowBtn}
          accessibilityLabel="Semaine précédente"
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "chevron_left",
              web: "chevron_left",
            }}
            size={14}
            weight="bold"
            tintColor={theme.textSecondary}
          />
        </Pressable>

        {weekDays.map((dStr) => {
          const { weekday, dayNum } = formatDayShort(dStr);
          const isSelected = dStr === selectedDate;
          const isCurrentDay = dStr === todayStr;
          const dots = dayTintsMap.get(dStr) ?? [];

          return (
            <Pressable
              key={dStr}
              onPress={() => handleTapDay(dStr)}
              style={[
                styles.dayTab,
                isSelected && {
                  backgroundColor: accent.softBg,
                  borderColor: accent.primary,
                  borderWidth: 1.5,
                },
                !isSelected &&
                  isCurrentDay && {
                    borderColor: accent.border,
                    borderWidth: 1,
                  },
              ]}
            >
              <ThemedText
                type="captionBold"
                style={[
                  styles.dayTabWeekday,
                  {
                    color: isSelected ? accent.text : theme.textSecondary,
                  },
                ]}
              >
                {weekday}
              </ThemedText>
              <ThemedText
                type="tabular"
                style={[
                  styles.dayTabNumber,
                  isCurrentDay && !isSelected && { color: accent.primary },
                  isSelected && { color: accent.text },
                ]}
              >
                {dayNum}
              </ThemedText>
              <View style={styles.dotsRow}>
                {dots.length > 0 ? (
                  dots.map((dotColor, i) => (
                    <View
                      key={`${dStr}-dot-${i}`}
                      style={[
                        styles.courseDot,
                        {
                          backgroundColor: isSelected ? accent.text : dotColor,
                        },
                      ]}
                    />
                  ))
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleNextWeek}
          hitSlop={6}
          style={styles.weekArrowBtn}
          accessibilityLabel="Semaine suivante"
        >
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={14}
            weight="bold"
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </GlassSurface>

      {/* En-tête du jour sélectionné + résumé volume horaire */}
      <View style={styles.dayHeaderRow}>
        <ThemedText type="headline">
          {formatDayHeaderCompact(selectedDate)}
        </ThemedText>

        <View style={styles.dayHeaderRight}>
          {!isToday && (
            <Pressable
              onPress={handleToday}
              style={[
                styles.todayPill,
                { backgroundColor: accent.softBg, borderColor: accent.border },
              ]}
            >
              <SymbolView
                name={{
                  ios: "arrow.uturn.backward",
                  android: "today",
                  web: "today",
                }}
                size={11}
                tintColor={accent.text}
              />
              <ThemedText
                type="captionBold"
                style={{ color: accent.text }}
              >
                {"Aujourd'hui"}
              </ThemedText>
            </Pressable>
          )}
          <View
            style={[
              styles.summaryPill,
              { backgroundColor: theme.surfaceMuted },
            ]}
          >
            <ThemedText type="caption" themeColor="textSecondary">
              {dayCourses.length > 0
                ? `${dayCourses.length} cours • ${totalDayDuration}`
                : "0 cours"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Liste des cours (cartes mates) ou état vide */}
      {dayCourses.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.cardBgSubtle,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: theme.ambre[100] },
            ]}
          >
            <SymbolView
              name={{ ios: "sun.max.fill", android: "wb_sunny", web: "wb_sunny" }}
              size={26}
              tintColor={theme.ambre[500]}
            />
          </View>
          <ThemedText type="headline">
            Journée libre
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Aucun cours prévu pour cette date.
          </ThemedText>

          {nextActiveDate && (
            <PressableScale
              haptic="soft"
              onPress={() => onSelectDate(nextActiveDate)}
              style={[
                styles.jumpNextBtn,
                { backgroundColor: accent.softBg, borderColor: accent.border },
              ]}
            >
              <ThemedText
                type="captionBold"
                style={{ color: accent.text }}
              >
                Aller au {formatDayHeaderCompact(nextActiveDate)}
              </ThemedText>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={11}
                tintColor={accent.text}
              />
            </PressableScale>
          )}

          {isToday && <NowIndicator />}
        </View>
      ) : (
        <View style={styles.courseList}>
          {dayCourses.map((course, idx) => {
            const prevCourse = idx > 0 ? dayCourses[idx - 1] : null;
            const gap = prevCourse
              ? formatGapBetween(prevCourse.end, course.start)
              : null;
            const isCourseActive =
              isToday && nowMs >= course.start && nowMs < course.end;
            const isCoursePast = isToday && nowMs >= course.end;

            return (
              <React.Fragment key={course.key}>
                {gap && idx !== nowInsertIndex && (
                  <View style={styles.gapRow}>
                    <View
                      style={[
                        styles.gapLine,
                        { backgroundColor: theme.borderSubtle },
                      ]}
                    />
                    <View
                      style={[
                        styles.gapPill,
                        {
                          backgroundColor: gap.isLunch
                            ? theme.ambre[50]
                            : theme.surfaceMuted,
                          borderColor: gap.isLunch
                            ? theme.ambre[300]
                            : theme.borderSubtle,
                        },
                      ]}
                    >
                      <SymbolView
                        name={{
                          ios: gap.isLunch
                            ? "fork.knife"
                            : "cup.and.saucer.fill",
                          android: gap.isLunch ? "restaurant" : "local_cafe",
                          web: gap.isLunch ? "restaurant" : "local_cafe",
                        }}
                        size={11}
                        tintColor={
                          gap.isLunch ? theme.ambre[700] : theme.textMuted
                        }
                      />
                      <ThemedText
                        type="captionBold"
                        style={[
                          styles.gapText,
                          {
                            color: gap.isLunch
                              ? theme.ambre[700]
                              : theme.textMuted,
                          },
                        ]}
                      >
                        {gap.label}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.gapLine,
                        { backgroundColor: theme.borderSubtle },
                      ]}
                    />
                  </View>
                )}

                {idx === nowInsertIndex && <NowIndicator />}

                <CourseCard
                  course={course}
                  isModified={modifiedKeys?.has(course.key)}
                  isActive={isCourseActive}
                  isPast={isCoursePast}
                  nowMs={nowMs}
                  onPress={() => onSelectCourse(course)}
                />
              </React.Fragment>
            );
          })}

          {nowInsertIndex === dayCourses.length && <NowIndicator />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  weekStripSurface: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 6,
    gap: 2,
  },
  weekArrowBtn: {
    width: 26,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: concentricRadius(24, 6),
    borderCurve: "continuous",
    gap: 1,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayTabWeekday: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  dayTabNumber: {
    fontSize: 15,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 5,
    marginTop: 1,
  },
  courseDot: {
    width: 4,
    height: 4,
    borderRadius: Radius.pill,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 2,
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  todayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  courseList: {
    gap: Spacing.two,
  },
  gapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 1,
  },
  gapLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  gapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  gapText: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one + 2,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  jumpNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.two,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
