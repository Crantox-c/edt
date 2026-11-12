import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import { formatTime } from "@/lib/dates";

export function NowIndicator() {
  const theme = useTheme();
  const now = useCurrentTime();
  const timeStr = formatTime(now);

  const corail = theme.corail;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: corail[500] }]} />
      <View style={[styles.line, { backgroundColor: corail[300] }]} />
      <View style={[styles.badge, { backgroundColor: corail[100] }]}>
        <ThemedText type="smallBold" style={{ color: corail[700], fontSize: 12 }}>
          Maintenant ({timeStr})
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
    marginVertical: Spacing.two,
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    height: 1.5,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
});
