import React, { useCallback } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { haptics } from "@/lib/haptics";

export type HapticKind = "tap" | "selection" | "soft" | "toggle" | "none";

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  targetScale?: number;
  haptic?: HapticKind;
  children: React.ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Bouton tactile avec retour physique par échelle (Reanimated) et retour haptique.
 * Règle AGENTS.md : n'anime jamais `opacity` pour préserver le rendu Liquid Glass natif.
 */
export function PressableScale({
  children,
  style,
  targetScale = 0.975,
  haptic = "tap",
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const { isReduced } = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!isReduced) {
        scale.set(withSpring(targetScale, { damping: 18, stiffness: 320 }));
      }
      onPressIn?.(e);
    },
    [isReduced, onPressIn, scale, targetScale]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      if (!isReduced) {
        scale.set(withSpring(1, { damping: 18, stiffness: 320 }));
      }
      onPressOut?.(e);
    },
    [isReduced, onPressOut, scale]
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic !== "none") {
        haptics[haptic]();
      }
      onPress?.(e);
    },
    [haptic, onPress]
  );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
