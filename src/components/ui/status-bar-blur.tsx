import React, { type ComponentType } from "react";
import { Platform, StyleSheet, type ViewProps } from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EdrModuleMeta = {
  isEdrAvailable?: boolean;
};

function resolveStatusBarEdgeBlurView(): ComponentType<ViewProps> | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const mod = requireOptionalNativeModule<EdrModuleMeta>("EdrText");
    if (!mod?.isEdrAvailable) {
      return null;
    }
    return requireNativeView<ViewProps>("EdrText", "StatusBarEdgeBlurView");
  } catch {
    return null;
  }
}

const NativeStatusBarEdgeBlur = resolveStatusBarEdgeBlurView();

/**
 * Attache `UIScrollEdgeElementContainerInteraction` (.top) au sommet de l'écran
 * sur iOS 26+ afin d'activer le flou progressif natif sous la barre d'état.
 * Ne rend rien hors build natif iOS 26+ (zéro faux flou).
 */
export function StatusBarProgressiveBlur() {
  const insets = useSafeAreaInsets();

  if (!NativeStatusBarEdgeBlur) {
    return null;
  }

  return (
    <NativeStatusBarEdgeBlur
      pointerEvents="none"
      style={[styles.overlay, { height: Math.max(insets.top + 10, 52) }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
});
