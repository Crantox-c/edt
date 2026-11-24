import {
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  border,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  shapes,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { DayAgendaWidgetProps } from "@/lib/widget-timeline";

const DayAgendaWidget = createWidget<DayAgendaWidgetProps>(
  "DayAgendaWidget",
  (props: DayAgendaWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const fallbackDiag = (props as { __diag?: string } | undefined)?.__diag;
    if (!props?.paletteDark || !props?.paletteLight) {
      return (
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: "topLeading",
            }),
            containerBackground(
              { type: "material", material: "regular" },
              "widget"
            ),
            widgetURL("geiiedt://"),
          ]}
        >
          <HStack alignment="center" spacing={6}>
            <Image systemName="calendar" size={14} />
            <Text
              modifiers={[
                font({ size: 14, weight: "bold", design: "rounded" }),
                lineLimit(1),
                foregroundStyle({ type: "hierarchical", style: "primary" }),
              ]}
            >
              GEII EDT · Journée
            </Text>
          </HStack>
          <Spacer minLength={2} />
          <Text
            modifiers={[
              font({ size: 12.5, weight: "medium", design: "rounded" }),
              lineLimit(2),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            Ouvrez l&apos;app pour synchroniser votre emploi du temps
          </Text>
          {Boolean(fallbackDiag) && (
            <Text
              modifiers={[
                font({ size: 8.5, weight: "medium", design: "rounded" }),
                lineLimit(2),
                foregroundStyle({ type: "hierarchical", style: "tertiary" }),
              ]}
            >
              {fallbackDiag}
            </Text>
          )}
          <Spacer minLength={0} />
        </VStack>
      );
    }

    const isLight = environment?.colorScheme === "light";
    const palette = isLight ? props.paletteLight : props.paletteDark;
    const isTinted = environment?.widgetRenderingMode === "accented";
    const rows = props.rows ?? [];
    const isCompact = rows.length >= 3;
    const summaryLabel =
      props.extraCount > 0
        ? `${props.totalDuration} · +${props.extraCount}`
        : props.totalDuration;

    return (
      <VStack
        alignment="leading"
        spacing={isCompact ? 5 : 7}
        modifiers={[
          frame({
            maxWidth: Infinity,
            maxHeight: Infinity,
            alignment: "topLeading",
          }),
          containerBackground(
            {
              type: "linearGradient",
              colors: [palette.bgStart, palette.bgEnd],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 },
            },
            "widget"
          ),
          widgetURL("geiiedt://"),
        ]}
      >
        <HStack alignment="center" spacing={6}>
          <Image systemName="calendar" size={14} color={palette.accent} />
          <Text
            modifiers={[
              font({ size: 14, weight: "bold", design: "rounded" }),
              lineLimit(1),
              minimumScaleFactor(0.8),
              foregroundStyle(
                isTinted
                  ? { type: "hierarchical", style: "primary" }
                  : palette.textPrimary
              ),
            ]}
          >
            {props.dayLabel}
          </Text>
          <Spacer />
          {rows.length > 0 && (
            <Text
              modifiers={[
                font({ size: 11, weight: "bold", design: "rounded" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle(
                  isTinted
                    ? { type: "hierarchical", style: "primary" }
                    : palette.accentText
                ),
                padding({ horizontal: 8, vertical: 3.5 }),
                background(
                  palette.accentSoft,
                  shapes.capsule({ roundedCornerStyle: "continuous" })
                ),
              ]}
            >
              {summaryLabel}
            </Text>
          )}
        </HStack>

        {rows.length > 0 ? (
          <VStack alignment="leading" spacing={isCompact ? 4.5 : 6}>
            {rows.map((row) => {
              const rowAccent = isLight ? row.accentLight : row.accentDark;
              const rowBadgeBg = isLight
                ? row.badgeBgLight
                : row.badgeBgDark;
              const rowBadgeText = isLight
                ? row.badgeTextLight
                : row.badgeTextDark;

              const badgeLabel = row.isActive
                ? "EN COURS"
                : row.isDS
                  ? "DS"
                  : row.kind || null;
              const badgeBg = row.isActive
                ? palette.liveSoft
                : row.isDS
                  ? palette.dsSoft
                  : rowBadgeBg;
              const badgeText = row.isActive
                ? palette.liveText
                : row.isDS
                  ? palette.dsText
                  : rowBadgeText;

              return (
                <HStack
                  key={row.key}
                  alignment="center"
                  spacing={8}
                  modifiers={[
                    padding({ horizontal: 9, vertical: isCompact ? 4.5 : 7 }),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                    background(
                      palette.surface,
                      shapes.roundedRectangle({
                        cornerRadius: 11,
                        roundedCornerStyle: "continuous",
                      })
                    ),
                    border({
                      content: row.isActive
                        ? palette.liveAccent
                        : palette.border,
                      width: row.isActive ? 1 : 0.5,
                    }),
                  ]}
                >
                  <RoundedRectangle
                    cornerRadius={2}
                    modifiers={[
                      foregroundStyle(
                        row.isActive ? palette.liveAccent : rowAccent
                      ),
                      frame({ width: 3.5, height: isCompact ? 26 : 30 }),
                    ]}
                  />

                  <VStack
                    alignment="leading"
                    spacing={0}
                    modifiers={[
                      frame({
                        width: isCompact ? 38 : 42,
                        alignment: "leading",
                      }),
                    ]}
                  >
                    <Text
                      modifiers={[
                        font({
                          size: isCompact ? 12 : 13.5,
                          weight: "bold",
                          design: "rounded",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(
                          row.isActive
                            ? palette.liveAccent
                            : isTinted
                              ? { type: "hierarchical", style: "primary" }
                              : palette.textPrimary
                        ),
                      ]}
                    >
                      {row.startLabel}
                    </Text>
                    <Text
                      modifiers={[
                        font({
                          size: isCompact ? 10 : 11,
                          weight: "medium",
                          design: "rounded",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(palette.textMuted),
                      ]}
                    >
                      {row.endLabel}
                    </Text>
                  </VStack>

                  <VStack alignment="leading" spacing={isCompact ? 1 : 2}>
                    <Text
                      modifiers={[
                        font({
                          size: isCompact ? 13 : 14.5,
                          weight: "bold",
                          design: "rounded",
                        }),
                        lineLimit(1),
                        minimumScaleFactor(0.82),
                        foregroundStyle(
                          isTinted
                            ? { type: "hierarchical", style: "primary" }
                            : palette.textPrimary
                        ),
                      ]}
                    >
                      {row.title}
                    </Text>
                    <Text
                      modifiers={[
                        font({
                          size: isCompact ? 10.5 : 11.5,
                          weight: "medium",
                          design: "rounded",
                        }),
                        lineLimit(1),
                        minimumScaleFactor(0.78),
                        foregroundStyle(
                          isTinted
                            ? { type: "hierarchical", style: "secondary" }
                            : palette.textSecondary
                        ),
                      ]}
                    >
                      {row.teacher ? `${row.room} · ${row.teacher}` : row.room}
                    </Text>
                  </VStack>

                  <Spacer minLength={2} />

                  {badgeLabel && (
                    <Text
                      modifiers={[
                        font({
                          size: isCompact ? 9.5 : 10,
                          weight: "bold",
                          design: "rounded",
                        }),
                        lineLimit(1),
                        foregroundStyle(badgeText),
                        padding({ horizontal: 6.5, vertical: 2.5 }),
                        background(
                          badgeBg,
                          shapes.capsule({ roundedCornerStyle: "continuous" })
                        ),
                      ]}
                    >
                      {badgeLabel}
                    </Text>
                  )}
                </HStack>
              );
            })}
          </VStack>
        ) : (
          <VStack
            alignment="center"
            spacing={5}
            modifiers={[
              frame({
                maxWidth: Infinity,
                maxHeight: Infinity,
                alignment: "center",
              }),
            ]}
          >
            <Image systemName="sun.max.fill" size={28} color={palette.accent} />
            <Text
              modifiers={[
                font({ size: 16, weight: "bold", design: "rounded" }),
                foregroundStyle(palette.textPrimary),
              ]}
            >
              Journée libre
            </Text>
            <Text
              modifiers={[
                font({ size: 12.5, weight: "medium", design: "rounded" }),
                foregroundStyle(palette.textSecondary),
              ]}
            >
              Aucun cours programmé
            </Text>
          </VStack>
        )}

        <Spacer minLength={0} />
      </VStack>
    );
  }
);

export default DayAgendaWidget;
