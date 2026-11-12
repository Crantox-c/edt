import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Spacing, ThemeMode } from "@/constants/theme";
import { useTheme, useThemeContext } from "@/hooks/use-theme";

const MODES: { key: ThemeMode; label: string; icon: string }[] = [
  { key: "nuit", label: "Nuit", icon: "🌙" },
  { key: "clair", label: "Clair", icon: "☀️" },
  { key: "oled", label: "OLED", icon: "🖤" },
  { key: "auto", label: "Auto", icon: "⚙️" },
];

export function ThemeSwitcher() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();

  return (
    <GlassSurface
      glassEffectStyle="clear"
      style={styles.container}
      fallbackStyle={{
        backgroundColor: theme.backgroundElement,
        borderColor: theme.border,
      }}
    >
      {MODES.map((m) => {
        const isSelected = themeMode === m.key;
        return (
          <Pressable
            key={m.key}
            onPress={() => setThemeMode(m.key)}
            style={[
              styles.tab,
              isSelected && [
                styles.activeTab,
                { backgroundColor: theme.backgroundSelected },
              ],
            ]}
          >
            <ThemedText
              type="smallBold"
              style={[
                styles.tabText,
                { color: isSelected ? theme.accent : theme.textSecondary },
              ]}
            >
              {m.icon} {m.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: Spacing.two,
    padding: 2,
    marginVertical: Spacing.one,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.one,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two - 2,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
  },
});
