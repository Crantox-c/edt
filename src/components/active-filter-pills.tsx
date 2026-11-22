import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { FilterCriteria } from "@/lib/filters";
import { haptics } from "@/lib/haptics";

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
  const accentScale = theme.accentScale;
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

  const renderPill = (
    label: string,
    onPress: () => void,
    scale = accentScale
  ) => (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.pill,
        { backgroundColor: scale[100], borderColor: scale[300] },
      ]}
    >
      <ThemedText
        type="captionBold"
        style={{ color: scale[700] }}
      >
        {label}
      </ThemedText>
      <SymbolView
        name={{ ios: "xmark", android: "close", web: "close" }}
        size={10}
        weight="bold"
        tintColor={scale[700]}
      />
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {criteria.selectedPromo &&
        renderPill(`Promo: ${criteria.selectedPromo}`, onClearPromo)}

      {criteria.selectedKind &&
        renderPill(`Type: ${criteria.selectedKind}`, onClearKind)}

      {criteria.selectedSubject &&
        renderPill(`Matière: ${criteria.selectedSubject}`, onClearSubject)}

      {criteria.selectedTag &&
        renderPill(`Tag: ${criteria.selectedTag}`, onClearTag)}

      {criteria.selectedFloor &&
        renderPill(
          `Étage: ${
            criteria.selectedFloor === "0"
              ? "RDC"
              : `${criteria.selectedFloor}e`
          }`,
          onClearFloor
        )}

      {criteria.selectedRoom &&
        renderPill(`Salle: ${criteria.selectedRoom}`, onClearRoom)}

      {criteria.hiddenSubjects.length > 0 &&
        renderPill(
          `${criteria.hiddenSubjects.length} masquée(s)`,
          onClearHiddenSubjects,
          ambre
        )}

      <Pressable
        onPress={() => {
          haptics.warning();
          onClearAll();
        }}
        style={styles.clearAllBtn}
      >
        <ThemedText
          type="captionBold"
          style={{ color: corail[700] }}
        >
          Tout effacer
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.two + 3,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearAllBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
});
