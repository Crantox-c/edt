import React, { useMemo, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";

import { CourseCard } from "@/components/course-card";
import { CourseDetailModal } from "@/components/course-detail-modal";
import { SearchBar } from "@/components/search-bar";
import { ThemedText } from "@/components/themed-text";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSurfaceContainer } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import { StatusBarProgressiveBlur } from "@/components/ui/status-bar-blur";
import {
  MaxContentWidth,
  Radius,
  Spacing,
  getSubjectTint,
  getTabScrollPaddingBottom,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import {
  formatDayHeaderCompact,
  formatTotalDuration,
  getParisDateString,
  getTodayParisDateString,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course, isCourseDS } from "@/lib/geii-api";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

type QuickFilter = "DS" | "TP" | "TUT" | "SAE";

const QUICK_SHORTCUTS: {
  key: QuickFilter;
  label: string;
  iosIcon: "exclamationmark.circle.fill" | "wrench.and.screwdriver.fill" | "person.2.fill" | "folder.fill";
}[] = [
  { key: "DS", label: "Prochains DS", iosIcon: "exclamationmark.circle.fill" },
  { key: "TP", label: "TP", iosIcon: "wrench.and.screwdriver.fill" },
  { key: "TUT", label: "TUT", iosIcon: "person.2.fill" },
  { key: "SAE", label: "SAÉ", iosIcon: "folder.fill" },
];

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nowMs = useCurrentTime();
  const todayStr = getTodayParisDateString();
  const { courses, modifiedKeys } = useSchedule();

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // Inventaire dynamique des matières de la classe active
  const subjectInventory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      map.set(c.subject, (map.get(c.subject) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([code, count]) => ({
        code,
        count,
        readable: resolveSubjectReadableName(code, subjectDict),
      }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [courses, subjectDict]);

  const isSearching =
    query.trim().length > 0 || quickFilter !== null || subjectFilter !== null;

  const matchedCourses = useMemo(() => {
    if (!isSearching) return [];

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return courses.filter((c) => {
      if (subjectFilter && c.subject !== subjectFilter) return false;

      if (quickFilter === "DS") {
        if (!isCourseDS(c) || c.end < nowMs) return false;
      } else if (quickFilter === "TP" || quickFilter === "TUT") {
        if (c.kind !== quickFilter) return false;
      } else if (quickFilter === "SAE") {
        if (!c.subject.toUpperCase().startsWith("SAE")) return false;
      }

      if (terms.length > 0) {
        const readable = resolveSubjectReadableName(c.subject, subjectDict) ?? "";
        const haystack = [
          c.title,
          c.teacher ?? "",
          c.subject,
          readable,
          c.room ?? "",
          c.promo ?? "",
          c.kind ?? "",
          c.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        for (const t of terms) {
          if (!haystack.includes(t)) return false;
        }
      }

      return true;
    });
  }, [courses, isSearching, query, quickFilter, subjectFilter, subjectDict, nowMs]);

  const sections = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of matchedCourses) {
      const d = getParisDateString(c.start);
      const list = map.get(d);
      if (list) list.push(c);
      else map.set(d, [c]);
    }
    return Array.from(map.entries()).map(([dateStr, list]) => ({
      dateStr,
      title: formatDayHeaderCompact(dateStr),
      isToday: dateStr === todayStr,
      duration: formatTotalDuration(list),
      data: list,
    }));
  }, [matchedCourses, todayStr]);

  const handleToggleQuick = (key: QuickFilter) => {
    haptics.soft();
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  const handleSelectSubject = (code: string) => {
    haptics.soft();
    setSubjectFilter(code);
  };

  const handleClearFilters = () => {
    haptics.selection();
    setQuickFilter(null);
    setSubjectFilter(null);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Recherche",
          headerSearchBarOptions: {
            placeholder: "Cours, prof, salle, matière...",
            cancelButtonText: "Annuler",
            placement: "automatic",
            textColor: theme.text,
            hintTextColor: theme.textMuted,
            tintColor: theme.accent,
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => {
              haptics.selection();
              setQuery("");
            },
          },
        }}
      />

      <ScrollViewMarker
        style={styles.scrollView}
        scrollEdgeEffects={{ top: "soft", bottom: "soft" }}
      >
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.content,
            Platform.OS !== "ios" && { paddingTop: insets.top + Spacing.two },
            { paddingBottom: getTabScrollPaddingBottom(insets.bottom) },
          ]}
        >
        {Platform.OS !== "ios" && (
          <SearchBar value={query} onChangeText={setQuery} />
        )}

        {/* Raccourcis rapides */}
        <View style={styles.sectionBlock}>
          <ThemedText type="overline" themeColor="textSecondary">
            Accès rapide
          </ThemedText>
          <GlassSurfaceContainer spacing={8} style={styles.shortcutsRow}>
            {QUICK_SHORTCUTS.map((item) => {
              const selected = quickFilter === item.key;
              const scale =
                item.key === "DS" ? theme.corail : theme.accentScale;
              return (
                <GlassButton
                  key={item.key}
                  haptic="none"
                  tintColor={selected ? scale[600] : theme.cardBg}
                  borderColor={selected ? scale[500] : theme.cardBorder}
                  onPress={() => handleToggleQuick(item.key)}
                  style={styles.shortcutPill}
                >
                  <SymbolView
                    name={{
                      ios: item.iosIcon,
                      android: "search",
                      web: "search",
                    }}
                    size={13}
                    tintColor={selected ? theme.textOnAccent : scale[500]}
                  />
                  <ThemedText
                    type="captionBold"
                    style={{ color: selected ? theme.textOnAccent : theme.text }}
                  >
                    {item.label}
                  </ThemedText>
                </GlassButton>
              );
            })}
          </GlassSurfaceContainer>
        </View>

        {!isSearching ? (
          /* Découverte des matières de la classe active */
          <View style={styles.sectionBlock}>
            <ThemedText type="overline" themeColor="textSecondary">
              Matières de la classe ({subjectInventory.length})
            </ThemedText>

            <View style={styles.subjectsGrid}>
              {subjectInventory.map((item) => {
                const scale = theme[getSubjectTint(item.code)];
                return (
                  <PressableScale
                    key={item.code}
                    haptic="none"
                    onPress={() => handleSelectSubject(item.code)}
                    style={[
                      styles.subjectTile,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.subjectTileHeader}>
                      <View
                        style={[
                          styles.subjectDot,
                          { backgroundColor: scale[500] },
                        ]}
                      />
                      <ThemedText
                        type="headline"
                        style={{ color: scale[700] }}
                        numberOfLines={1}
                      >
                        {item.code}
                      </ThemedText>
                      <ThemedText
                        type="tabular"
                        themeColor="textMuted"
                        style={styles.subjectCount}
                      >
                        {item.count}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="caption"
                      themeColor="textSecondary"
                      numberOfLines={1}
                    >
                      {item.readable ?? "Code matière"}
                    </ThemedText>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ) : (
          /* Résultats de recherche */
          <View style={styles.resultsBlock}>
            <View style={styles.resultsHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {matchedCourses.length}{" "}
                {matchedCourses.length > 1 ? "résultats" : "résultat"}
              </ThemedText>

              {(quickFilter !== null || subjectFilter !== null) && (
                <Pressable
                  onPress={handleClearFilters}
                  style={[
                    styles.clearFilterPill,
                    {
                      backgroundColor: theme.accentTiers.softBg,
                      borderColor: theme.accentTiers.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="captionBold"
                    style={{ color: theme.accentTiers.text }}
                  >
                    {subjectFilter ? `Matière : ${subjectFilter}` : quickFilter} ✕
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {sections.length === 0 ? (
              <View
                style={[
                  styles.emptyResultsCard,
                  {
                    backgroundColor: theme.cardBgSubtle,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search_off",
                    web: "search_off",
                  }}
                  size={26}
                  tintColor={theme.textMuted}
                />
                <ThemedText type="headline" style={styles.emptyTitle}>
                  Aucun cours trouvé
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Essayez un autre mot-clé, numéro de salle ou code matière.
                </ThemedText>
              </View>
            ) : (
              sections.map((section) => (
                <View key={section.dateStr} style={styles.sectionGroup}>
                  <View style={styles.sectionDateRow}>
                    <ThemedText
                      type="smallBold"
                      style={
                        section.isToday
                          ? { color: theme.accentTiers.primary }
                          : undefined
                      }
                    >
                      {section.title}
                    </ThemedText>
                    <ThemedText type="tabular" themeColor="textMuted">
                      {section.data.length} cours • {section.duration}
                    </ThemedText>
                  </View>

                  <View style={styles.cardsColumn}>
                    {section.data.map((course) => (
                      <CourseCard
                        key={course.key}
                        course={course}
                        isModified={modifiedKeys.has(course.key)}
                        isActive={
                          section.isToday &&
                          nowMs >= course.start &&
                          nowMs < course.end
                        }
                        isPast={nowMs >= course.end}
                        nowMs={nowMs}
                        onPress={() => setActiveCourse(course)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        </ScrollView>
      </ScrollViewMarker>

      <StatusBarProgressiveBlur />

      <CourseDetailModal
        course={activeCourse}
        visible={activeCourse !== null}
        onClose={() => setActiveCourse(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    gap: Spacing.three,
  },
  sectionBlock: {
    gap: Spacing.two,
  },
  shortcutsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  shortcutPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subjectTile: {
    width: "48.5%",
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three - 2,
    gap: 4,
  },
  subjectTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  subjectCount: {
    marginLeft: "auto",
  },
  resultsBlock: {
    gap: Spacing.three,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyResultsCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyTitle: {
    marginTop: 4,
  },
  sectionGroup: {
    gap: Spacing.one + 2,
  },
  sectionDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  cardsColumn: {
    gap: Spacing.two,
  },
});
