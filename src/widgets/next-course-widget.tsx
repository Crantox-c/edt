import {
  AccessoryWidgetBackground,
  Gauge,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  progressViewStyle,
  shapes,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { NextCourseWidgetProps } from "@/lib/widget-timeline";

const NextCourseWidget = createWidget<NextCourseWidgetProps>(
  "NextCourseWidget",
  (props: NextCourseWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const isLight = environment?.colorScheme === "light";
    const palette = isLight ? props.paletteLight : props.paletteDark;
    const family = environment?.widgetFamily ?? "systemSmall";
    const isTinted = environment?.widgetRenderingMode === "accented";

    const course = props.course;
    const isActive = props.status === "active" && course != null;
    const courseAccent = course
      ? isLight
        ? course.accentLight
        : course.accentDark
      : palette.accent;

    // 1. Écran de verrouillage : ligne au-dessus de l'heure
    if (family === "accessoryInline") {
      if (course) {
        const inlineText = isActive
          ? `${course.subject} · fin ${course.endLabel} · ${course.compactRoom} · ${props.updatedShortLabel}`
          : `${course.subject} · ${course.startLabel} · ${course.compactRoom} · ${props.updatedShortLabel}`;
        return (
          <HStack
            spacing={4}
            modifiers={[
              containerBackground("clear", "widget"),
              widgetURL("geiiedt://"),
            ]}
          >
            <Image
              systemName={
                course.isDS
                  ? "exclamationmark.circle.fill"
                  : isActive
                    ? "timer"
                    : "clock.fill"
              }
            />
            <Text modifiers={[lineLimit(1)]}>{inlineText}</Text>
          </HStack>
        );
      }

      return (
        <HStack
          spacing={4}
          modifiers={[
            containerBackground("clear", "widget"),
            widgetURL("geiiedt://"),
          ]}
        >
          <Image systemName="checkmark.circle.fill" />
          <Text modifiers={[lineLimit(1)]}>
            {`Aucun cours · ${props.updatedShortLabel}`}
          </Text>
        </HStack>
      );
    }

    // 2. Écran de verrouillage : jauge circulaire native
    if (family === "accessoryCircular") {
      if (isActive && course) {
        return (
          <Gauge
            value={course.progress}
            min={0}
            max={1}
            currentValueLabel={
              <VStack alignment="center" spacing={0}>
                <Text
                  modifiers={[
                    font({ size: 11, weight: "bold", design: "rounded" }),
                    lineLimit(1),
                    minimumScaleFactor(0.6),
                  ]}
                >
                  {course.subject}
                </Text>
                <Text
                  modifiers={[
                    font({ size: 7, weight: "semibold", design: "monospaced" }),
                    monospacedDigit(),
                    lineLimit(1),
                    foregroundStyle({
                      type: "hierarchical",
                      style: "secondary",
                    }),
                  ]}
                >
                  {props.updatedShortLabel}
                </Text>
              </VStack>
            }
            modifiers={[
              gaugeStyle("circularCapacity"),
              tint(courseAccent),
              containerBackground("clear", "widget"),
              widgetURL("geiiedt://"),
            ]}
          >
            <Text>{course.subject}</Text>
          </Gauge>
        );
      }

      return (
        <ZStack
          alignment="center"
          modifiers={[
            containerBackground("clear", "widget"),
            widgetURL("geiiedt://"),
          ]}
        >
          <AccessoryWidgetBackground />
          {course ? (
            <VStack alignment="center" spacing={1}>
              <Text
                modifiers={[
                  font({ size: 11, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  minimumScaleFactor(0.65),
                  foregroundStyle({ type: "hierarchical", style: "primary" }),
                ]}
              >
                {course.subject}
              </Text>
              <Text
                modifiers={[
                  font({ size: 10, weight: "semibold", design: "monospaced" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle({ type: "hierarchical", style: "primary" }),
                ]}
              >
                {course.startLabel}
              </Text>
              <Text
                modifiers={[
                  font({ size: 7, weight: "medium", design: "monospaced" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.updatedShortLabel}
              </Text>
            </VStack>
          ) : (
            <VStack alignment="center" spacing={1}>
              <Image systemName="checkmark.circle.fill" size={14} />
              <Text
                modifiers={[
                  font({ size: 9, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                ]}
              >
                Libre
              </Text>
              <Text
                modifiers={[
                  font({ size: 7, weight: "medium", design: "monospaced" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.updatedShortLabel}
              </Text>
            </VStack>
          )}
        </ZStack>
      );
    }

    // 3. Écran de verrouillage : carte rectangulaire (verre géré par iOS)
    if (family === "accessoryRectangular") {
      const canLiveCountActive =
        isActive && course != null && props.entryMs < course.endMs;
      const headerLabel = course?.isDS
        ? `DS · ${props.dayContext}`
        : props.dayContext;

      return (
        <VStack
          alignment="leading"
          spacing={2}
          modifiers={[
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: "leading",
            }),
            containerBackground("clear", "widget"),
            widgetURL("geiiedt://"),
          ]}
        >
          <HStack alignment="center" spacing={4}>
            <Text
              modifiers={[
                font({ size: 10, weight: "bold", design: "rounded" }),
                lineLimit(1),
                foregroundStyle({ type: "hierarchical", style: "secondary" }),
              ]}
            >
              {headerLabel}
            </Text>
            <Spacer />
            <Text
              modifiers={[
                font({ size: 9, weight: "medium", design: "monospaced" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle({ type: "hierarchical", style: "secondary" }),
              ]}
            >
              {props.updatedShortLabel}
            </Text>
          </HStack>

          {course ? (
            <>
              <Text
                modifiers={[
                  font({ size: 14, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  minimumScaleFactor(0.8),
                  foregroundStyle({ type: "hierarchical", style: "primary" }),
                ]}
              >
                {course.title}
              </Text>

              {canLiveCountActive ? (
                <HStack alignment="center" spacing={4}>
                  <Text
                    timerInterval={{
                      lower: new Date(props.entryMs),
                      upper: new Date(course.endMs),
                    }}
                    countsDown={true}
                    modifiers={[
                      font({
                        size: 11,
                        weight: "semibold",
                        design: "monospaced",
                      }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle({
                        type: "hierarchical",
                        style: "primary",
                      }),
                    ]}
                  />
                  <Text
                    modifiers={[
                      font({ size: 11, weight: "medium" }),
                      lineLimit(1),
                      minimumScaleFactor(0.8),
                      foregroundStyle({
                        type: "hierarchical",
                        style: "secondary",
                      }),
                    ]}
                  >
                    {`· ${course.compactRoom}`}
                  </Text>
                </HStack>
              ) : (
                <Text
                  modifiers={[
                    font({ size: 11, weight: "medium", design: "monospaced" }),
                    monospacedDigit(),
                    lineLimit(1),
                    minimumScaleFactor(0.8),
                    foregroundStyle({
                      type: "hierarchical",
                      style: "secondary",
                    }),
                  ]}
                >
                  {`${course.startLabel}–${course.endLabel} · ${course.compactRoom}`}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text
                modifiers={[
                  font({ size: 13, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  foregroundStyle({ type: "hierarchical", style: "primary" }),
                ]}
              >
                Aucun cours à venir
              </Text>
              <Text
                modifiers={[
                  font({ size: 11, weight: "medium" }),
                  lineLimit(1),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                Emploi du temps à jour
              </Text>
            </>
          )}
        </VStack>
      );
    }

    // 4. Écran d'accueil : widget petit (systemSmall)
    const statusBadgeLabel = isActive
      ? "EN COURS"
      : course?.isDS
        ? `DS · ${props.dayContext}`
        : props.dayContext;
    const statusBgColor = isActive
      ? palette.liveSoft
      : course?.isDS
        ? palette.dsSoft
        : palette.accentSoft;
    const statusTextColor = isActive
      ? palette.liveText
      : course?.isDS
        ? palette.dsText
        : palette.accentText;

    const canProgressBar =
      isActive && course != null && course.startMs < course.endMs;
    const canLiveEndTimer =
      isActive && course != null && props.entryMs < course.endMs;
    const canLiveStartTimer =
      !isActive &&
      course != null &&
      props.useLiveTimer &&
      props.entryMs < course.startMs;

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
        <HStack alignment="center" spacing={4}>
          <Text
            modifiers={[
              font({ size: 10, weight: "bold", design: "rounded" }),
              lineLimit(1),
              minimumScaleFactor(0.8),
              foregroundStyle(
                isTinted
                  ? { type: "hierarchical", style: "primary" }
                  : statusTextColor
              ),
              padding({ horizontal: 7, vertical: 3 }),
              background(
                statusBgColor,
                shapes.capsule({ roundedCornerStyle: "continuous" })
              ),
            ]}
          >
            {statusBadgeLabel}
          </Text>
          <Spacer />
          {course && (
            <Text
              modifiers={[
                font({ size: 11, weight: "semibold", design: "monospaced" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle(
                  isTinted
                    ? { type: "hierarchical", style: "secondary" }
                    : palette.textSecondary
                ),
              ]}
            >
              {course.startLabel}
            </Text>
          )}
        </HStack>

        {course ? (
          <>
            <Text
              modifiers={[
                font({ size: 15, weight: "bold", design: "rounded" }),
                lineLimit(2),
                minimumScaleFactor(0.8),
                foregroundStyle(
                  isTinted
                    ? { type: "hierarchical", style: "primary" }
                    : palette.textPrimary
                ),
              ]}
            >
              {course.title}
            </Text>

            <HStack alignment="center" spacing={4}>
              <Image
                systemName="mappin.and.ellipse"
                size={10}
                color={palette.textSecondary}
              />
              <Text
                modifiers={[
                  font({ size: 11, weight: "medium" }),
                  lineLimit(1),
                  minimumScaleFactor(0.82),
                  foregroundStyle(
                    isTinted
                      ? { type: "hierarchical", style: "secondary" }
                      : palette.textSecondary
                  ),
                ]}
              >
                {course.room}
              </Text>
            </HStack>

            <Spacer minLength={2} />

            {isActive ? (
              <VStack alignment="leading" spacing={4}>
                {canProgressBar && (
                  <ProgressView
                    timerInterval={{
                      lower: new Date(course.startMs),
                      upper: new Date(course.endMs),
                    }}
                    countsDown={false}
                    modifiers={[
                      progressViewStyle("linear"),
                      tint(courseAccent),
                    ]}
                  />
                )}
                <HStack alignment="center" spacing={4}>
                  {canLiveEndTimer ? (
                    <Text
                      timerInterval={{
                        lower: new Date(props.entryMs),
                        upper: new Date(course.endMs),
                      }}
                      countsDown={true}
                      modifiers={[
                        font({
                          size: 11,
                          weight: "bold",
                          design: "monospaced",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(palette.liveAccent),
                      ]}
                    />
                  ) : (
                    <Text
                      modifiers={[
                        font({ size: 11, weight: "bold", design: "rounded" }),
                        lineLimit(1),
                        foregroundStyle(palette.liveAccent),
                      ]}
                    >
                      {props.countdownLabel}
                    </Text>
                  )}
                  <Spacer />
                  <Text
                    modifiers={[
                      font({
                        size: 10,
                        weight: "medium",
                        design: "monospaced",
                      }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(palette.textMuted),
                    ]}
                  >
                    {`→ ${course.endLabel}`}
                  </Text>
                </HStack>
              </VStack>
            ) : (
              <VStack alignment="leading" spacing={2}>
                <HStack alignment="center" spacing={4}>
                  <Image
                    systemName={canLiveStartTimer ? "timer" : "clock"}
                    size={10}
                    color={courseAccent}
                  />
                  {canLiveStartTimer ? (
                    <>
                      <Text
                        modifiers={[
                          font({ size: 11, weight: "semibold" }),
                          foregroundStyle(courseAccent),
                        ]}
                      >
                        Dans
                      </Text>
                      <Text
                        timerInterval={{
                          lower: new Date(props.entryMs),
                          upper: new Date(course.startMs),
                        }}
                        countsDown={true}
                        modifiers={[
                          font({
                            size: 11,
                            weight: "bold",
                            design: "monospaced",
                          }),
                          monospacedDigit(),
                          lineLimit(1),
                          foregroundStyle(courseAccent),
                        ]}
                      />
                    </>
                  ) : (
                    <Text
                      modifiers={[
                        font({ size: 11, weight: "semibold", design: "rounded" }),
                        lineLimit(1),
                        minimumScaleFactor(0.85),
                        foregroundStyle(courseAccent),
                      ]}
                    >
                      {props.countdownLabel}
                    </Text>
                  )}
                </HStack>
                <Text
                  modifiers={[
                    font({ size: 10, weight: "medium", design: "monospaced" }),
                    monospacedDigit(),
                    lineLimit(1),
                    foregroundStyle(palette.textMuted),
                  ]}
                >
                  {course.timeRange}
                </Text>
              </VStack>
            )}
          </>
        ) : (
          <>
            <Spacer minLength={2} />
            <VStack alignment="leading" spacing={4}>
              <Image systemName="sun.max.fill" size={22} color={palette.accent} />
              <Text
                modifiers={[
                  font({ size: 13, weight: "bold", design: "rounded" }),
                  lineLimit(2),
                  foregroundStyle(palette.textPrimary),
                ]}
              >
                Aucun cours à venir
              </Text>
              <Text
                modifiers={[
                  font({ size: 11, weight: "medium" }),
                  lineLimit(1),
                  foregroundStyle(palette.textSecondary),
                ]}
              >
                {props.dayContext}
              </Text>
            </VStack>
            <Spacer minLength={2} />
          </>
        )}

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
      </VStack>
    );
  }
);

export default NextCourseWidget;
