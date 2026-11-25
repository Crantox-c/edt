import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { SymbolView } from "expo-symbols";
import { Pressable, View, StyleSheet } from "react-native";

import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";
import { useQiblaTabPreference } from "@/lib/tab-preferences";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function AppTabs() {
  const { showQiblaTab } = useQiblaTabPreference();

  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="calendar">Agenda</TabButton>
          </TabTrigger>
          {showQiblaTab && (
            <TabTrigger name="qibla" href="/qibla" asChild>
              <TabButton icon="location.north.circle.fill">Qibla</TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="search" href="/search" asChild>
            <TabButton icon="magnifyingglass">Recherche</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="gearshape.fill">Réglages</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & {
  icon:
    | "calendar"
    | "location.north.circle.fill"
    | "gearshape.fill"
    | "magnifyingglass";
}) {
  const theme = useTheme();
  return (
    <Pressable
      {...(props as any)}
      onPress={(e) => {
        haptics.selection();
        (props as { onPress?: (ev: unknown) => void }).onPress?.(e);
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <SymbolView
          name={{ ios: icon, android: "today", web: "today" }}
          size={14}
          tintColor={isFocused ? theme.accent : theme.textSecondary}
        />
        <ThemedText
          type="smallBold"
          style={{ color: isFocused ? theme.accent : theme.textSecondary }}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: theme.border }]}
      >
        <ThemedText type="smallBold" style={styles.brandText}>
          BUT2 GEII • IUT Lille
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  brandText: {
    marginRight: "auto",
  },
  pressed: {
    opacity: 0.75,
  },
  tabButtonView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.one * 1.5,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
});
