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

    const fallbackDiag = (props as { __diag?: string } | undefined)?.__diag;
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
                font({ size: 15, weight: "bold", design: "rounded" }),
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
    const days = props.days ?? [];
    const upcomingRows = props.upcomingRows ?? [];
    const isDense = upcomingRows.length >= 5;

    return (
      <VStack
        alignment="leading"
        spacing={isDense ? 6 : 7}
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
            size={15}
            color={palette.accent}
          />
          <Text
            modifiers={[
              font({ size: 15, weight: "bold", design: "rounded" }),
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
              font({ size: 11, weight: "bold", design: "rounded" }),
              monospacedDigit(),
              lineLimit(1),
              foregroundStyle(
                isTinted
                  ? { type: "hierarchical", style: "primary" }
                  : palette.accentText
              ),
              padding({ horizontal: 9, vertical: 3.5 }),
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
                  ? Math.max(7, Math.round(day.loadRatio * 38))
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
                    modifiers={[frame({ width: 18, height: 38 })]}
                  >
                    <RoundedRectangle
                      cornerRadius={4}
                      modifiers={[
                        foregroundStyle(palette.border),
                        frame({ width: 18, height: 38 }),
                        opacity(0.35),
                      ]}
                    />
                    <RoundedRectangle
                      cornerRadius={4}
                      modifiers={[
                        foregroundStyle(barColor),
                        frame({ width: 18, height: barHeight }),
                      ]}
                    />
                  </ZStack>
                  <HStack alignment="center" spacing={2}>
                    <Text
                      modifiers={[
                        font({
                          size: 11,
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
                          size: 11,
                          weight: day.isToday ? "bold" : "medium",
                          design: "rounded",
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
          <VStack alignment="leading" spacing={isDense ? 4.5 : 6}>
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
                  spacing={8}
                  modifiers={[
                    padding({ horizontal: 9, vertical: isDense ? 4.5 : 6 }),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                    background(
                      palette.surface,
                      shapes.roundedRectangle({
                        cornerRadius: 10,
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
                      frame({ width: 3.5, height: isDense ? 24 : 27 }),
                    ]}
                  />

                  <VStack
                    alignment="leading"
                    spacing={0}
                    modifiers={[frame({ width: 54, alignment: "leading" })]}
                  >
                    <Text
                      modifiers={[
                        font({
                          size: isDense ? 9.5 : 10,
                          weight: "bold",
                          design: "rounded",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(palette.textSecondary),
                      ]}
                    >
                      {row.dayShort}
                    </Text>
                    <Text
                      modifiers={[
                        font({
                          size: isDense ? 11.5 : 12.5,
                          weight: "bold",
                          design: "rounded",
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
                        font({
                          size: isDense ? 12.5 : 13.5,
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
                          size: isDense ? 10.5 : 11,
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
                          size: 9.5,
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
              padding({ vertical: 18 }),
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
            <Image systemName="sparkles" size={22} color={palette.accent} />
            <Text
              modifiers={[
                font({ size: 14, weight: "bold", design: "rounded" }),
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
              padding({ horizontal: 10, vertical: 7 }),
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
              size={13}
              color={palette.dsAccent}
            />
            <Text
              modifiers={[
                font({ size: 11.5, weight: "semibold", design: "rounded" }),
                monospacedDigit(),
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
      </VStack>
    );
  }
);

export default WeekOverviewWidget;
