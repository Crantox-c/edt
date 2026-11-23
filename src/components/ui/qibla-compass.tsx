import React, { type ComponentType } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";

import type { QiblaPermissionStatus } from "@/lib/qibla";

export type QiblaUpdatePayload = {
  permissionStatus: QiblaPermissionStatus;
  headingAvailable: boolean;
  locationAvailable: boolean;
  isTrueNorth: boolean;
  headingDeg: number;
  qiblaBearingDeg: number;
  deltaDeg: number;
  distanceKm: number;
  headingAccuracyDeg: number;
  horizontalAccuracyM: number;
  latitude: number;
  longitude: number;
  isAligned: boolean;
};

export type QiblaUpdateEvent = {
  nativeEvent: QiblaUpdatePayload;
};

export type QiblaCompassProps = {
  accentColor: string;
  alignedColor: string;
  northColor: string;
  ringColor: string;
  tickColor: string;
  textColor: string;
  surfaceColor: string;
  isDark: boolean;
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  active: boolean;
  permissionRequestNonce?: number;
  refreshNonce?: number;
  onQiblaUpdate?: (event: QiblaUpdateEvent) => void;
  style?: StyleProp<ViewStyle>;
};

type EdrModuleMeta = {
  isQiblaCompassAvailable?: boolean;
};

function resolveNativeQiblaCompass(): ComponentType<QiblaCompassProps> | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const mod = requireOptionalNativeModule<EdrModuleMeta>("EdrText");
    if (!mod?.isQiblaCompassAvailable) {
      return null;
    }
    return requireNativeView<QiblaCompassProps>("EdrText", "QiblaCompassView");
  } catch {
    return null;
  }
}

const NativeQiblaCompass = resolveNativeQiblaCompass();

/**
 * Indique si la boussole Qibla native Metal EDR (`QiblaCompassView`)
 * est disponible (build natif iOS avec Metal + CoreLocation + CoreHaptics).
 */
export function isQiblaCompassAvailable(): boolean {
  return NativeQiblaCompass !== null;
}

export function QiblaCompass(props: QiblaCompassProps) {
  if (!NativeQiblaCompass) {
    return null;
  }
  return <NativeQiblaCompass {...props} />;
}
