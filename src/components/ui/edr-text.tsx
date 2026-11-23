import React, { type ComponentType } from "react";
import {
  Platform,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";

import { ThemedText } from "@/components/themed-text";

type EdrTextNativeModule = {
  isEdrAvailable?: boolean;
  boostGlassEdr?: () => void;
};

type NativeEdrTextProps = {
  text: string;
  color: string;
  linearExposure: number;
  fontSize?: number;
  fontFamily?: string;
  glowColor?: string;
  glowRadius?: number;
  style?: StyleProp<ViewStyle>;
};

let boostTimer: ReturnType<typeof setTimeout> | null = null;

function resolveNativeEdrModule(): EdrTextNativeModule | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const mod = requireOptionalNativeModule<EdrTextNativeModule>("EdrText");
    return mod?.isEdrAvailable ? mod : null;
  } catch {
    return null;
  }
}

const NativeEdrModule = resolveNativeEdrModule();

function resolveNativeEdrTextView(): ComponentType<NativeEdrTextProps> | null {
  if (!NativeEdrModule) {
    return null;
  }
  try {
    return requireNativeView<NativeEdrTextProps>("EdrText", "EdrTextView");
  } catch {
    return null;
  }
}

const NativeEdrText = resolveNativeEdrTextView();

/**
 * Indique si le module natif iOS 26 EDR/HDR (`EdrText`) est présent et disponible
 * (development build / build natif iOS 26+ ; `false` dans Expo Go, Android, Web ou iOS < 26).
 */
export function isEdrTextAvailable(): boolean {
  return NativeEdrText !== null;
}

/**
 * Débloque la plage dynamique matérielle maximale (EDR `.high`) sur les surfaces
 * Liquid Glass et vues EDR actives d'iOS 26 (regroupement anti-rafale à 60 ms).
 */
export function boostLiquidGlassEdr(): void {
  if (Platform.OS !== "ios" || !NativeEdrModule?.boostGlassEdr) {
    return;
  }
  if (boostTimer !== null) {
    clearTimeout(boostTimer);
  }
  boostTimer = setTimeout(() => {
    boostTimer = null;
    try {
      NativeEdrModule.boostGlassEdr?.();
    } catch {
      // Ignorer si la scène UIKit est en transition
    }
  }, 60);
}

export type EdrTextProps = {
  text: string;
  color: string;
  linearExposure?: number;
  fontSize?: number;
  fontFamily?: string;
  glowColor?: string;
  glowRadius?: number;
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<TextStyle>;
};

/**
 * Rendu texte haute luminance matérielle (EDR/HDR > 1.0 sur écran OLED iOS 26+),
 * avec repli automatique vers `ThemedText` si le module natif est absent.
 */
export function EdrText({
  text,
  color,
  linearExposure = 2.8,
  fontSize,
  fontFamily,
  glowColor,
  glowRadius,
  style,
  fallbackStyle,
}: EdrTextProps) {
  if (NativeEdrText && linearExposure > 1) {
    return (
      <NativeEdrText
        text={text}
        color={color}
        linearExposure={linearExposure}
        fontSize={fontSize}
        fontFamily={fontFamily}
        glowColor={glowColor}
        glowRadius={glowRadius}
        style={style}
      />
    );
  }

  return (
    <ThemedText
      type="tabular"
      style={[
        fallbackStyle,
        {
          color,
          ...(fontSize !== undefined ? { fontSize } : null),
          ...(fontFamily !== undefined ? { fontFamily } : null),
        },
      ]}
    >
      {text}
    </ThemedText>
  );
}
