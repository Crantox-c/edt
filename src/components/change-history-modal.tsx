import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Radius, Spacing, type Scale7 } from "@/constants/theme";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import {
  type ScheduleChangeItem,
  type ScheduleChangeKind,
  formatChangeItemSummary,
} from "@/lib/change-history";
import {
  addDays,
  formatDayHeaderCompact,
  formatTime,
  getParisDateString,
  getTodayParisDateString,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import {
  getSubjectDictionarySnapshot,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type ChangeHistoryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectCourse?: (courseKey: string) => void;
};

type HistoryFilter = "all" | "urgent" | "room" | "time" | "added_removed";

const FILTER_OPTIONS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "urgent", label: "< 48h" },
  { key: "room", label: "Salles" },
  { key: "time", label: "Horaires" },
  { key: "added_removed", label: "Ajouts / Annulés" },
];

function formatBatchHeading(detectedAtMs: number): string {
  const dateStr = getParisDateString(detectedAtMs);
  const todayStr = getTodayParisDateString();
  const yesterdayStr = addDays(todayStr, -1);
  const timeStr = formatTime(detectedAtMs);

  if (dateStr === todayStr) {
    return `Détecté aujourd'hui à ${timeStr}`;
  }
  if (dateStr === yesterdayStr) {
    return `Détecté hier à ${timeStr}`;
  }
  return `Détecté le ${formatDayHeaderCompact(dateStr)} à ${timeStr}`;
}

function getKindVisuals(
  kind: ScheduleChangeKind,
  theme: ReturnType<typeof useTheme>
): {
  scale: Scale7;
  iosIcon:
    | "arrow.left.arrow.right"
    | "clock.arrow.2.circlepath"
    | "plus.circle.fill"
    | "minus.circle.fill";
  fallbackIcon: "swap_horiz" | "schedule" | "add_circle" | "remove_circle";
} {
  switch (kind) {
    case "room_changed":
      return {
        scale: theme.ambre,
        iosIcon: "arrow.left.arrow.right",
        fallbackIcon: "swap_horiz",
      };
    case "time_changed":
      return {
        scale: theme.violet,
        iosIcon: "clock.arrow.2.circlepath",
        fallbackIcon: "schedule",
      };
    case "added":
      return {
        scale: theme.menthe,
        iosIcon: "plus.circle.fill",
        fallbackIcon: "add_circle",
      };
    case "removed":
      return {
        scale: theme.corail,
        iosIcon: "minus.circle.fill",
        fallbackIcon: "remove_circle",
      };
  }
}

function matchesHistoryFilter(
  item: ScheduleChangeItem,
  filter: HistoryFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "urgent":
      return item.isWithin48h;
    case "room":
      return item.kind === "room_changed";
    case "time":
      return item.kind === "time_changed";
    case "added_removed":
      return item.kind === "added" || item.kind === "removed";
  }
}

export function ChangeHistoryModal({
  visible,
  onClose,
  onSelectCourse,
}: ChangeHistoryModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const accent = theme.accentTiers;

  const {
    activeGroup,
    courses,
    changeHistory,
    unreadChangesCount,
    markChangesRead,
    clearChangesHistory,
  } = useSchedule();

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");

  const existingCourseKeys = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      set.add(c.key);
    }
    return set;
  }, [courses]);

  const filteredBatches = useMemo(() => {
    return changeHistory
      .map((batch) => ({
        ...batch,
        items: batch.items.filter((item) =>
          matchesHistoryFilter(item, activeFilter)
        ),
      }))
      .filter((batch) => batch.items.length > 0);
  }, [changeHistory, activeFilter]);

  const handleClose = () => {
    haptics.tap();
    if (unreadChangesCount > 0) {
      void markChangesRead();
    }
    onClose();
  };

  const handlePressItem = (item: ScheduleChangeItem) => {
    if (item.kind === "removed" || !existingCourseKeys.has(item.courseKey)) {
      return;
    }
    haptics.soft();
    if (unreadChangesCount > 0) {
      void markChangesRead();
    }
    if (onSelectCourse) {
      onSelectCourse(item.courseKey);
    }
  };

  const handleClear = () => {
    haptics.warning();
    void clearChangesHistory();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <AmbientBackground />

        <View
          style={[
            styles.sheetHeader,
            Platform.OS !== "ios" && { paddingTop: insets.top + Spacing.two },
          ]}
        >
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitles}>
              <ThemedText type="overline" themeColor="accent">
                {activeGroup.text}
              </ThemedText>
              <ThemedText type="title">Historique des changements</ThemedText>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={6}
              accessibilityLabel="Fermer l'historique"
            >
              <GlassSurface
                glassEffectStyle="regular"
                isInteractive={true}
                style={styles.closeCircle}
                fallbackStyle={{
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                }}
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  size={15}
                  weight="semibold"
                  tintColor={theme.text}
                />
              </GlassSurface>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FILTER_OPTIONS.map((opt) => {
              const selected = activeFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    haptics.selection();
                    setActiveFilter(opt.key);
                  }}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: selected
                        ? accent.solidBg
                        : theme.cardBgSubtle,
                      borderColor: selected
                        ? accent.primary
                        : theme.cardBorder,
                    },
                  ]}
                >
                  <ThemedText
                    type="captionBold"
                    style={{
                      color: selected ? theme.textOnAccent : theme.textSecondary,
                    }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, Spacing.four) + Spacing.three },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {changeHistory.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <SymbolView
                name={{
                  ios: "checkmark.seal.fill",
                  android: "verified",
                  web: "verified",
                }}
                size={30}
                tintColor={theme.menthe[500]}
              />
              <ThemedText type="headline" style={styles.emptyTitle}>
                Aucune modification enregistrée
              </ThemedText>
              <ThemedText
                type="caption"
                themeColor="textSecondary"
                style={styles.emptySubtitle}
              >
                Les changements de salle, d&apos;horaire, ajouts ou annulations détectés lors des synchronisations apparaîtront ici.
              </ThemedText>
            </View>
          ) : filteredBatches.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <SymbolView
                name={{
                  ios: "line.3.horizontal.decrease.circle",
                  android: "filter_list_off",
                  web: "filter_list_off",
                }}
                size={28}
                tintColor={theme.textMuted}
              />
              <ThemedText type="headline" style={styles.emptyTitle}>
                Aucun résultat pour ce filtre
              </ThemedText>
              <ThemedText
                type="caption"
                themeColor="textSecondary"
                style={styles.emptySubtitle}
              >
                Essayez un autre type de changement ci-dessus.
              </ThemedText>
            </View>
          ) : (
            filteredBatches.map((batch) => (
              <View key={batch.id} style={styles.batchBlock}>
                <View style={styles.batchHeaderRow}>
                  <ThemedText type="captionBold" themeColor="textSecondary">
                    {formatBatchHeading(batch.detectedAtMs)}
                  </ThemedText>
                  {batch.unread && (
                    <View
                      style={[
                        styles.newBadge,
                        {
                          backgroundColor: accent.softBg,
                          borderColor: accent.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="captionBold"
                        style={{ color: accent.text }}
                      >
                        Nouveau
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.itemsColumn}>
                  {batch.items.map((item) => {
                    const visual = getKindVisuals(item.kind, theme);
                    const summary = formatChangeItemSummary(item, subjectDict);
                    const canNavigate =
                      Boolean(onSelectCourse) &&
                      item.kind !== "removed" &&
                      existingCourseKeys.has(item.courseKey);

                    return (
                      <Pressable
                        key={item.id}
                        disabled={!canNavigate}
                        onPress={() => handlePressItem(item)}
                        style={({ pressed }) => [
                          styles.itemCard,
                          {
                            backgroundColor: theme.cardBg,
                            borderColor: item.isWithin48h
                              ? theme.corail[300]
                              : theme.cardBorder,
                            opacity: pressed && canNavigate ? 0.8 : 1,
                          },
                        ]}
                      >
                        <View style={styles.itemTopRow}>
                          <View
                            style={[
                              styles.kindPill,
                              { backgroundColor: visual.scale[100] },
                            ]}
                          >
                            <SymbolView
                              name={{
                                ios: visual.iosIcon,
                                android: visual.fallbackIcon,
                                web: visual.fallbackIcon,
                              }}
                              size={12}
                              tintColor={visual.scale[700]}
                            />
                            <ThemedText
                              type="captionBold"
                              style={{ color: visual.scale[700] }}
                            >
                              {summary.badgeLabel}
                            </ThemedText>
                          </View>

                          <View style={styles.itemRightTags}>
                            {item.isDS && (
                              <View
                                style={[
                                  styles.urgentPill,
                                  { backgroundColor: theme.corail[100] },
                                ]}
                              >
                                <ThemedText
                                  type="captionBold"
                                  style={{ color: theme.corail[700] }}
                                >
                                  DS
                                </ThemedText>
                              </View>
                            )}
                            {item.isWithin48h && (
                              <View
                                style={[
                                  styles.urgentPill,
                                  { backgroundColor: theme.corail[100] },
                                ]}
                              >
                                <ThemedText
                                  type="captionBold"
                                  style={{ color: theme.corail[700] }}
                                >
                                  &lt; 48h
                                </ThemedText>
                              </View>
                            )}
                            {canNavigate && (
                              <SymbolView
                                name={{
                                  ios: "chevron.right",
                                  android: "chevron_right",
                                  web: "chevron_right",
                                }}
                                size={12}
                                tintColor={theme.textMuted}
                              />
                            )}
                          </View>
                        </View>

                        <ThemedText type="headline" numberOfLines={2}>
                          {summary.headline}
                        </ThemedText>

                        <ThemedText
                          type="caption"
                          themeColor="textSecondary"
                          numberOfLines={3}
                        >
                          {summary.detail}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {changeHistory.length > 0 && (
            <GlassButton
              haptic="none"
              tintColor={theme.corail[100]}
              borderColor={theme.corail[500]}
              onPress={handleClear}
              style={styles.clearBtn}
            >
              <ThemedText
                type="captionBold"
                style={{ color: theme.corail[700] }}
              >
                Effacer l&apos;historique
              </ThemedText>
            </GlassButton>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetHeader: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
    alignSelf: "center",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerTitles: {
    flex: 1,
    gap: 2,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  emptyCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  batchBlock: {
    gap: Spacing.two,
  },
  batchHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemsColumn: {
    gap: Spacing.two,
  },
  itemCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: 6,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  kindPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  itemRightTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urgentPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  clearBtn: {
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
