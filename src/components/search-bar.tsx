import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
};

export function SearchBar({
  value,
  onChangeText,
  activeFilterCount,
  onOpenFilters,
}: SearchBarProps) {
  const theme = useTheme();
  const glacier = theme.glacier;

  return (
    <View style={styles.container}>
      <ThemedView
        type="backgroundElement"
        style={[styles.inputContainer, { borderColor: theme.border }]}
      >
        <ThemedText type="small" themeColor="textSecondary" style={styles.searchIcon}>
          🔍
        </ThemedText>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Rechercher cours, salle, matière..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} style={styles.clearBtn}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      <Pressable
        onPress={onOpenFilters}
        style={[
          styles.filterBtn,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          activeFilterCount > 0 && {
            backgroundColor: glacier[100],
            borderColor: glacier[500],
          },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={activeFilterCount > 0 ? { color: glacier[700] } : undefined}
        >
          ⚙ Filtres
        </ThemedText>
        {activeFilterCount > 0 && (
          <View style={[styles.badge, { backgroundColor: glacier[500] }]}>
            <ThemedText type="smallBold" style={styles.badgeText}>
              {activeFilterCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: Spacing.one,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.one,
  },
  badge: {
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
