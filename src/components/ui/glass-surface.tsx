import React, { useEffect } from "react";
import {
  ColorValue,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import {
  GlassContainer,
  GlassContainerProps,
  GlassEffectStyleConfig,
  GlassStyle,
  GlassView,
} from "expo-glass-effect";

import { boostLiquidGlassEdr } from "@/components/ui/edr-text";
import { useLiquidGlass } from "@/hooks/use-liquid-glass";
import { useTheme } from "@/hooks/use-theme";

export type GlassSurfaceProps = ViewProps & {
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  tintColor?: ColorValue;
  isInteractive?: boolean;
  colorScheme?: "auto" | "light" | "dark";
  fallbackStyle?: StyleProp<ViewStyle>;
};

/**
 * Surface en verre adaptative conforme aux règles d'AGENTS.md :
 * - Utilise GlassView d'expo-glass-effect uniquement si le liquid glass natif est disponible.
 * - Sinon (iOS < 26, accessibilité, Android, aperçu web) : repli sur une surface opaque
 *   ou semi-opaque propre basée sur les tokens du thème actif. Jamais un faux verre imité.
 * - Ne met jamais d'opacity: 0.
 */
export function GlassSurface({
  children,
  style,
  glassEffectStyle = "regular",
  tintColor,
  isInteractive = false,
  colorScheme,
  fallbackStyle,
  ...rest
}: GlassSurfaceProps) {
  const theme = useTheme();
  const canUseGlass = useLiquidGlass();

  useEffect(() => {
    if (canUseGlass) {
      boostLiquidGlassEdr();
    }
  }, [canUseGlass]);

  if (canUseGlass) {
    const resolvedScheme = colorScheme ?? (theme.isDark ? "dark" : "light");
    return (
      <GlassView
        style={[styles.baseContainer, style]}
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        colorScheme={resolvedScheme}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  // Repli propre conforme aux tokens de thème
  return (
    <View
      style={[
        styles.baseContainer,
        styles.fallbackContainer,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
        fallbackStyle,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export type GlassSurfaceContainerProps = GlassContainerProps & {
  children?: React.ReactNode;
};

/**
 * Conteneur de regroupement pour surfaces en verre :
 * Règle AGENTS.md : "Pas de verre sur du verre : regrouper les éléments proches dans un GlassContainer."
 */
export function GlassSurfaceContainer({
  children,
  spacing,
  style,
  ...rest
}: GlassSurfaceContainerProps) {
  const canUseGlass = useLiquidGlass();

  if (canUseGlass) {
    return (
      <GlassContainer spacing={spacing} style={style} {...rest}>
        {children}
      </GlassContainer>
    );
  }

  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    borderCurve: "continuous",
  },
  fallbackContainer: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
