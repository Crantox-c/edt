import {
  Circle,
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
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
  opacity,
  padding,
  shapes,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { WeekOverviewWidgetProps } from "@/lib/widget-timeline";

const WeekOverviewWidget = createWidget<WeekOverviewWidgetProps>(
  "WeekOverviewWidget",
  (props: WeekOverviewWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    if (!props?.paletteDark || !props?.paletteLight) {
      return (
        <VStack
          alignment="leading"
          spacing={8}
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
            <Image systemName="calendar.badge.clock" size={15} />
            <Text
              modifiers={[
                font({ size: 14, weight: "bold", design: "rounded" }),
                lineLimit(1),
                foregroundStyle({ type: "hierarchical", style: "primary" }),
              ]}
            >
              GEII EDT · Semaine &amp; DS
            </Text>
          </HStack>
          <Spacer minLength={2} />
          <Text
            modifiers={[
              font({ size: 12, weight: "medium" }),
              lineLimit(2),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            Ouvrez l&apos;app pour synchroniser votre emploi du temps
          </Text>
          <Spacer minLength={0} />
        </VStack>
      );
    }

    const isLight = environment?.colorScheme === "light";
    const palette = isLight ? props.paletteLight : props.paletteDark;
    const isTinted = environment?.widgetRenderingMode === "accented";
    const days = props.days ?? [];
    const upcomingRows = props.upcomingRows ?? [];

    return (
      <VStack
        alignment="leading"
        spacing={8}
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
          <Image
            systemName="calendar.badge.clock"
            size={14}
            color={palette.accent}
          />
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
            {props.weekLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 10, weight: "bold", design: "monospaced" }),
              monospacedDigit(),
              lineLimit(1),
              foregroundStyle(
                isTinted
                  ? { type: "hierarchical", style: "primary" }
                  : palette.accentText
              ),
              padding({ horizontal: 8, vertical: 3 }),
              background(
                palette.accentSoft,
                shapes.capsule({ roundedCornerStyle: "continuous" })
              ),
            ]}
          >
            {`${props.totalDuration} · ${props.totalCoursesCount} cours`}
          </Text>
        </HStack>

        {/* Bande de charge hebdomadaire */}
        {days.length > 0 && (
          <HStack
            alignment="bottom"
            spacing={6}
            modifiers={[
              padding({ horizontal: 10, vertical: 8 }),
              frame({ maxWidth: Infinity }),
              background(
                palette.surface,
                shapes.roundedRectangle({
                  cornerRadius: 12,
                  roundedCornerStyle: "continuous",
                })
              ),
              border({ content: palette.border, width: 0.5 }),
            ]}
          >
            {days.map((day) => {
              const barHeight =
                day.courseCount > 0
                  ? Math.max(6, Math.round(day.loadRatio * 34))
                  : 4;
              const barColor =
                day.courseCount === 0
                  ? palette.border
                  : day.hasDS
                    ? palette.dsAccent
                    : day.isToday
                      ? palette.accent
                      : palette.accentSoft;

              return (
                <VStack
                  key={day.dateStr}
                  alignment="center"
                  spacing={3}
                  modifiers={[frame({ maxWidth: Infinity })]}
                >
                  <Circle
                    modifiers={[
                      foregroundStyle(palette.dsAccent),
                      frame({ width: 5, height: 5 }),
                      opacity(day.hasDS ? 1 : 0),
                    ]}
                  />
                  <ZStack
                    alignment="bottom"
                    modifiers={[frame({ width: 16, height: 34 })]}
                  >
                    <RoundedRectangle
                      cornerRadius={4}
                      modifiers={[
                        foregroundStyle(palette.border),
                        frame({ width: 16, height: 34 }),
                        opacity(0.35),
                      ]}
                    />
                    <RoundedRectangle
                      cornerRadius={4}
                      modifiers={[
                        foregroundStyle(barColor),
                        frame({ width: 16, height: barHeight }),
                      ]}
                    />
                  </ZStack>
                  <HStack alignment="center" spacing={2}>
                    <Text
                      modifiers={[
                        font({
                          size: 10,
                          weight: day.isToday ? "bold" : "semibold",
                          design: "rounded",
                        }),
                        lineLimit(1),
                        foregroundStyle(
                          day.isToday ? palette.accentText : palette.textSecondary
                        ),
                      ]}
                    >
                      {day.dayInitial}
                    </Text>
                    <Text
                      modifiers={[
                        font({
                          size: 10,
                          weight: day.isToday ? "bold" : "medium",
                          design: "monospaced",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(
                          day.isToday ? palette.accentText : palette.textMuted
                        ),
                      ]}
                    >
                      {day.dayNum}
                    </Text>
                  </HStack>
                </VStack>
              );
            })}
          </HStack>
        )}

        {/* Liste des prochains créneaux */}
        {upcomingRows.length > 0 ? (
          <VStack alignment="leading" spacing={5}>
            {upcomingRows.map((row) => {
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
                  spacing={7}
                  modifiers={[
                    padding({ horizontal: 8, vertical: 5 }),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                    background(
                      palette.surface,
                      shapes.roundedRectangle({
                        cornerRadius: 9,
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
                      frame({ width: 3, height: 22 }),
                    ]}
                  />

                  <VStack
                    alignment="leading"
                    spacing={0}
                    modifiers={[frame({ width: 52, alignment: "leading" })]}
                  >
                    <Text
                      modifiers={[
                        font({ size: 9, weight: "bold", design: "rounded" }),
                        lineLimit(1),
                        foregroundStyle(palette.textSecondary),
                      ]}
                    >
                      {row.dayShort}
                    </Text>
                    <Text
                      modifiers={[
                        font({
                          size: 10,
                          weight: "bold",
                          design: "monospaced",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(
                          row.isActive
                            ? palette.liveAccent
                            : palette.textPrimary
                        ),
                      ]}
                    >
                      {row.startLabel}
                    </Text>
                  </VStack>

                  <VStack alignment="leading" spacing={1}>
                    <Text
                      modifiers={[
                        font({ size: 12, weight: "bold", design: "rounded" }),
                        lineLimit(1),
                        minimumScaleFactor(0.84),
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
                        font({ size: 10, weight: "medium" }),
                        lineLimit(1),
                        minimumScaleFactor(0.84),
                        foregroundStyle(
                          isTinted
                            ? { type: "hierarchical", style: "secondary" }
                            : palette.textSecondary
                        ),
                      ]}
                    >
                      {row.room}
                    </Text>
                  </VStack>

                  <Spacer minLength={2} />

                  {badgeLabel && (
                    <Text
                      modifiers={[
                        font({ size: 9, weight: "bold", design: "rounded" }),
                        lineLimit(1),
                        foregroundStyle(badgeText),
                        padding({ horizontal: 6, vertical: 2 }),
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
            spacing={4}
            modifiers={[
              padding({ vertical: 16 }),
              frame({ maxWidth: Infinity, alignment: "center" }),
              background(
                palette.surface,
                shapes.roundedRectangle({
                  cornerRadius: 12,
                  roundedCornerStyle: "continuous",
                })
              ),
              border({ content: palette.border, width: 0.5 }),
            ]}
          >
            <Image systemName="sparkles" size={20} color={palette.accent} />
            <Text
              modifiers={[
                font({ size: 13, weight: "bold", design: "rounded" }),
                foregroundStyle(palette.textPrimary),
              ]}
            >
              Aucun cours à venir cette semaine
            </Text>
          </VStack>
        )}

        {/* Bandeau prochain DS */}
        {Boolean(props.nextDsSummary) && (
          <HStack
            alignment="center"
            spacing={6}
            modifiers={[
              padding({ horizontal: 9, vertical: 6 }),
              frame({ maxWidth: Infinity, alignment: "leading" }),
              background(
                palette.dsSoft,
                shapes.roundedRectangle({
                  cornerRadius: 10,
                  roundedCornerStyle: "continuous",
                })
              ),
            ]}
          >
            <Image
              systemName="exclamationmark.circle.fill"
              size={12}
              color={palette.dsAccent}
            />
            <Text
              modifiers={[
                font({ size: 11, weight: "semibold", design: "rounded" }),
                lineLimit(1),
                minimumScaleFactor(0.84),
                foregroundStyle(palette.dsText),
              ]}
            >
              {props.nextDsSummary}
            </Text>
          </HStack>
        )}

        <Spacer minLength={0} />

        <HStack alignment="center" spacing={6}>
          <Text
            modifiers={[
              font({ size: 10, weight: "semibold", design: "rounded" }),
              lineLimit(1),
              foregroundStyle(palette.textSecondary),
            ]}
          >
            {props.extraUpcomingCount > 0
              ? `+${props.extraUpcomingCount} autre${props.extraUpcomingCount > 1 ? "s" : ""} créneau${props.extraUpcomingCount > 1 ? "x" : ""}`
              : "Emploi du temps"}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 9, weight: "medium", design: "monospaced" }),
              monospacedDigit(),
              lineLimit(1),
              foregroundStyle(palette.textMuted),
            ]}
          >
            {props.updatedAtLabel}
          </Text>
        </HStack>
      </VStack>
    );
  }
);

export default WeekOverviewWidget;
