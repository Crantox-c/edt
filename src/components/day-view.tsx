import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { EdrText, isEdrTextAvailable } from "@/components/ui/edr-text";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSurface } from "@/components/ui/glass-surface";
import {
  PhosphorDayStrip,
  isPhosphorDayStripAvailable,
  type PhosphorDayItem,
  type PhosphorDaySelectEvent,
} from "@/components/ui/phosphor-day-strip";
import {
  FontFamilies,
  Radius,
  Spacing,
  getSubjectTint,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import {
  addDays,
  formatDayHeaderCompact,
  formatDayShort,
  formatGapBetween,
  formatTotalDuration,
  getParisDateString,
  getTodayParisDateString,
} from "@/lib/dates";
import { haptics, useHapticsPreference } from "@/lib/haptics";
import { Course } from "@/lib/geii-api";
import { CourseCard } from "./course-card";
import { NowIndicator } from "./now-indicator";

const DAY_ITEM_WIDTH = 58;
const DAY_STRIP_HEIGHT = 50;
const DAY_SELECT_DEBOUNCE_MS = 95;

function diffDaysParis(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split("-").map(Number);
  const [y2, m2, d2] = toStr.split("-").map(Number);
  return Math.round(
    (Date.UTC(y2, m2 - 1, d2, 12, 0, 0) -
      Date.UTC(y1, m1 - 1, d1, 12, 0, 0)) /
      86400000
  );
}

export type DayViewProps = {
  courses: Course[];
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  onSelectCourse: (course: Course) => void;
  modifiedKeys?: Set<string>;
  isLoadingWeek?: boolean;
};

export function DayView({
  courses,
  selectedDate,
  onSelectDate,
  onSelectCourse,
  modifiedKeys,
  isLoadingWeek = false,
}: DayViewProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;
  const { isReduced } = useReducedMotion();
  const { enabled: hapticsEnabled } = useHapticsPreference();
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const isToday = selectedDate === todayStr;
  const useNativePhosphorStrip = isPhosphorDayStripAvailable();
  const useHardwareEdr = isEdrTextAvailable() && theme.isDark;

  const listRef = useRef<FlatList<string>>(null);
  const hasCenteredRef = useRef(false);
  const isUserScrollingRef = useRef(false);
  const lastCenterIndexRef = useRef(-1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stripWidth, setStripWidth] = useState(0);
  const [visualSelectedDate, setVisualSelectedDate] = useState<string | null>(
    null
  );

  const activeVisualDate = visualSelectedDate ?? selectedDate;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const dayCourses = useMemo(() => {
    return courses.filter((c) => getParisDateString(c.start) === selectedDate);
  }, [courses, selectedDate]);

  // Plage continue de jours pour le scroll horizontal dynamique
  const daysList = useMemo(() => {
    let earliestCourseStr: string | null = null;
    let latestCourseStr: string | null = null;
    for (const c of courses) {
      const d = getParisDateString(c.start);
      if (!earliestCourseStr || d < earliestCourseStr) earliestCourseStr = d;
      if (!latestCourseStr || d > latestCourseStr) latestCourseStr = d;
    }

    const minCandidates = [addDays(todayStr, -28), addDays(selectedDate, -14)];
    if (earliestCourseStr) {
      minCandidates.push(addDays(earliestCourseStr, -7));
    }
    const maxCandidates = [addDays(todayStr, 60), addDays(selectedDate, 14)];
    if (latestCourseStr) {
      maxCandidates.push(addDays(latestCourseStr, 14));
    }

    let startStr = minCandidates.reduce((a, b) => (a < b ? a : b));
    const endStr = maxCandidates.reduce((a, b) => (a > b ? a : b));
    const rawSpan = diffDaysParis(startStr, endStr) + 1;
    const count = Math.min(365, Math.max(30, rawSpan));

    const offsetOfSelected = diffDaysParis(startStr, selectedDate);
    if (offsetOfSelected < 0 || offsetOfSelected >= count) {
      startStr = addDays(selectedDate, -Math.floor(count / 2));
    }

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(addDays(startStr, i));
    }
    return result;
  }, [courses, todayStr, selectedDate]);

  const selectedIndex = useMemo(() => {
    const idx = diffDaysParis(daysList[0], selectedDate);
    return Math.max(0, Math.min(daysList.length - 1, idx));
  }, [daysList, selectedDate]);

  const sidePadding =
    stripWidth > 0 ? Math.max(0, (stripWidth - DAY_ITEM_WIDTH) / 2) : 0;

  useEffect(() => {
    if (useNativePhosphorStrip || stripWidth <= 0) return;
    if (isUserScrollingRef.current) return;
    const targetOffset = selectedIndex * DAY_ITEM_WIDTH;
    const animated = hasCenteredRef.current && !isReduced;
    hasCenteredRef.current = true;
    lastCenterIndexRef.current = selectedIndex;
    listRef.current?.scrollToOffset({ offset: targetOffset, animated });
  }, [selectedIndex, stripWidth, isReduced, useNativePhosphorStrip]);

  // Jusqu'à 3 pastilles de couleur matière par jour sur la bande scrollable
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

  // Données structurées pour le sélecteur natif Metal EDR (Phosphor Trail)
  const phosphorDays = useMemo<PhosphorDayItem[]>(
    () =>
      daysList.map((dStr) => {
        const { weekday, dayNum } = formatDayShort(dStr);
        return {
          date: dStr,
          weekday,
          dayNum,
          isToday: dStr === todayStr,
          dots: dayTintsMap.get(dStr) ?? [],
        };
      }),
    [daysList, todayStr, dayTintsMap]
  );

  // Prochain jour avec un cours après la date sélectionnée (saut rapide sur jour libre)
  const nextActiveDate = useMemo(() => {
    const next = courses.find(
      (c) => getParisDateString(c.start) > selectedDate
    );
    return next ? getParisDateString(next.start) : null;
  }, [courses, selectedDate]);

  const handleToday = () => {
    haptics.soft();
    setVisualSelectedDate(null);
    onSelectDate(todayStr);
  };

  const handleNativeSelectDay = useCallback(
    (e: PhosphorDaySelectEvent) => {
      const nextDate = e.nativeEvent?.date;
      if (nextDate && nextDate !== selectedDate) {
        onSelectDate(nextDate);
      }
    },
    [onSelectDate, selectedDate]
  );

  const scheduleDebouncedSelect = useCallback(
    (dateStr: string) => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        setVisualSelectedDate(null);
        onSelectDate(dateStr);
      }, DAY_SELECT_DEBOUNCE_MS);
    },
    [onSelectDate]
  );

  const flushFallbackSelection = useCallback(
    (offsetX: number) => {
      const idx = Math.max(
        0,
        Math.min(daysList.length - 1, Math.round(offsetX / DAY_ITEM_WIDTH))
      );
      const targetDate = daysList[idx];
      if (!targetDate) return;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      lastCenterIndexRef.current = idx;
      setVisualSelectedDate(null);
      if (targetDate !== selectedDate) {
        onSelectDate(targetDate);
      }
    },
    [daysList, onSelectDate, selectedDate]
  );

  const handleTapDay = useCallback(
    (dStr: string, index: number) => {
      listRef.current?.scrollToOffset({
        offset: index * DAY_ITEM_WIDTH,
        animated: !isReduced,
      });
      if (dStr !== activeVisualDate) {
        haptics.selection();
        setVisualSelectedDate(dStr);
        scheduleDebouncedSelect(dStr);
      }
    },
    [activeVisualDate, isReduced, scheduleDebouncedSelect]
  );

  const handleStripLayout = useCallback((e: LayoutChangeEvent) => {
    setStripWidth(e.nativeEvent.layout.width);
  }, []);

  const handleStripScrollBeginDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrollingRef.current = true;
      lastCenterIndexRef.current = Math.max(
        0,
        Math.min(
          daysList.length - 1,
          Math.round(e.nativeEvent.contentOffset.x / DAY_ITEM_WIDTH)
        )
      );
    },
    [daysList.length]
  );

  const handleStripScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (daysList.length === 0) return;
      const centerIdx = Math.max(
        0,
        Math.min(
          daysList.length - 1,
          Math.round(e.nativeEvent.contentOffset.x / DAY_ITEM_WIDTH)
        )
      );
      if (centerIdx === lastCenterIndexRef.current) return;
      lastCenterIndexRef.current = centerIdx;

      const centeredDate = daysList[centerIdx];
      if (!centeredDate) return;

      setVisualSelectedDate(centeredDate);
      if (isUserScrollingRef.current) {
        haptics.selection();
        scheduleDebouncedSelect(centeredDate);
      }
    },
    [daysList, scheduleDebouncedSelect]
  );

  const handleStripMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrollingRef.current = false;
      flushFallbackSelection(e.nativeEvent.contentOffset.x);
    },
    [flushFallbackSelection]
  );

  const handleStripScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) {
        isUserScrollingRef.current = false;
        flushFallbackSelection(e.nativeEvent.contentOffset.x);
      }
    },
    [flushFallbackSelection]
  );

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

  const renderDayItem = useCallback(
    ({ item: dStr, index }: { item: string; index: number }) => {
      const { weekday, dayNum } = formatDayShort(dStr);
      const isSelected = dStr === activeVisualDate;
      const isCurrentDay = dStr === todayStr;
      const dots = dayTintsMap.get(dStr) ?? [];

      return (
        <Pressable
          onPress={() => handleTapDay(dStr, index)}
          style={styles.dayTab}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={formatDayHeaderCompact(dStr)}
        >
          {isSelected && !useHardwareEdr && (
            <View
              pointerEvents="none"
              style={[
                styles.selectedGlow,
                {
                  backgroundImage: `radial-gradient(circle at 50% 54%, ${theme.daySelectedGlow} 0%, transparent 72%)`,
                },
              ]}
            />
          )}

          <ThemedText
            type="captionBold"
            style={[
              styles.dayTabWeekday,
              {
                fontFamily: isSelected
                  ? FontFamilies.displayBold
                  : FontFamilies.bodyMedium,
                color: isSelected ? accent.primary : theme.textSecondary,
              },
            ]}
          >
            {weekday}
          </ThemedText>

          {isSelected && useHardwareEdr ? (
            <EdrText
              text={dayNum}
              color={theme.daySelectedNumber}
              linearExposure={3.0}
              fontSize={16.5}
              fontFamily={FontFamilies.displayBold}
              glowColor={accent.primary}
              glowRadius={6}
              style={styles.edrDayNumber}
            />
          ) : (
            <ThemedText
              type="tabular"
              style={[
                styles.dayTabNumber,
                {
                  color: isSelected
                    ? theme.daySelectedNumber
                    : isCurrentDay
                      ? accent.primary
                      : theme.text,
                  fontFamily: isSelected
                    ? FontFamilies.displayBold
                    : FontFamilies.monoMedium,
                },
                isSelected && {
                  textShadowColor: theme.isDark ? accent.primary : accent.border,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: theme.isDark ? 12 : 6,
                },
              ]}
            >
              {dayNum}
            </ThemedText>
          )}

          <View style={styles.dotsRow}>
            {dots.length > 0 ? (
              dots.map((dotColor, i) => (
                <View
                  key={`${dStr}-dot-${i}`}
                  style={[
                    styles.courseDot,
                    {
                      backgroundColor: isSelected
                        ? theme.daySelectedNumber
                        : dotColor,
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
    },
    [
      accent.border,
      accent.primary,
      activeVisualDate,
      dayTintsMap,
      handleTapDay,
      theme,
      todayStr,
      useHardwareEdr,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Pilule de jours centrée : fond Liquid Glass en frère + couche Metal EDR sans masque 8-bit */}
      <View style={styles.weekStripOuter}>
        <GlassSurface
          glassEffectStyle="regular"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.weekStripGlassBg]}
          fallbackStyle={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          }}
        />
        {useNativePhosphorStrip ? (
          <PhosphorDayStrip
            days={phosphorDays}
            selectedIndex={selectedIndex}
            itemWidth={DAY_ITEM_WIDTH}
            accentColor={accent.primary}
            selectedTextColor={theme.daySelectedNumber}
            weekdayColor={theme.textSecondary}
            numberColor={theme.text}
            todayColor={accent.primary}
            isDark={theme.isDark}
            hapticsEnabled={hapticsEnabled}
            reducedMotion={isReduced}
            onSelectDay={handleNativeSelectDay}
            style={styles.phosphorStrip}
          />
        ) : (
          <View style={styles.daysListMask} onLayout={handleStripLayout}>
            <FlatList
              ref={listRef}
              horizontal
              data={daysList}
              keyExtractor={(item) => item}
              renderItem={renderDayItem}
              extraData={{ activeVisualDate, dayTintsMap, theme, useHardwareEdr }}
              contentContainerStyle={{ paddingHorizontal: sidePadding }}
              showsHorizontalScrollIndicator={false}
              decelerationRate="normal"
              snapToInterval={DAY_ITEM_WIDTH}
              snapToAlignment="start"
              scrollEventThrottle={16}
              onScrollBeginDrag={handleStripScrollBeginDrag}
              onScroll={handleStripScroll}
              onScrollEndDrag={handleStripScrollEndDrag}
              onMomentumScrollEnd={handleStripMomentumEnd}
              initialNumToRender={15}
              windowSize={5}
              getItemLayout={(_, index) => ({
                length: DAY_ITEM_WIDTH,
                offset: sidePadding + DAY_ITEM_WIDTH * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({
                  offset: info.index * DAY_ITEM_WIDTH,
                  animated: false,
                });
              }}
            />
          </View>
        )}
      </View>

      {/* En-tête du jour sélectionné + résumé volume horaire */}
      <View style={styles.dayHeaderRow}>
        <ThemedText type="headline">
          {formatDayHeaderCompact(selectedDate)}
        </ThemedText>

        <View style={styles.dayHeaderRight}>
          {!isToday && (
            <GlassButton
              haptic="none"
              tintColor={accent.solidBg}
              borderColor={accent.primary}
              onPress={handleToday}
              style={styles.todayPill}
            >
              <SymbolView
                name={{
                  ios: "arrow.uturn.backward",
                  android: "today",
                  web: "today",
                }}
                size={11}
                tintColor={theme.textOnAccent}
              />
              <ThemedText
                type="captionBold"
                style={{ color: theme.textOnAccent }}
              >
                {"Aujourd'hui"}
              </ThemedText>
            </GlassButton>
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
        isLoadingWeek ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.cardBgSubtle,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              Chargement de la semaine...
            </ThemedText>
          </View>
        ) : (
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
            <GlassButton
              haptic="soft"
              tintColor={accent.solidBg}
              borderColor={accent.primary}
              onPress={() => onSelectDate(nextActiveDate)}
              containerStyle={styles.jumpNextContainer}
              style={styles.jumpNextBtn}
            >
              <ThemedText
                type="captionBold"
                style={{ color: theme.textOnAccent }}
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
                tintColor={theme.textOnAccent}
              />
            </GlassButton>
          )}

          {isToday && <NowIndicator />}
        </View>
        )
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
  weekStripOuter: {
    width: "90%",
    maxWidth: 356,
    height: DAY_STRIP_HEIGHT,
    alignSelf: "center",
    position: "relative",
  },
  weekStripGlassBg: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  phosphorStrip: {
    flex: 1,
    width: "100%",
    height: DAY_STRIP_HEIGHT,
  },
  daysListMask: {
    flex: 1,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  dayTab: {
    width: DAY_ITEM_WIDTH,
    height: DAY_STRIP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 1,
  },
  selectedGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: Radius.pill,
  },
  dayTabWeekday: {
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: 0.3,
  },
  dayTabNumber: {
    fontSize: 15,
    lineHeight: 17,
  },
  edrDayNumber: {
    width: 34,
    height: 19,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2.5,
    height: 4,
    marginTop: 1,
  },
  courseDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: Radius.pill,
  },
  dotPlaceholder: {
    width: 3.5,
    height: 3.5,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
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
  jumpNextContainer: {
    marginTop: Spacing.two,
  },
  jumpNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
});
