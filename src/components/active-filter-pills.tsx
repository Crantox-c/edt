import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { FilterCriteria } from "@/lib/filters";

export type ActiveFilterPillsProps = {
  criteria: FilterCriteria;
  onClearPromo: () => void;
  onClearKind: () => void;
  onClearSubject: () => void;
  onClearTag: () => void;
  onClearRoom: () => void;
  onClearFloor: () => void;
  onClearHiddenSubjects: () => void;
  onClearAll: () => void;
};

export function ActiveFilterPills({
  criteria,
  onClearPromo,
  onClearKind,
  onClearSubject,
  onClearTag,
  onClearRoom,
  onClearFloor,
  onClearHiddenSubjects,
  onClearAll,
}: ActiveFilterPillsProps) {
  const theme = useTheme();
  const glacier = theme.glacier;
  const ambre = theme.ambre;
  const corail = theme.corail;

  const hasAnyFilter =
    Boolean(criteria.selectedPromo) ||
    Boolean(criteria.selectedKind) ||
    Boolean(criteria.selectedSubject) ||
    Boolean(criteria.selectedTag) ||
    Boolean(criteria.selectedRoom) ||
    Boolean(criteria.selectedFloor) ||
    criteria.hiddenSubjects.length > 0;

  if (!hasAnyFilter) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {criteria.selectedPromo && (
        <Pressable
          onPress={onClearPromo}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Promo: {criteria.selectedPromo} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.selectedKind && (
        <Pressable
          onPress={onClearKind}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Type: {criteria.selectedKind} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.selectedSubject && (
        <Pressable
          onPress={onClearSubject}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Matière: {criteria.selectedSubject} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.selectedTag && (
        <Pressable
          onPress={onClearTag}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Tag: {criteria.selectedTag} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.selectedFloor && (
        <Pressable
          onPress={onClearFloor}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Étage: {criteria.selectedFloor === "0" ? "RDC" : `${criteria.selectedFloor}e`} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.selectedRoom && (
        <Pressable
          onPress={onClearRoom}
          style={[
            styles.pill,
            { backgroundColor: glacier[50], borderColor: glacier[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: glacier[700] }}>
            Salle: {criteria.selectedRoom} ✕
          </ThemedText>
        </Pressable>
      )}

      {criteria.hiddenSubjects.length > 0 && (
        <Pressable
          onPress={onClearHiddenSubjects}
          style={[
            styles.pill,
            { backgroundColor: ambre[50], borderColor: ambre[300] },
          ]}
        >
          <ThemedText type="small" style={{ color: ambre[700] }}>
            {criteria.hiddenSubjects.length} masquée(s) ✕
          </ThemedText>
        </Pressable>
      )}

      <Pressable onPress={onClearAll} style={styles.clearAllBtn}>
        <ThemedText type="smallBold" style={{ color: corail[600], fontSize: 12 }}>
          Effacer tout
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingBottom: Spacing.one,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.one * 1.5,
    borderWidth: 1,
  },
  clearAllBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
});
