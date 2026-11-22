import React from "react";
import {
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import {
  PressableScale,
  type HapticKind,
} from "@/components/ui/pressable-scale";
import { useTheme } from "@/hooks/use-theme";

export type GlassButtonProps = Omit<PressableProps, "style" | "children"> & {
  tintColor: string;
  borderColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  targetScale?: number;
  haptic?: HapticKind;
  children: React.ReactNode;
};

/**
 * Bouton Liquid Glass natif coloré opaque :
 * - Sur iOS 26+ : applique UIGlassEffect (reflets spéculaires et interaction native)
 *   tout en conservant sa couleur opaque (`backgroundColor: tintColor`, zéro transparence).
 * - Hors iOS 26 / accessibilité : repli opaque identique avec bordure de contraste.
 */
export function GlassButton({
  tintColor,
  borderColor,
  containerStyle,
  style,
  targetScale = 0.97,
  haptic = "soft",
  children,
  ...rest
}: GlassButtonProps) {
  const theme = useTheme();
  const resolvedBorderColor = borderColor ?? theme.border;

  return (
    <PressableScale
      targetScale={targetScale}
      haptic={haptic}
      style={containerStyle}
      {...rest}
    >
      <GlassSurface
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive={true}
        style={[
          style,
          {
            backgroundColor: tintColor,
            borderColor: resolvedBorderColor,
          },
        ]}
        fallbackStyle={{
          backgroundColor: tintColor,
          borderColor: resolvedBorderColor,
        }}
      >
        {children}
      </GlassSurface>
    </PressableScale>
  );
}
