import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";

/**
 * Fond atmosphérique vivant : lueurs colorées issues du haut et du bas de l'écran,
 * dérivées du thème et de la couleur d'accentuation active.
 */
export function AmbientBackground() {
  const theme = useTheme();
  const { isReduced } = useReducedMotion();

  const topPhase = useSharedValue(0);
  const sidePhase = useSharedValue(0);
  const bottomPhase = useSharedValue(0);

  useEffect(() => {
    if (isReduced) {
      cancelAnimation(topPhase);
      cancelAnimation(sidePhase);
      cancelAnimation(bottomPhase);
      topPhase.value = 0.5;
      sidePhase.value = 0.5;
      bottomPhase.value = 0.5;
      return;
    }

    const ease = Easing.inOut(Easing.sin);

    topPhase.value = 0;
    topPhase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000, easing: ease }),
        withTiming(0, { duration: 9000, easing: ease })
      ),
      -1,
      false
    );

    sidePhase.value = 0;
    sidePhase.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 11000, easing: ease }),
          withTiming(0, { duration: 11000, easing: ease })
        ),
        -1,
        false
      )
    );

    bottomPhase.value = 0;
    bottomPhase.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 10000, easing: ease }),
          withTiming(0, { duration: 10000, easing: ease })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(topPhase);
      cancelAnimation(sidePhase);
      cancelAnimation(bottomPhase);
    };
  }, [isReduced, topPhase, sidePhase, bottomPhase]);

  const topGlowStyle = useAnimatedStyle(() => {
    const p = topPhase.value;
    return {
      opacity: 0.84 + p * 0.16,
      transform: [
        { translateX: (p - 0.5) * 32 },
        { translateY: p * 10 },
        { scale: 1 + p * 0.07 },
      ],
    };
  });

  const sideGlowStyle = useAnimatedStyle(() => {
    const p = sidePhase.value;
    return {
      opacity: 0.8 + p * 0.2,
      transform: [
        { translateX: (0.5 - p) * 24 },
        { translateY: (p - 0.5) * 16 },
        { scale: 1 + p * 0.06 },
      ],
    };
  });

  const bottomGlowStyle = useAnimatedStyle(() => {
    const p = bottomPhase.value;
    return {
      opacity: 0.82 + p * 0.18,
      transform: [
        { translateX: (0.5 - p) * 36 },
        { translateY: -p * 10 },
        { scale: 1 + p * 0.09 },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.layer,
        { backgroundColor: theme.background },
      ]}
    >
      {/* Lueur zénithale vivante */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          topGlowStyle,
          {
            backgroundImage: `radial-gradient(ellipse at 22% 0%, ${theme.auroraPrimary} 0%, transparent 56%)`,
          },
        ]}
      />

      {/* Nuance secondaire haut-droite */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          sideGlowStyle,
          {
            backgroundImage: `radial-gradient(ellipse at 86% 24%, ${theme.auroraSecondary} 0%, transparent 50%)`,
          },
        ]}
      />

      {/* Zone de brillance montante depuis le bas de l'écran */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          bottomGlowStyle,
          {
            backgroundImage: `radial-gradient(ellipse at 52% 100%, ${theme.auroraTertiary} 0%, transparent 56%)`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 0,
  },
});
