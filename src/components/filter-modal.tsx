import React, { useSyncExternalStore } from "react";
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
import {
  GlassSurface,
  GlassSurfaceContainer,
} from "@/components/ui/glass-surface";
import { Radius, Spacing, getSubjectTint } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { AvailableFilters, FilterCriteria } from "@/lib/filters";
import { haptics } from "@/lib/haptics";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  criteria: FilterCriteria;
  availableFilters: AvailableFilters;
  resultCount?: number;
  onUpdateCriteria: (updater: Partial<FilterCriteria>) => void;
  onToggleHiddenSubject: (subject: string) => void;
  onResetFilters: () => void;
};

export function FilterModal({
  visible,
  onClose,
  criteria,
  availableFilters,
  resultCount,
  onUpdateCriteria,
  onToggleHiddenSubject,
  onResetFilters,
}: FilterModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const accentScale = theme.accentScale;
  const corail = theme.corail;

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const renderChip = (
    key: string,
    label: string,
    isSelected: boolean,
    onPress: () => void,
    scale = accentScale
  ) => (
    <Pressable
      key={key}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? scale[100] : theme.cardBgSubtle,
          borderColor: isSelected ? scale[500] : theme.cardBorder,
        },
      ]}
    >
      <ThemedText
        type={isSelected ? "smallBold" : "small"}
        style={{ color: isSelected ? scale[700] : theme.textSecondary }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <AmbientBackground />

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          <View style={styles.headerRow}>
            <ThemedText
              type="subtitle"
              style={styles.headerTitle}
              numberOfLines={1}
            >
              Filtres
            </ThemedText>

            <GlassSurfaceContainer spacing={8} style={styles.headerActions}>
              <GlassButton
                haptic="none"
                tintColor={theme.backgroundSelected}
                borderColor={theme.border}
                onPress={() => {
                  haptics.warning();
                  onResetFilters();
                }}
                hitSlop={6}
                style={styles.resetBtn}
              >
                <ThemedText type="smallBold" style={{ color: corail[700] }}>
                  Réinitialiser
                </ThemedText>
              </GlassButton>

              <Pressable
                onPress={() => {
                  haptics.tap();
                  onClose();
                }}
                hitSlop={6}
                accessibilityLabel="Fermer"
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
                    name={{ ios: "xmark", android: "close", web: "close" }}
                    size={17}
                    weight="semibold"
                    tintColor={theme.text}
                  />
                </GlassSurface>
              </Pressable>
            </GlassSurfaceContainer>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {availableFilters.promos.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Promotion / Groupe
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip("promo-all", "Toutes", criteria.selectedPromo === null, () =>
                  onUpdateCriteria({ selectedPromo: null })
                )}
                {availableFilters.promos.map((promo) =>
                  renderChip(
                    `promo-${promo}`,
                    promo,
                    criteria.selectedPromo === promo,
                    () =>
                      onUpdateCriteria({
                        selectedPromo:
                          criteria.selectedPromo === promo ? null : promo,
                      })
                  )
                )}
              </View>
            </View>
          )}

          {availableFilters.kinds.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Type de séance
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip("kind-all", "Tous", criteria.selectedKind === null, () =>
                  onUpdateCriteria({ selectedKind: null })
                )}
                {availableFilters.kinds.map((kind) =>
                  renderChip(
                    `kind-${kind}`,
                    kind,
                    criteria.selectedKind === kind,
                    () =>
                      onUpdateCriteria({
                        selectedKind:
                          criteria.selectedKind === kind ? null : kind,
                      }),
                    kind === "DS" ? corail : accentScale
                  )
                )}
              </View>
            </View>
          )}

          {availableFilters.floors.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Étage de la salle
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip("floor-all", "Tous", criteria.selectedFloor === null, () =>
                  onUpdateCriteria({ selectedFloor: null })
                )}
                {availableFilters.floors.map((floor) =>
                  renderChip(
                    `floor-${floor}`,
                    floor === "0" ? "RDC (0)" : `${floor}e étage`,
                    criteria.selectedFloor === floor,
                    () =>
                      onUpdateCriteria({
                        selectedFloor:
                          criteria.selectedFloor === floor ? null : floor,
                      })
                  )
                )}
              </View>
            </View>
          )}

          {availableFilters.subjects.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Matière spécifique
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip(
                  "sub-all",
                  "Toutes",
                  criteria.selectedSubject === null,
                  () => onUpdateCriteria({ selectedSubject: null })
                )}
                {availableFilters.subjects.map((subject) => {
                  const readable = resolveSubjectReadableName(subject, subjectDict);
                  const label = readable ? `${subject} • ${readable}` : subject;
                  const subjectScale = theme[getSubjectTint(subject)];
                  return renderChip(
                    `sub-${subject}`,
                    label,
                    criteria.selectedSubject === subject,
                    () =>
                      onUpdateCriteria({
                        selectedSubject:
                          criteria.selectedSubject === subject ? null : subject,
                      }),
                    subjectScale
                  );
                })}
              </View>
            </View>
          )}

          {availableFilters.tags.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Sous-groupe / Tag
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip("tag-all", "Tous", criteria.selectedTag === null, () =>
                  onUpdateCriteria({ selectedTag: null })
                )}
                {availableFilters.tags.map((tag) =>
                  renderChip(`tag-${tag}`, tag, criteria.selectedTag === tag, () =>
                    onUpdateCriteria({
                      selectedTag: criteria.selectedTag === tag ? null : tag,
                    })
                  )
                )}
              </View>
            </View>
          )}

          {availableFilters.rooms.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText type="overline" themeColor="textSecondary">
                Salle
              </ThemedText>
              <View style={styles.chipsRow}>
                {renderChip("room-all", "Toutes", criteria.selectedRoom === null, () =>
                  onUpdateCriteria({ selectedRoom: null })
                )}
                {availableFilters.rooms.map((room) =>
                  renderChip(
                    `room-${room}`,
                    room,
                    criteria.selectedRoom === room,
                    () =>
                      onUpdateCriteria({
                        selectedRoom:
                          criteria.selectedRoom === room ? null : room,
                      })
                  )
                )}
              </View>
            </View>
          )}

          {availableFilters.subjects.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <View style={styles.hideTitleRow}>
                <SymbolView
                  name={{
                    ios: "eye.slash.fill",
                    android: "visibility_off",
                    web: "visibility_off",
                  }}
                  size={14}
                  tintColor={corail[500]}
                />
                <ThemedText type="overline" themeColor="textSecondary">
                  Masquer des matières
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                Touchez une matière pour l&apos;exclure de l&apos;emploi du temps.
              </ThemedText>
              <View style={styles.chipsRow}>
                {availableFilters.subjects.map((subject) => {
                  const isHidden = criteria.hiddenSubjects.includes(subject);
                  const readable = resolveSubjectReadableName(subject, subjectDict);
                  const baseLabel = readable ? `${subject} • ${readable}` : subject;
                  return renderChip(
                    `hide-${subject}`,
                    isHidden ? `${baseLabel} (masquée)` : baseLabel,
                    isHidden,
                    () => onToggleHiddenSubject(subject),
                    corail
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barre d'action fixe iOS 26 */}
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.borderSubtle,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <GlassButton
            haptic="soft"
            tintColor={theme.accentTiers.solidBg}
            borderColor={theme.accentTiers.primary}
            onPress={onClose}
            style={styles.applyFooterBtn}
          >
            <ThemedText type="headline" style={{ color: theme.textOnAccent }}>
              {resultCount !== undefined
                ? `Afficher ${resultCount} cours`
                : "Appliquer les filtres"}
            </ThemedText>
          </GlassButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerTitle: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexShrink: 0,
  },
  resetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  footerBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyFooterBtn: {
    minHeight: 50,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  sectionCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: Spacing.two + 5,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
