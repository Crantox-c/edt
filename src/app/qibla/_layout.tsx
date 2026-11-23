import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";

import { AmbientBackground } from "@/components/ui/ambient-background";
import { FontFamilies } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function QiblaLayout() {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <AmbientBackground />
      <View style={styles.stackLayer}>
        <Stack
          screenOptions={{
            headerShown: Platform.OS === "ios",
            headerLargeTitleEnabled: true,
            headerTransparent: Platform.OS === "ios",
            headerShadowVisible: false,
            scrollEdgeEffects: {
              top: "soft",
              bottom: "soft",
            },
            headerTintColor: theme.accent,
            headerTitleStyle: {
              color: theme.text,
              fontFamily: FontFamilies.displaySemiBold,
            },
            headerLargeTitleStyle: {
              color: theme.text,
              fontFamily: FontFamilies.displayExtraBold,
            },
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackLayer: {
    flex: 1,
  },
});
