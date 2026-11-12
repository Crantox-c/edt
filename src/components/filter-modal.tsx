import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { AvailableFilters, FilterCriteria } from "@/lib/filters";

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  criteria: FilterCriteria;
  availableFilters: AvailableFilters;
  onUpdateCriteria: (updater: Partial<FilterCriteria>) => void;
  onToggleHiddenSubject: (subject: string) => void;
  onResetFilters: () => void;
};

export function FilterModal({
  visible,
  onClose,
  criteria,
  availableFilters,
  onUpdateCriteria,
  onToggleHiddenSubject,
  onResetFilters,
}: FilterModalProps) {
  const theme = useTheme();
  const glacier = theme.glacier;
  const corail = theme.corail;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Filtres
            </ThemedText>

            <View style={styles.headerActions}>
              <Pressable onPress={onResetFilters} style={styles.resetBtn}>
                <ThemedText type="smallBold" style={{ color: corail[600] }}>
                  Réinitialiser
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={onClose}
                style={[styles.applyBtn, { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText type="smallBold">Appliquer</ThemedText>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* 1. Promotion */}
            {availableFilters.promos.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  PROMOTION
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedPromo: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedPromo === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedPromo === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Toutes
                    </ThemedText>
                  </Pressable>

                  {availableFilters.promos.map((promo) => {
                    const isSelected = criteria.selectedPromo === promo;
                    return (
                      <Pressable
                        key={promo}
                        onPress={() =>
                          onUpdateCriteria({ selectedPromo: isSelected ? null : promo })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {promo}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. Type de cours (kind) */}
            {availableFilters.kinds.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  TYPE DE COURS
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedKind: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedKind === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedKind === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Tous
                    </ThemedText>
                  </Pressable>

                  {availableFilters.kinds.map((kind) => {
                    const isSelected = criteria.selectedKind === kind;
                    return (
                      <Pressable
                        key={kind}
                        onPress={() =>
                          onUpdateCriteria({ selectedKind: isSelected ? null : kind })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {kind}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. Étage */}
            {availableFilters.floors.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ÉTAGE DE LA SALLE
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedFloor: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedFloor === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedFloor === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Tous
                    </ThemedText>
                  </Pressable>

                  {availableFilters.floors.map((floor) => {
                    const isSelected = criteria.selectedFloor === floor;
                    const label = floor === "0" ? "RDC (0)" : `${floor}e étage`;
                    return (
                      <Pressable
                        key={floor}
                        onPress={() =>
                          onUpdateCriteria({ selectedFloor: isSelected ? null : floor })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. Matière spécifique */}
            {availableFilters.subjects.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  MATIÈRE SPÉCIFIQUE
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedSubject: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedSubject === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedSubject === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Toutes
                    </ThemedText>
                  </Pressable>

                  {availableFilters.subjects.map((subject) => {
                    const isSelected = criteria.selectedSubject === subject;
                    return (
                      <Pressable
                        key={subject}
                        onPress={() =>
                          onUpdateCriteria({ selectedSubject: isSelected ? null : subject })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {subject}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 5. Sous-groupe / Tag */}
            {availableFilters.tags.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  SOUS-GROUPE / TAG
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedTag: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedTag === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedTag === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Tous
                    </ThemedText>
                  </Pressable>

                  {availableFilters.tags.map((tag) => {
                    const isSelected = criteria.selectedTag === tag;
                    return (
                      <Pressable
                        key={tag}
                        onPress={() =>
                          onUpdateCriteria({ selectedTag: isSelected ? null : tag })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {tag}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 6. Salle spécifique */}
            {availableFilters.rooms.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  SALLE
                </ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => onUpdateCriteria({ selectedRoom: null })}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      criteria.selectedRoom === null && {
                        backgroundColor: glacier[100],
                        borderColor: glacier[500],
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={criteria.selectedRoom === null ? { color: glacier[700], fontWeight: "600" } : undefined}
                    >
                      Toutes
                    </ThemedText>
                  </Pressable>

                  {availableFilters.rooms.map((room) => {
                    const isSelected = criteria.selectedRoom === room;
                    return (
                      <Pressable
                        key={room}
                        onPress={() =>
                          onUpdateCriteria({ selectedRoom: isSelected ? null : room })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isSelected && {
                            backgroundColor: glacier[100],
                            borderColor: glacier[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isSelected ? { color: glacier[700], fontWeight: "600" } : undefined}
                        >
                          {room}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 7. Masquer des matières */}
            {availableFilters.subjects.length > 0 && (
              <View style={styles.section}>
                <View>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    MASQUER UNE MATIÈRE
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.subtext}>
                    Touchez une matière pour la masquer totalement de l&apos;emploi du temps.
                  </ThemedText>
                </View>

                <View style={styles.chipsRow}>
                  {availableFilters.subjects.map((subject) => {
                    const isHidden = criteria.hiddenSubjects.includes(subject);
                    return (
                      <Pressable
                        key={subject}
                        onPress={() => onToggleHiddenSubject(subject)}
                        style={[
                          styles.chip,
                          { backgroundColor: theme.backgroundElement },
                          isHidden && {
                            backgroundColor: corail[100],
                            borderColor: corail[500],
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={isHidden ? { color: corail[700], fontWeight: "600" } : undefined}
                        >
                          {isHidden ? `🚫 ${subject} (masquée)` : subject}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  resetBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  applyBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one * 1.5,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
