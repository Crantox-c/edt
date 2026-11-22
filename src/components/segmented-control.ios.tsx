import React from "react";
import { StyleSheet, View } from "react-native";
import { requireOptionalNativeModule } from "expo";
import type * as SwiftUI from "@expo/ui/swift-ui";
import type * as SwiftUIModifiers from "@expo/ui/swift-ui/modifiers";

import {
  SegmentedControlFallback,
  type SegmentedControlProps,
  type SegmentedOption,
} from "./segmented-control-fallback";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";

export type { SegmentedControlProps, SegmentedOption };

type ExpoUiBundle = {
  Host: typeof SwiftUI.Host;
  Picker: typeof SwiftUI.Picker;
  Text: typeof SwiftUI.Text;
  pickerStyle: typeof SwiftUIModifiers.pickerStyle;
  labelsHidden: typeof SwiftUIModifiers.labelsHidden;
  controlSize: typeof SwiftUIModifiers.controlSize;
  frame: typeof SwiftUIModifiers.frame;
  tag: typeof SwiftUIModifiers.tag;
};

let cachedExpoUi: ExpoUiBundle | null | undefined;

function getExpoUiBundle(): ExpoUiBundle | null {
  if (cachedExpoUi !== undefined) {
    return cachedExpoUi;
  }
  try {
    if (requireOptionalNativeModule("ExpoUI") == null) {
      cachedExpoUi = null;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swiftUi = require("@expo/ui/swift-ui") as typeof SwiftUI;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const modifiers = require("@expo/ui/swift-ui/modifiers") as typeof SwiftUIModifiers;
    cachedExpoUi = {
      Host: swiftUi.Host,
      Picker: swiftUi.Picker,
      Text: swiftUi.Text,
      pickerStyle: modifiers.pickerStyle,
      labelsHidden: modifiers.labelsHidden,
      controlSize: modifiers.controlSize,
      frame: modifiers.frame,
      tag: modifiers.tag,
    };
    return cachedExpoUi;
  } catch {
    cachedExpoUi = null;
    return null;
  }
}

/**
 * Contrôle segmenté natif SwiftUI (`Picker(.segmented)`) sous iOS :
 * utilise directement le composant système iOS 26 Liquid Glass (comme NativeTabs).
 * Bascule proprement sur le repli JS si `ExpoUI` n'est pas disponible.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact = false,
  embedded = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const ui = getExpoUiBundle();

  if (!ui) {
    return (
      <SegmentedControlFallback
        options={options}
        value={value}
        onChange={onChange}
        compact={compact}
        embedded={embedded}
      />
    );
  }

  const { Host, Picker, Text, pickerStyle, labelsHidden, controlSize, frame, tag } =
    ui;

  const handleSelectionChange = (next: string) => {
    if (next && next !== value) {
      haptics.selection();
      onChange(next as T);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Host
        matchContents={{ vertical: true }}
        colorScheme={theme.isDark ? "dark" : "light"}
        seedColor={theme.accent}
        style={styles.host}
      >
        <Picker<string>
          label=""
          selection={value}
          onSelectionChange={handleSelectionChange}
          modifiers={[
            pickerStyle("segmented"),
            labelsHidden(),
            controlSize(compact ? "regular" : "large"),
            frame({ maxWidth: Infinity }),
          ]}
        >
          {options.map((option) => (
            <Text key={option.key} modifiers={[tag(option.key)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  host: {
    width: "100%",
  },
});
