import React, { type ComponentType } from "react";
import { Platform, StyleSheet, type ViewProps } from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";

function resolveStatusBarEdgeBlurView(): ComponentType<ViewProps> | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const mod = requireOptionalNativeModule("EdrText");
    if (!mod) {
      return null;
    }
    return requireNativeView<ViewProps>("EdrText", "StatusBarEdgeBlurView");
  } catch {
    return null;
  }
}

const NativeStatusBarEdgeBlur = resolveStatusBarEdgeBlurView();

/**
 * Connecteur natif invisible (0×0) qui rattache le `UIScrollView` principal de l'écran
 * au `UIViewController` hôte (`setContentScrollView(_:for: .all)`) et active les effets
 * de bord progressifs `.soft` sur iOS 26+ (repli des grands titres + flou haut/bas).
 */
export function StatusBarProgressiveBlur() {
  if (!NativeStatusBarEdgeBlur) {
    return null;
  }

  return (
    <NativeStatusBarEdgeBlur pointerEvents="none" style={styles.connector} />
  );
}

const styles = StyleSheet.create({
  connector: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
});
