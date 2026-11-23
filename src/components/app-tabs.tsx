import { NativeTabs } from "expo-router/native-tabs";
import { FontFamilies } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";

/**
 * Barre d'onglets système native (iOS 26 Liquid Glass).
 * Intègre la recherche dans le dock à la manière d'Apple (`role="search"`),
 * minimise au défilement et applique des retours haptiques discrets.
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={theme.accent}
      minimizeBehavior="onScrollDown"
      labelStyle={{
        default: { fontFamily: FontFamilies.displaySemiBold },
        selected: {
          color: theme.accent,
          fontFamily: FontFamilies.displaySemiBold,
        },
      }}
    >
      <NativeTabs.Trigger
        name="(agenda)"
        listeners={{ tabPress: () => haptics.selection() }}
      >
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "calendar", selected: "calendar" }}
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="explore"
        listeners={{ tabPress: () => haptics.selection() }}
      >
        <NativeTabs.Trigger.Label>Réglages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="search"
        role="search"
        listeners={{ tabPress: () => haptics.selection() }}
      >
        <NativeTabs.Trigger.Label>Recherche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
