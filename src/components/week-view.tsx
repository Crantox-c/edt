import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import {
  GlassSurface,
  GlassSurfaceContainer,
} from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import {
  MaxContentWidth,
  Radius,
  Spacing,
  getCourseColorTokens,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import {
  addDays,
  formatDayHeaderCompact,
  formatDayShort,
  formatTimeRange,
  formatTotalDuration,
  formatWeekHeader,
  getMondayOfWeek,
  getParisDateString,
  getParisMinutesOfDay,
  getTodayParisDateString,
  getWeekDays,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course } from "@/lib/ics";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";
import { CourseCard } from "./course-card";

type WeekDisplayMode = "grid" | "agenda";

const HOUR_HEIGHT = 60; // 1 px par minute pour une grille lisible et proportionnelle
const TIME_RAIL_WIDTH = 40;
const DAY_HEADER_HEIGHT = 46;
const MIN_COL_WIDTH = 118;

type PositionedCourse = {
  course: Course;
  startMin: number;
  endMin: number;
  col: number;
  totalCols: number;
};

/**
 * Calcule le placement horizontal de créneaux éventuellement chevauchants sur une journée.
 */
function layoutDayColumns(dayCourses: Course[]): PositionedCourse[] {
  if (dayCourses.length === 0) return [];
  const items = [...dayCourses]
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .map((course) => ({
      course,
      startMin: getParisMinutesOfDay(course.start),
      endMin: Math.max(
        getParisMinutesOfDay(course.start) + 28,
        getParisMinutesOfDay(course.end)
      ),
    }));

  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item);
      if (item.endMin > clusterEnd) clusterEnd = item.endMin;
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: PositionedCourse[] = [];
  for (const cluster of clusters) {
    const colEndTimes: number[] = [];
    const assigned: { item: (typeof items)[number]; col: number }[] = [];

    for (const item of cluster) {
      let placedCol = colEndTimes.findIndex((endT) => endT <= item.startMin);
      if (placedCol === -1) {
        placedCol = colEndTimes.length;
        colEndTimes.push(item.endMin);
      } else {
        colEndTimes[placedCol] = item.endMin;
      }
      assigned.push({ item, col: placedCol });
    }

    const totalCols = Math.max(1, colEndTimes.length);
    for (const entry of assigned) {
      result.push({
        course: entry.item.course,
        startMin: entry.item.startMin,
        endMin: entry.item.endMin,
        col: entry.col,
        totalCols,
      });
    }
  }

  return result;
}

export type WeekViewProps = {
  courses: Course[];
  currentMonday: string; // "YYYY-MM-DD"
  onSelectMonday: (mondayStr: string) => void;
  onSelectCourse: (course: Course) => void;
  onGoToDay?: (dateStr: string) => void;
  modifiedKeys?: Set<string>;
};

export function WeekView({
  courses,
  currentMonday,
  onSelectMonday,
  onSelectCourse,
  onGoToDay,
  modifiedKeys,
}: WeekViewProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;
  const { width: windowWidth } = useWindowDimensions();
  const { isReduced } = useReducedMotion();
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const thisWeekMonday = getMondayOfWeek(todayStr);
  const [displayMode, setDisplayMode] = useState<WeekDisplayMode>("grid");
  const hScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const isCurrentWeek = currentMonday === thisWeekMonday;
  const allWeekDays = useMemo(
    () => getWeekDays(currentMonday, false),
    [currentMonday]
  );

  const coursesByDate = useMemo(() => {
    const map = new Map<string, Course[]>();
    allWeekDays.forEach((d) => map.set(d, []));
    courses.forEach((c) => {
      const d = getParisDateString(c.start);
      if (map.has(d)) {
        map.get(d)!.push(c);
      }
    });
    return map;
  }, [courses, allWeekDays]);

  const weekCourses = useMemo(() => {
    const out: Course[] = [];
    coursesByDate.forEach((list) => out.push(...list));
    return out;
  }, [coursesByDate]);

  const totalHoursLabel = useMemo(
    () => formatTotalDuration(weekCourses),
    [weekCourses]
  );

  const saturdayStr = allWeekDays[5];
  const visibleGridDays = useMemo(() => {
    const hasSaturday = (coursesByDate.get(saturdayStr)?.length ?? 0) > 0;
    return hasSaturday ? allWeekDays : allWeekDays.slice(0, 5);
  }, [allWeekDays, coursesByDate, saturdayStr]);

  // Largeur généreuse de colonne pour un rendu spacieux sur iPhone
  const containerWidth = Math.min(MaxContentWidth, windowWidth) - Spacing.three * 2;
  const availableGridWidth = Math.max(240, containerWidth - TIME_RAIL_WIDTH - 2);
  const colWidth = useMemo(() => {
    if (windowWidth >= 560) {
      return Math.max(MIN_COL_WIDTH, availableGridWidth / visibleGridDays.length);
    }
    return MIN_COL_WIDTH;
  }, [windowWidth, availableGridWidth, visibleGridDays.length]);

  const totalColumnsWidth = colWidth * visibleGridDays.length;

  // Centrer automatiquement le scroll horizontal sur Aujourd'hui lors de la semaine en cours
  useEffect(() => {
    if (displayMode !== "grid" || totalColumnsWidth <= availableGridWidth) return;
    const todayIdx = visibleGridDays.indexOf(todayStr);
    const targetX =
      todayIdx > 0
        ? Math.max(
            0,
            Math.min(
              totalColumnsWidth - availableGridWidth,
              todayIdx * colWidth - (availableGridWidth - colWidth) / 2
            )
          )
        : 0;
    const timer = setTimeout(() => {
      hScrollRef.current?.scrollTo({
        x: targetX,
        animated: !isReduced,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [
    displayMode,
    currentMonday,
    visibleGridDays,
    todayStr,
    colWidth,
    totalColumnsWidth,
    availableGridWidth,
    isReduced,
  ]);

  // Bornes horaires dynamiques pour la grille
  const { startHour, endHour } = useMemo(() => {
    let minH = 8;
    let maxH = 19;
    for (const c of weekCourses) {
      const sMin = getParisMinutesOfDay(c.start);
      const eMin = getParisMinutesOfDay(c.end);
      minH = Math.min(minH, Math.floor(sMin / 60));
      maxH = Math.max(maxH, Math.ceil(eMin / 60));
    }
    return {
      startHour: Math.max(6, minH),
      endHour: Math.min(22, Math.max(minH + 4, maxH)),
    };
  }, [weekCourses]);

  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;
  const nowMinutes = getParisMinutesOfDay(nowMs);
  const showNowLineInGrid =
    nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const nowLineTop = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;

  // Bande pause déjeuner 12h00 - 13h30
  const lunchTop = Math.max(0, (12 * 60 - startHour * 60) * (HOUR_HEIGHT / 60));
  const lunchBottom = Math.min(
    gridHeight,
    (13.5 * 60 - startHour * 60) * (HOUR_HEIGHT / 60)
  );
  const lunchHeight = Math.max(0, lunchBottom - lunchTop);

  const handlePrevWeek = () => {
    haptics.tap();
    onSelectMonday(addDays(currentMonday, -7));
  };

  const handleNextWeek = () => {
    haptics.tap();
    onSelectMonday(addDays(currentMonday, 7));
  };

  const handleThisWeek = () => {
    haptics.soft();
    onSelectMonday(thisWeekMonday);
  };

  const handleToggleDisplayMode = () => {
    haptics.selection();
    setDisplayMode((prev) => (prev === "grid" ? "agenda" : "grid"));
  };

  return (
    <View style={styles.container}>
      {/* Capsule de navigation semaine en Liquid Glass + bouton bascule Grille/Agenda */}
      <GlassSurfaceContainer spacing={8} style={styles.topToolbar}>
        <GlassSurface
          glassEffectStyle="regular"
          style={styles.weekCapsule}
          fallbackStyle={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          }}
        >
          <Pressable
            onPress={handlePrevWeek}
            hitSlop={8}
            style={styles.capsuleArrowBtn}
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

          <View style={styles.weekTitleCenter}>
            <ThemedText
              type="smallBold"
              style={styles.weekHeaderTitle}
              numberOfLines={1}
            >
              {formatWeekHeader(currentMonday)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {weekCourses.length} cours • {totalHoursLabel}
            </ThemedText>
          </View>

          <Pressable
            onPress={handleNextWeek}
            hitSlop={8}
            style={styles.capsuleArrowBtn}
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

        <PressableScale
          haptic="none"
          onPress={handleToggleDisplayMode}
          accessibilityLabel={
            displayMode === "grid" ? "Passer en vue agenda" : "Passer en vue grille"
          }
        >
          <GlassSurface
            glassEffectStyle="regular"
            isInteractive={true}
            style={styles.modeToggleBtn}
            fallbackStyle={{
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            }}
          >
            <SymbolView
              name={{
                ios:
                  displayMode === "grid"
                    ? "rectangle.grid.1x2"
                    : "square.grid.2x2",
                android: displayMode === "grid" ? "view_agenda" : "grid_view",
                web: displayMode === "grid" ? "view_agenda" : "grid_view",
              }}
              size={19}
              weight="medium"
              tintColor={theme.accent}
            />
          </GlassSurface>
        </PressableScale>
      </GlassSurfaceContainer>

      {!isCurrentWeek && (
        <Pressable
          onPress={handleThisWeek}
          style={[
            styles.thisWeekPill,
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
            Revenir à cette semaine
          </ThemedText>
        </Pressable>
      )}

      {displayMode === "grid" ? (
        /* Grille horaire spacieuse défilable horizontalement sur iPhone */
        <View
          style={[
            styles.gridOuterCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.gridSplitRow}>
            {/* Rail horaire fixe à gauche */}
            <View
              style={[
                styles.fixedTimeRail,
                {
                  width: TIME_RAIL_WIDTH,
                  borderRightColor: theme.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.railCornerSpacer,
                  {
                    height: DAY_HEADER_HEIGHT,
                    borderBottomColor: theme.borderSubtle,
                  },
                ]}
              />
              <View style={{ height: gridHeight }}>
                {hoursList.map((hour, idx) => (
                  <View
                    key={`h-${hour}`}
                    style={[
                      styles.hourLabelBox,
                      { top: idx * HOUR_HEIGHT - 7 },
                    ]}
                  >
                    <ThemedText
                      type="tabular"
                      themeColor="textMuted"
                      style={styles.hourLabelText}
                    >
                      {String(hour).padStart(2, "0")}h
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* En-têtes jours + colonnes synchronisés horizontalement */}
            <ScrollView
              ref={hScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={true}
              style={styles.horizontalScroll}
            >
              <View style={{ width: totalColumnsWidth }}>
                {/* Ligne d'en-têtes jours */}
                <View
                  style={[
                    styles.gridHeadersRow,
                    {
                      height: DAY_HEADER_HEIGHT,
                      borderBottomColor: theme.borderSubtle,
                    },
                  ]}
                >
                  {visibleGridDays.map((dStr) => {
                    const { weekday, dayNum } = formatDayShort(dStr);
                    const isToday = dStr === todayStr;
                    return (
                      <Pressable
                        key={`head-${dStr}`}
                        onPress={() => {
                          haptics.selection();
                          onGoToDay?.(dStr);
                        }}
                        style={[
                          styles.gridColHeader,
                          { width: colWidth },
                          isToday && { backgroundColor: accent.subtleBg },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          style={[
                            styles.gridHeaderWeekday,
                            {
                              color: isToday
                                ? accent.primary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {weekday}
                        </ThemedText>
                        <View
                          style={[
                            styles.dayNumCircle,
                            isToday && { backgroundColor: accent.solidBg },
                          ]}
                        >
                          <ThemedText
                            type="tabular"
                            style={[
                              styles.gridHeaderNum,
                              {
                                color: isToday
                                  ? theme.textOnAccent
                                  : theme.text,
                              },
                            ]}
                          >
                            {dayNum}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Corps de la grille */}
                <View style={[styles.columnsCanvas, { height: gridHeight }]}>
                  {/* Bande subtile pause déjeuner */}
                  {lunchHeight > 0 && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.lunchBand,
                        {
                          top: lunchTop,
                          height: lunchHeight,
                          backgroundColor: theme.cardBgSubtle,
                        },
                      ]}
                    />
                  )}

                  {/* Lignes horaires horizontales */}
                  {hoursList.map((hour, idx) => (
                    <View
                      key={`line-${hour}`}
                      pointerEvents="none"
                      style={[
                        styles.hourGridLine,
                        {
                          top: idx * HOUR_HEIGHT,
                          backgroundColor: theme.borderSubtle,
                        },
                      ]}
                    />
                  ))}

                  {/* Colonnes par jour */}
                  {visibleGridDays.map((dStr, colIdx) => {
                    const isToday = dStr === todayStr;
                    const positioned = layoutDayColumns(
                      coursesByDate.get(dStr) ?? []
                    );

                    return (
                      <View
                        key={`col-${dStr}`}
                        style={[
                          styles.dayColumn,
                          {
                            width: colWidth,
                            borderLeftColor: theme.borderSubtle,
                            borderLeftWidth:
                              colIdx === 0 ? 0 : StyleSheet.hairlineWidth,
                          },
                          isToday && { backgroundColor: accent.subtleBg },
                        ]}
                      >
                        {positioned.map((p) => {
                          const top =
                            ((p.startMin - startHour * 60) / 60) * HOUR_HEIGHT +
                            1.5;
                          const height = Math.max(
                            28,
                            ((p.endMin - p.startMin) / 60) * HOUR_HEIGHT - 3
                          );
                          const leftPct = (p.col / p.totalCols) * 100;
                          const widthPct = (1 / p.totalCols) * 100;
                          const tokens = getCourseColorTokens(
                            p.course.subject,
                            p.course.kind,
                            theme
                          );
                          const isDS =
                            p.course.kind === "DS" ||
                            p.course.title.toUpperCase().includes("_DS");
                          const readable = resolveSubjectReadableName(
                            p.course.subject,
                            subjectDict
                          );
                          const displayLabel = readable
                            ? p.totalCols > 1
                              ? p.course.subject
                              : readable
                            : p.course.subject;

                          return (
                            <Pressable
                              key={p.course.key}
                              onPress={() => {
                                haptics.tap();
                                onSelectCourse(p.course);
                              }}
                              style={[
                                styles.gridEventOuter,
                                {
                                  top,
                                  height,
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.gridEventCard,
                                  {
                                    backgroundColor: theme.cardBg,
                                    borderColor: tokens.borderColor,
                                    borderLeftColor: tokens.accentColor,
                                  },
                                ]}
                              >
                                <View
                                  pointerEvents="none"
                                  style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: tokens.cardBg },
                                  ]}
                                />

                                <View style={styles.gridEventHeader}>
                                  <ThemedText
                                    type="captionBold"
                                    style={[
                                      styles.gridEventTitle,
                                      { color: tokens.textColor },
                                    ]}
                                    numberOfLines={height >= 64 ? 2 : 1}
                                  >
                                    {displayLabel}
                                  </ThemedText>
                                  {isDS && (
                                    <View
                                      style={[
                                        styles.gridDsBadge,
                                        { backgroundColor: theme.corail[100] },
                                      ]}
                                    >
                                      <ThemedText
                                        type="captionBold"
                                        style={[
                                          styles.gridDsText,
                                          { color: theme.corail[700] },
                                        ]}
                                      >
                                        DS
                                      </ThemedText>
                                    </View>
                                  )}
                                </View>

                                {height >= 42 && (
                                  <ThemedText
                                    type="captionBold"
                                    themeColor={
                                      p.course.room ? "textSecondary" : "textMuted"
                                    }
                                    style={styles.gridEventRoom}
                                    numberOfLines={1}
                                  >
                                    {p.course.room ?? "Sans salle"}
                                  </ThemedText>
                                )}

                                {height >= 62 && (
                                  <ThemedText
                                    type="tabular"
                                    themeColor="textMuted"
                                    style={styles.gridEventTime}
                                    numberOfLines={1}
                                  >
                                    {formatTimeRange(
                                      p.course.start,
                                      p.course.end
                                    )}
                                  </ThemedText>
                                )}

                                {height >= 86 && p.course.kind && !isDS && (
                                  <View
                                    style={[
                                      styles.gridKindPill,
                                      { backgroundColor: tokens.badgeBg },
                                    ]}
                                  >
                                    <ThemedText
                                      type="captionBold"
                                      style={[
                                        styles.gridKindText,
                                        { color: tokens.textColor },
                                      ]}
                                    >
                                      {p.course.kind}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                            </Pressable>
                          );
                        })}

                        {isToday && showNowLineInGrid && (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.gridNowLine,
                              {
                                top: nowLineTop,
                                backgroundColor: theme.corail[500],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.gridNowDot,
                                { backgroundColor: theme.corail[500] },
                              ]}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mode Agenda : cartes mates empilées par jour */
        <View style={styles.daysList}>
          {allWeekDays.map((dateStr) => {
            const dayList = coursesByDate.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const dayDur = formatTotalDuration(dayList);

            return (
              <View key={dateStr} style={styles.dayBlock}>
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    onGoToDay?.(dateStr);
                  }}
                  style={styles.daySectionHeader}
                >
                  <View style={styles.dayTitleWithBadge}>
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.daySectionTitle,
                        isToday && { color: accent.primary },
                      ]}
                    >
                      {formatDayHeaderCompact(dateStr)}
                    </ThemedText>
                    {isToday && (
                      <View
                        style={[
                          styles.todayBadge,
                          { backgroundColor: accent.softBg },
                        ]}
                      >
                        <ThemedText
                          type="captionBold"
                          style={[
                            styles.todayBadgeText,
                            { color: accent.text },
                          ]}
                        >
                          {"Aujourd'hui"}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <ThemedText type="caption" themeColor="textSecondary">
                    {dayList.length > 0
                      ? `${dayList.length} cours • ${dayDur}`
                      : "0 cours"}
                  </ThemedText>
                </Pressable>

                {dayList.length === 0 ? (
                  <View
                    style={[
                      styles.emptyDaySurface,
                      {
                        backgroundColor: theme.cardBgSubtle,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      themeColor="textMuted"
                      style={styles.emptyDayText}
                    >
                      Aucun cours
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.dayCoursesList}>
                    {dayList.map((course) => (
                      <CourseCard
                        key={course.key}
                        course={course}
                        compact
                        isModified={modifiedKeys?.has(course.key)}
                        isActive={
                          isToday &&
                          nowMs >= course.start &&
                          nowMs < course.end
                        }
                        isPast={isToday && nowMs >= course.end}
                        nowMs={nowMs}
                        onPress={() => onSelectCourse(course)}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  topToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weekCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  capsuleArrowBtn: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  weekTitleCenter: {
    flex: 1,
    alignItems: "center",
  },
  weekHeaderTitle: {
    fontSize: 14,
  },
  modeToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  thisWeekPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridOuterCard: {
    borderRadius: Radius.xxl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  gridSplitRow: {
    flexDirection: "row",
  },
  fixedTimeRail: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  railCornerSpacer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hourLabelBox: {
    position: "absolute",
    left: 0,
    right: 6,
    alignItems: "flex-end",
  },
  hourLabelText: {
    fontSize: 10,
    lineHeight: 14,
  },
  horizontalScroll: {
    flex: 1,
  },
  gridHeadersRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridColHeader: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  gridHeaderWeekday: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
  dayNumCircle: {
    minWidth: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  gridHeaderNum: {
    fontSize: 12,
    lineHeight: 15,
  },
  columnsCanvas: {
    flexDirection: "row",
    position: "relative",
  },
  lunchBand: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  hourGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  dayColumn: {
    position: "relative",
    height: "100%",
  },
  gridEventOuter: {
    position: "absolute",
    paddingHorizontal: 2,
  },
  gridEventCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 2,
    overflow: "hidden",
  },
  gridEventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 3,
  },
  gridEventTitle: {
    fontSize: 11.5,
    lineHeight: 14,
    flex: 1,
  },
  gridDsBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  gridDsText: {
    fontSize: 8.5,
    lineHeight: 10,
  },
  gridEventRoom: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  gridEventTime: {
    fontSize: 9.5,
    lineHeight: 12,
  },
  gridKindPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    marginTop: 1,
  },
  gridKindText: {
    fontSize: 9,
    lineHeight: 11,
  },
  gridNowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 10,
  },
  gridNowDot: {
    position: "absolute",
    left: -3.5,
    top: -2.75,
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  daysList: {
    gap: Spacing.three,
  },
  dayBlock: {
    gap: Spacing.one + 2,
  },
  daySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  dayTitleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one + 2,
  },
  daySectionTitle: {
    fontSize: 15,
  },
  todayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  todayBadgeText: {
    fontSize: 10,
  },
  emptyDaySurface: {
    borderRadius: Radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  emptyDayText: {
    fontStyle: "italic",
  },
  dayCoursesList: {
    gap: 6,
  },
});
