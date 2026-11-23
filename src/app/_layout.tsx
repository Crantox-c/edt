import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useFonts } from "expo-font";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import AppTabs from "@/components/app-tabs";
import { boostLiquidGlassEdr } from "@/components/ui/edr-text";
import { ScheduleProvider } from "@/hooks/use-schedule";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  const navTheme = theme.isDark ? DarkTheme : DefaultTheme;

  useEffect(() => {
    boostLiquidGlassEdr();
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        boostLiquidGlassEdr();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <AppTabs />
    </NavigationThemeProvider>
  );
}

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ScheduleProvider>
        <RootNavigator />
      </ScheduleProvider>
    </ThemeProvider>
  );
}
