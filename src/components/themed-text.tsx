import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { FontFamilies, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextType =
  | "largeTitle"
  | "title"
  | "subtitle"
  | "headline"
  | "default"
  | "small"
  | "smallBold"
  | "caption"
  | "captionBold"
  | "overline"
  | "tabular"
  | "link"
  | "linkPrimary"
  | "code";

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

type FontRoleGroup = "display" | "body" | "mono";

const ROLE_GROUP: Record<ThemedTextType, FontRoleGroup> = {
  largeTitle: "display",
  title: "display",
  subtitle: "display",
  headline: "display",
  smallBold: "display",
  overline: "display",
  link: "display",
  linkPrimary: "display",
  default: "body",
  small: "body",
  caption: "body",
  captionBold: "body",
  tabular: "body",
  code: "mono",
};

function mapWeightToFontFamily(
  group: FontRoleGroup,
  weight: TextStyle["fontWeight"]
): string | undefined {
  if (!weight) return undefined;
  const w = String(weight);

  if (group === "display") {
    if (w === "800" || w === "900") return FontFamilies.displayExtraBold;
    if (w === "700" || w === "bold") return FontFamilies.displayBold;
    if (w === "600") return FontFamilies.displaySemiBold;
    if (w === "500" || w === "400" || w === "normal") return FontFamilies.displayMedium;
    return undefined;
  }

  if (group === "mono") {
    if (w === "600" || w === "700" || w === "800" || w === "bold") {
      return FontFamilies.monoSemiBold;
    }
    return FontFamilies.monoMedium;
  }

  if (w === "700" || w === "800" || w === "900" || w === "bold") {
    return FontFamilies.bodyBold;
  }
  if (w === "600") return FontFamilies.bodySemiBold;
  if (w === "400" || w === "normal") return FontFamilies.bodyRegular;
  if (w === "500") return FontFamilies.bodyMedium;
  return undefined;
}

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const resolvedColor =
    themeColor !== undefined
      ? theme[themeColor]
      : type === "linkPrimary"
        ? theme.accent
        : theme.text;

  const flatStyle = style ? StyleSheet.flatten(style) : undefined;
  const mappedFamily =
    flatStyle?.fontWeight && !flatStyle.fontFamily
      ? mapWeightToFontFamily(ROLE_GROUP[type], flatStyle.fontWeight)
      : undefined;

  // Sur iOS/Android, les polices statiques Google Fonts nécessitent de retirer fontWeight
  // pour éviter le fallback Roboto sur Android ou le faux-gras synthétique sur iOS.
  let sanitizedStyle = style;
  if (Platform.OS !== "web" && flatStyle && flatStyle.fontWeight !== undefined) {
    const { fontWeight: _ignored, ...withoutWeight } = flatStyle;
    sanitizedStyle = withoutWeight;
  }

  return (
    <Text
      style={[
        { color: resolvedColor },
        styles[type],
        sanitizedStyle,
        mappedFamily ? { fontFamily: mappedFamily } : null,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  largeTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.9,
    fontFamily: FontFamilies.displayExtraBold,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontFamily: FontFamilies.displayBold,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.35,
    fontFamily: FontFamilies.displayBold,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontFamily: FontFamilies.displaySemiBold,
  },
  default: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontFamily: FontFamilies.bodyMedium,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamilies.bodyMedium,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: FontFamilies.displaySemiBold,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamilies.bodyMedium,
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamilies.bodySemiBold,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontFamily: FontFamilies.displayBold,
  },
  tabular: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: FontFamilies.bodyBold,
    fontVariant: ["tabular-nums"],
  },
  link: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamilies.displaySemiBold,
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamilies.displaySemiBold,
  },
  code: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FontFamilies.monoMedium,
  },
});
