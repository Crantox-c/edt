import React from "react";
import { SegmentedControl, type SegmentedOption } from "@/components/segmented-control";
import { ThemeMode } from "@/constants/theme";
import { useThemeContext } from "@/hooks/use-theme";

const MODES: readonly SegmentedOption<ThemeMode>[] = [
  {
    key: "nuit",
    label: "Nuit",
    icon: { ios: "moon.stars.fill", android: "dark_mode", web: "dark_mode" },
  },
  {
    key: "clair",
    label: "Clair",
    icon: { ios: "sun.max.fill", android: "light_mode", web: "light_mode" },
  },
  {
    key: "oled",
    label: "OLED",
    icon: {
      ios: "circle.lefthalf.filled",
      android: "contrast",
      web: "contrast",
    },
  },
  {
    key: "auto",
    label: "Auto",
    icon: {
      ios: "sparkles",
      android: "brightness_medium",
      web: "brightness_medium",
    },
  },
];

export type ThemeSwitcherProps = {
  embedded?: boolean;
};

export function ThemeSwitcher({ embedded = false }: ThemeSwitcherProps) {
  const { themeMode, setThemeMode } = useThemeContext();

  return (
    <SegmentedControl
      options={MODES}
      value={themeMode}
      onChange={setThemeMode}
      embedded={embedded}
    />
  );
}
