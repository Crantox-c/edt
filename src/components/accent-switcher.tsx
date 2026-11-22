import React from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { PressableScale } from "@/components/ui/pressable-scale";
import {
  ACCENT_PRESETS,
  type BaseThemeMode,
  Radius,
  Spacing,
  getAccentPreviewColor,
} from "@/constants/theme";
import { useThemeContext } from "@/hooks/use-theme";

/**
 * Sélecteur de couleur d'accentuation avec aperçu des 3 niveaux d'importance
 * (Principal, Secondaire, Subtil) adaptés dynamiquement au thème actif.
 */
export function AccentSwitcher() {
  const { theme, themeMode, accentPreset, setAccentPreset } = useThemeContext();
  const baseMode: BaseThemeMode =
    themeMode === "auto"
      ? theme.isDark
        ? "nuit"
        : "clair"
      : themeMode;

  const tiers = theme.accentTiers;

  return (
    <View style={styles.container}>
      <View style={styles.presetsGrid}>
        {ACCENT_PRESETS.map((preset) => {
          const isSelected = accentPreset === preset.key;
          const previewScale = getAccentPreviewColor(preset.key, baseMode);

          return (
            <PressableScale
              key={preset.key}
              haptic="selection"
              onPress={() => setAccentPreset(preset.key)}
              accessibilityLabel={`Couleur d'accentuation ${preset.label}`}
              accessibilityState={{ selected: isSelected }}
              style={styles.presetItem}
            >
              <View
                style={[
                  styles.swatchRing,
                  {
                    borderColor: isSelected
                      ? previewScale[500]
                      : theme.cardBorder,
                    backgroundColor: isSelected
                      ? previewScale[100]
                      : theme.cardBgSubtle,
                  },
                ]}
              >
                <View
                  style={[
                    styles.swatchOrb,
                    { backgroundColor: previewScale[500] },
                  ]}
                >
                  {isSelected && (
                    <SymbolView
                      name={{
                        ios: "checkmark",
                        android: "check_circle",
                        web: "check_circle",
                      }}
                      size={14}
                      weight="bold"
                      tintColor={theme.textOnAccent}
                    />
                  )}
                </View>
              </View>

              <ThemedText
                type={isSelected ? "captionBold" : "caption"}
                style={{
                  color: isSelected ? previewScale[700] : theme.textSecondary,
                }}
                numberOfLines={1}
              >
                {preset.label}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>

      {/* Légende dynamique des teintes selon l'importance dans le thème actif */}
      <View
        style={[
          styles.tiersRow,
          {
            backgroundColor: theme.cardBgSubtle,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <View style={styles.tierItem}>
          <View
            style={[styles.tierDot, { backgroundColor: tiers.solidBg }]}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            Principal
          </ThemedText>
        </View>

        <View
          style={[styles.tierSep, { backgroundColor: theme.borderSubtle }]}
        />

        <View style={styles.tierItem}>
          <View
            style={[
              styles.tierDot,
              {
                backgroundColor: tiers.softBg,
                borderColor: tiers.border,
                borderWidth: 1,
              },
            ]}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            Secondaire
          </ThemedText>
        </View>

        <View
          style={[styles.tierSep, { backgroundColor: theme.borderSubtle }]}
        />

        <View style={styles.tierItem}>
          <View
            style={[
              styles.tierDot,
              {
                backgroundColor: tiers.subtleBg,
                borderColor: theme.border,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            Subtil
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two + 2,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.one + 2,
  },
  presetItem: {
    alignItems: "center",
    gap: 5,
    minWidth: 50,
    flex: 1,
  },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchOrb: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  tiersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 7,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
  },
  tierSep: {
    width: StyleSheet.hairlineWidth,
    height: 12,
  },
});
