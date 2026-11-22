import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import { FontFamilies, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
  showFilterButton?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  activeFilterCount = 0,
  onOpenFilters,
  showFilterButton = false,
}: SearchBarProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;

  return (
    <View style={styles.container}>
      <GlassSurface
        glassEffectStyle="regular"
        style={styles.inputSurface}
        fallbackStyle={{
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        }}
      >
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={15}
          tintColor={theme.textSecondary}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Cours, salle, matière, tag..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText("")}
            style={styles.clearBtn}
            hitSlop={8}
          >
            <SymbolView
              name={{
                ios: "xmark.circle.fill",
                android: "cancel",
                web: "cancel",
              }}
              size={16}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        )}
      </GlassSurface>

      {showFilterButton && onOpenFilters && (
        <PressableScale onPress={onOpenFilters}>
          <GlassSurface
            glassEffectStyle="regular"
            isInteractive={true}
            style={styles.filterBtn}
            fallbackStyle={{
              backgroundColor:
                activeFilterCount > 0 ? accent.softBg : theme.backgroundElement,
              borderColor: activeFilterCount > 0 ? accent.primary : theme.border,
            }}
          >
            <SymbolView
              name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
              size={15}
              tintColor={activeFilterCount > 0 ? accent.text : theme.text}
            />
            <ThemedText
              type="smallBold"
              style={
                activeFilterCount > 0 ? { color: accent.text } : undefined
              }
            >
              Filtres
            </ThemedText>
            {activeFilterCount > 0 && (
              <View style={[styles.badge, { backgroundColor: accent.solidBg }]}>
                <ThemedText
                  type="captionBold"
                  style={[styles.badgeText, { color: theme.textOnAccent }]}
                >
                  {activeFilterCount}
                </ThemedText>
              </View>
            )}
          </GlassSurface>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  inputSurface: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontFamily: FontFamilies.bodyMedium,
    fontSize: 15,
    height: "100%",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    gap: 6,
  },
  badge: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
