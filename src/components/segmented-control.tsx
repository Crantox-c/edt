import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Radius, Spacing } from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
  icon?: SymbolViewProps["name"];
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  embedded?: boolean;
};

const CONTAINER_PAD = 3;

/**
 * Contrôle segmenté en verre liquide avec pilule glissante (Reanimated) et haptique.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact = false,
  embedded = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const { isReduced } = useReducedMotion();
  const [width, setWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.key === value)
  );
  const pillWidth =
    width > 0 && options.length > 0 ? width / options.length : 0;

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (pillWidth <= 0) return;
    const target = activeIndex * pillWidth;
    translateX.value = isReduced
      ? target
      : withSpring(target, { damping: 20, stiffness: 260, mass: 0.8 });
  }, [activeIndex, pillWidth, isReduced, translateX]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const handleSelect = (key: T) => {
    if (key !== value) {
      haptics.selection();
      onChange(key);
    }
  };

  const innerContent = (
    <View style={styles.innerRow} onLayout={handleLayout}>
      {pillWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingPill,
            compact && styles.slidingPillCompact,
            {
              width: pillWidth,
              backgroundColor: embedded ? theme.cardBg : theme.backgroundSelected,
              shadowColor: theme.shadow,
            },
            pillAnimatedStyle,
          ]}
        />
      )}

      {options.map((option) => {
        const isSelected = option.key === value;
        const color = isSelected ? theme.accent : theme.textSecondary;

        return (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[styles.tab, compact && styles.tabCompact]}
          >
            {option.icon && (
              <SymbolView
                name={option.icon}
                size={compact ? 12 : 13}
                tintColor={color}
              />
            )}
            <ThemedText
              type={compact ? "captionBold" : "smallBold"}
              style={{ color }}
              numberOfLines={1}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  if (embedded) {
    return (
      <View
        style={[
          styles.container,
          compact && styles.containerCompact,
          styles.embeddedContainer,
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        {innerContent}
      </View>
    );
  }

  return (
    <GlassSurface
      glassEffectStyle="regular"
      isInteractive={true}
      style={[styles.container, compact && styles.containerCompact]}
      fallbackStyle={{
        backgroundColor: theme.backgroundElement,
        borderColor: theme.border,
      }}
    >
      {innerContent}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    padding: CONTAINER_PAD,
    overflow: "hidden",
  },
  containerCompact: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  embeddedContainer: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  innerRow: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
  },
  slidingPill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  slidingPillCompact: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    paddingVertical: Spacing.two - 1,
    paddingHorizontal: Spacing.one,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabCompact: {
    paddingVertical: 5,
    gap: 4,
  },
});
