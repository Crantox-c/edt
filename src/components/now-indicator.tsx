import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import { formatTime } from "@/lib/dates";

export function NowIndicator() {
  const theme = useTheme();
  const now = useCurrentTime();
  const { isReduced } = useReducedMotion();
  const timeStr = formatTime(now);
  const corail = theme.corail;

  const haloScale = useSharedValue(1);

  useEffect(() => {
    if (isReduced) {
      cancelAnimation(haloScale);
      haloScale.value = 1;
      return;
    }
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.85, { duration: 1100 }),
        withTiming(1, { duration: 1100 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(haloScale);
  }, [isReduced, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.dotWrapper}>
        {!isReduced && (
          <Animated.View
            style={[
              styles.halo,
              { backgroundColor: corail[300] },
              haloStyle,
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: corail[500] }]} />
      </View>

      <View style={[styles.line, { backgroundColor: corail[300] }]} />

      <View
        style={[
          styles.badge,
          { backgroundColor: corail[100], borderColor: corail[300] },
        ]}
      >
        <ThemedText
          type="tabular"
          style={[styles.badgeText, { color: corail[700] }]}
        >
          Maintenant • {timeStr}
        </ThemedText>
      </View>

      <View style={[styles.line, { backgroundColor: corail[300] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.one,
    gap: 6,
  },
  dotWrapper: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  line: {
    flex: 1,
    height: 1.5,
  },
  badge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
