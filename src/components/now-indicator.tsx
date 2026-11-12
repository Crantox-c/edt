import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatTime } from "@/lib/dates";

export function NowIndicator() {
  const now = useCurrentTime();
  const timeStr = formatTime(now);

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <View style={styles.line} />
      <View style={styles.badge}>
        <ThemedText type="smallBold" style={styles.text}>
          Maintenant ({timeStr})
        </ThemedText>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.two,
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#EF444488",
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    backgroundColor: "#EF444422",
  },
  text: {
    color: "#EF4444",
    fontSize: 12,
    lineHeight: 16,
  },
});
