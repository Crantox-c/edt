import { Platform } from "react-native";
import { Stack } from "expo-router";
import { FontFamilies } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function SearchStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerTransparent: Platform.OS === "ios",
        headerShadowVisible: false,
        scrollEdgeEffects: { top: "soft", bottom: "soft" },
        headerTintColor: theme.accent,
        headerTitleStyle: {
          color: theme.text,
          fontFamily: FontFamilies.displaySemiBold,
        },
        headerLargeTitleStyle: {
          color: theme.text,
          fontFamily: FontFamilies.displayExtraBold,
        },
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
