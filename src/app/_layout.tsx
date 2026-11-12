import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const theme = useTheme();
  const navTheme = theme.isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationThemeProvider value={navTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </NavigationThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
