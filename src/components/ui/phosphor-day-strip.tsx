import React, { type ComponentType } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";

export type PhosphorDayItem = {
  date: string;
  weekday: string;
  dayNum: string;
  isToday: boolean;
  dots: string[];
};

export type PhosphorDaySelectEvent = {
  nativeEvent: {
    date: string;
    index: number;
  };
};

export type PhosphorDayStripProps = {
  days: PhosphorDayItem[];
  selectedIndex: number;
  itemWidth?: number;
  accentColor: string;
  selectedTextColor: string;
  weekdayColor: string;
  numberColor: string;
  todayColor: string;
  isDark: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  onSelectDay?: (event: PhosphorDaySelectEvent) => void;
  style?: StyleProp<ViewStyle>;
};

type EdrModuleMeta = {
  isPhosphorStripAvailable?: boolean;
};

function resolveNativePhosphorDayStrip(): ComponentType<PhosphorDayStripProps> | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const mod = requireOptionalNativeModule<EdrModuleMeta>("EdrText");
    if (!mod?.isPhosphorStripAvailable) {
      return null;
    }
    return requireNativeView<PhosphorDayStripProps>(
      "EdrText",
      "PhosphorDayStripView"
    );
  } catch {
    return null;
  }
}

const NativePhosphorDayStrip = resolveNativePhosphorDayStrip();

/**
 * Indique si le sélecteur de jours natif Metal EDR (`PhosphorDayStripView`)
 * est disponible (build natif iOS avec Metal).
 */
export function isPhosphorDayStripAvailable(): boolean {
  return NativePhosphorDayStrip !== null;
}

/**
 * Sélecteur horizontal de jours centré à traînée lumineuse (Phosphor Trail)
 * et rendu Metal EDR 16-bit flottant sans bridage ni masque 8-bit.
 */
export function PhosphorDayStrip(props: PhosphorDayStripProps) {
  if (!NativePhosphorDayStrip) {
    return null;
  }
  return <NativePhosphorDayStrip {...props} />;
}
