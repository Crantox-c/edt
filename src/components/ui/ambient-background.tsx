import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";

/**
 * Fond atmosphérique saphir / glacier subtil et cohérent.
 * Offre au Liquid Glass natif d'iOS 26 une toile harmonieuse sans taches agressives.
 */
export function AmbientBackground() {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}
    >
      {/* Lueur zénithale bleu glacier */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundImage: `radial-gradient(ellipse at 20% 0%, ${theme.auroraPrimary} 0%, transparent 55%)`,
          },
        ]}
      />

      {/* Nuance violet crépuscule en haut à droite */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundImage: `radial-gradient(ellipse at 88% 22%, ${theme.auroraSecondary} 0%, transparent 50%)`,
          },
        ]}
      />

      {/* Profondeur saphir en pied d'écran */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundImage: `radial-gradient(ellipse at 50% 100%, ${theme.auroraTertiary} 0%, transparent 55%)`,
          },
        ]}
      />
    </View>
  );
}
