import {
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  background,
  border,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  opacity,
  padding,
  progressViewStyle,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import {
  createLiveActivity,
  type LiveActivityEnvironment,
} from "expo-widgets";

import type { CourseLiveActivityProps } from "@/lib/live-activity-payload";

const CourseLiveActivity = createLiveActivity<CourseLiveActivityProps>(
  "CourseLiveActivity",
  (props: CourseLiveActivityProps, environment: LiveActivityEnvironment) => {
    "widget";

    const isLight = environment?.colorScheme === "light";
    const isLuminanceReduced = Boolean(environment?.isLuminanceReduced);
    const palette = isLight ? props.paletteLight : props.paletteDark;
    const courseAccent = isLight ? props.accentLight : props.accentDark;
    const badgeBg = isLight ? props.badgeBgLight : props.badgeBgDark;
    const badgeText = isLight ? props.badgeTextLight : props.badgeTextDark;

    const isStale = Boolean(environment?.isStale);
    const isAutoActive = props.phase === "upcoming" && isStale;
    const isFinished = props.phase === "active" && isStale;
    const effectiveActive =
      props.phase === "active" ? !isFinished : isAutoActive;
    const effectiveUpcoming = props.phase === "upcoming" && !isAutoActive;

    const statusLabel = effectiveActive
      ? "EN COURS"
      : isFinished
        ? "COURS TERMINÉ"
        : props.isDS
          ? "DS IMMINENT"
          : "PROCHAIN COURS";

    const compactStatusLabel = effectiveActive
      ? "EN COURS"
      : isFinished
        ? "FINI"
        : props.isDS
          ? "DS"
          : "BIENTÔT";

    const statusBg = effectiveActive
      ? palette.liveSoft
      : isFinished
        ? palette.accentSoft
        : props.isDS
          ? palette.dsSoft
          : palette.accentSoft;

    const statusText = effectiveActive
      ? palette.liveText
      : isFinished
        ? palette.accentText
        : props.isDS
          ? palette.dsText
          : palette.accentText;

    const activeAccent = effectiveActive
      ? palette.liveAccent
      : props.isDS
        ? palette.dsAccent
        : courseAccent;

    const canActiveTimer = props.startMs < props.endMs;
    const canUpcomingTimer = props.entryMs < props.startMs;

    const leadingSymbol = isFinished
      ? "checkmark.circle.fill"
      : props.isDS
        ? "exclamationmark.circle.fill"
        : effectiveActive
          ? "book.closed.fill"
          : "clock.fill";

    const minimalSymbol = isFinished
      ? "checkmark.circle.fill"
      : props.isDS
        ? "exclamationmark.circle.fill"
        : effectiveActive
          ? "graduationcap.fill"
          : "clock.fill";

    const roomPillBg = effectiveActive
      ? palette.liveSoft
      : props.isDS
        ? palette.dsSoft
        : badgeBg;
    const roomPillBorder = effectiveActive
      ? palette.liveAccent
      : props.isDS
        ? palette.dsAccent
        : activeAccent;
    const roomPillText = effectiveActive
      ? palette.liveText
      : props.isDS
        ? palette.dsText
        : badgeText;

    return {
      banner: (
        <VStack
          alignment="leading"
          spacing={10}
          modifiers={[
            padding({ horizontal: 16, vertical: 14 }),
            frame({ maxWidth: Infinity, alignment: "leading" }),
            activityBackgroundTint(
              isLuminanceReduced ? null : palette.bgStart
            ),
          ]}
        >
          {/* Ligne 1 : statut, type de séance et créneau */}
          <HStack alignment="center" spacing={6}>
            <Text
              modifiers={[
                font({ size: 10.5, weight: "bold", design: "rounded" }),
                lineLimit(1),
                minimumScaleFactor(0.8),
                foregroundStyle(statusText),
                padding({ horizontal: 8, vertical: 3.5 }),
                background(
                  statusBg,
                  shapes.capsule({ roundedCornerStyle: "continuous" })
                ),
              ]}
            >
              {statusLabel}
            </Text>

            {Boolean(props.kind) && (
              <Text
                modifiers={[
                  font({ size: 10, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  foregroundStyle(badgeText),
                  padding({ horizontal: 7, vertical: 3 }),
                  background(
                    badgeBg,
                    shapes.capsule({ roundedCornerStyle: "continuous" })
                  ),
                ]}
              >
                {props.kind}
              </Text>
            )}

            <Spacer />

            <Text
              modifiers={[
                font({ size: 12, weight: "semibold", design: "rounded" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle(palette.textSecondary),
              ]}
            >
              {props.timeRange}
            </Text>
          </HStack>

          {/* Ligne 2 : matière + enseignant à gauche, salle en gros à droite */}
          <HStack alignment="center" spacing={10}>
            <VStack alignment="leading" spacing={2.5}>
              <Text
                modifiers={[
                  font({ size: 17, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  minimumScaleFactor(0.76),
                  foregroundStyle(palette.textPrimary),
                ]}
              >
                {props.title}
              </Text>
              <Text
                modifiers={[
                  font({ size: 12.5, weight: "medium", design: "rounded" }),
                  lineLimit(1),
                  minimumScaleFactor(0.78),
                  foregroundStyle(palette.textSecondary),
                ]}
              >
                {props.teacher || props.subject}
              </Text>
            </VStack>

            <Spacer minLength={6} />

            <HStack
              alignment="center"
              spacing={4}
              modifiers={[
                padding({ horizontal: 10, vertical: 6 }),
                background(
                  roomPillBg,
                  shapes.roundedRectangle({
                    cornerRadius: 10,
                    roundedCornerStyle: "continuous",
                  })
                ),
                border({
                  content: roomPillBorder,
                  width: 0.8,
                }),
                opacity(isLuminanceReduced ? 0.78 : 1),
              ]}
            >
              <Image
                systemName="mappin.and.ellipse"
                size={12}
                color={roomPillText}
              />
              <Text
                modifiers={[
                  font({ size: 16, weight: "bold", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  minimumScaleFactor(0.75),
                  foregroundStyle(roomPillText),
                ]}
              >
                {props.compactRoom}
              </Text>
            </HStack>
          </HStack>

          {/* Ligne 3 : progression live ou compte à rebours avant début */}
          {effectiveActive ? (
            <VStack alignment="leading" spacing={6}>
              {canActiveTimer && (
                <ProgressView
                  timerInterval={{
                    lower: new Date(props.startMs),
                    upper: new Date(props.endMs),
                  }}
                  countsDown={false}
                  modifiers={[
                    progressViewStyle("linear"),
                    tint(activeAccent),
                  ]}
                />
              )}
              <HStack alignment="center" spacing={6}>
                {canActiveTimer ? (
                  <HStack alignment="center" spacing={4}>
                    <Image
                      systemName="hourglass"
                      size={11.5}
                      color={palette.liveAccent}
                    />
                    <Text
                      timerInterval={{
                        lower: new Date(props.startMs),
                        upper: new Date(props.endMs),
                      }}
                      countsDown={true}
                      modifiers={[
                        font({
                          size: 13.5,
                          weight: "bold",
                          design: "rounded",
                        }),
                        monospacedDigit(),
                        lineLimit(1),
                        foregroundStyle(palette.liveAccent),
                      ]}
                    />
                  </HStack>
                ) : (
                  <Text
                    modifiers={[
                      font({ size: 13, weight: "bold", design: "rounded" }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(palette.liveAccent),
                    ]}
                  >
                    {`Fin à ${props.endLabel}`}
                  </Text>
                )}

                <Spacer minLength={6} />

                <Text
                  modifiers={[
                    font({ size: 11.5, weight: "semibold", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    minimumScaleFactor(0.78),
                    foregroundStyle(palette.textMuted),
                  ]}
                >
                  {props.nextCourseHint || `→ ${props.endLabel}`}
                </Text>
              </HStack>
            </VStack>
          ) : effectiveUpcoming ? (
            <HStack alignment="center" spacing={6}>
              <Image systemName="timer" size={13} color={activeAccent} />
              {canUpcomingTimer ? (
                <HStack alignment="center" spacing={4}>
                  <Text
                    modifiers={[
                      font({ size: 13, weight: "semibold", design: "rounded" }),
                      foregroundStyle(activeAccent),
                    ]}
                  >
                    Dans
                  </Text>
                  <Text
                    timerInterval={{
                      lower: new Date(props.entryMs),
                      upper: new Date(props.startMs),
                    }}
                    countsDown={true}
                    modifiers={[
                      font({ size: 14, weight: "bold", design: "rounded" }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(activeAccent),
                    ]}
                  />
                </HStack>
              ) : (
                <Text
                  modifiers={[
                    font({ size: 13.5, weight: "bold", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    foregroundStyle(activeAccent),
                  ]}
                >
                  {`Début ${props.startLabel}`}
                </Text>
              )}

              <Spacer minLength={6} />

              <Text
                modifiers={[
                  font({ size: 12, weight: "semibold", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle(palette.textSecondary),
                ]}
              >
                {`Début ${props.startLabel}`}
              </Text>
            </HStack>
          ) : (
            <HStack alignment="center" spacing={6}>
              <Image
                systemName="checkmark.circle.fill"
                size={13}
                color={palette.liveAccent}
              />
              <Text
                modifiers={[
                  font({ size: 13, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  foregroundStyle(palette.liveAccent),
                ]}
              >
                Séance terminée
              </Text>
              <Spacer minLength={6} />
              {Boolean(props.nextCourseHint) && (
                <Text
                  modifiers={[
                    font({ size: 11.5, weight: "medium", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    minimumScaleFactor(0.75),
                    foregroundStyle(palette.textSecondary),
                  ]}
                >
                  {props.nextCourseHint}
                </Text>
              )}
            </HStack>
          )}
        </VStack>
      ),

      bannerSmall: (
        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[padding({ horizontal: 12, vertical: 10 })]}
        >
          <HStack alignment="center" spacing={6}>
            <Image systemName={leadingSymbol} size={12} color={activeAccent} />
            <Text
              modifiers={[
                font({ size: 13.5, weight: "bold", design: "rounded" }),
                lineLimit(1),
                minimumScaleFactor(0.8),
                foregroundStyle(palette.textPrimary),
              ]}
            >
              {props.title}
            </Text>
            <Spacer minLength={4} />
            <Text
              modifiers={[
                font({ size: 12.5, weight: "bold", design: "rounded" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle(activeAccent),
              ]}
            >
              {props.compactRoom}
            </Text>
          </HStack>

          <HStack alignment="center" spacing={6}>
            {effectiveActive && canActiveTimer ? (
              <Text
                timerInterval={{
                  lower: new Date(props.startMs),
                  upper: new Date(props.endMs),
                }}
                countsDown={true}
                modifiers={[
                  font({ size: 12, weight: "bold", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle(palette.liveAccent),
                ]}
              />
            ) : effectiveUpcoming && canUpcomingTimer ? (
              <Text
                timerInterval={{
                  lower: new Date(props.entryMs),
                  upper: new Date(props.startMs),
                }}
                countsDown={true}
                modifiers={[
                  font({ size: 12, weight: "bold", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle(activeAccent),
                ]}
              />
            ) : (
              <Text
                modifiers={[
                  font({ size: 12, weight: "semibold", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  foregroundStyle(palette.textSecondary),
                ]}
              >
                {isFinished ? "Terminé" : props.startLabel}
              </Text>
            )}
            <Spacer />
            <Text
              modifiers={[
                font({ size: 11, weight: "medium", design: "rounded" }),
                monospacedDigit(),
                lineLimit(1),
                foregroundStyle(palette.textMuted),
              ]}
            >
              {props.timeRange}
            </Text>
          </HStack>
        </VStack>
      ),

      compactLeading: (
        <HStack alignment="center" spacing={4}>
          <Image systemName={leadingSymbol} size={12} color={activeAccent} />
          <Text
            modifiers={[
              font({ size: 12, weight: "bold", design: "rounded" }),
              lineLimit(1),
              minimumScaleFactor(0.78),
            ]}
          >
            {props.subject}
          </Text>
        </HStack>
      ),

      compactTrailing: effectiveActive ? (
        canActiveTimer ? (
          <Text
            timerInterval={{
              lower: new Date(props.startMs),
              upper: new Date(props.endMs),
            }}
            countsDown={true}
            modifiers={[
              font({ size: 12, weight: "bold", design: "rounded" }),
              monospacedDigit(),
              lineLimit(1),
              minimumScaleFactor(0.75),
              frame({ maxWidth: 50, alignment: "trailing" }),
              foregroundStyle(palette.liveAccent),
            ]}
          />
        ) : (
          <Text
            modifiers={[
              font({ size: 12, weight: "bold", design: "rounded" }),
              monospacedDigit(),
              lineLimit(1),
              foregroundStyle(palette.liveAccent),
            ]}
          >
            {props.endLabel}
          </Text>
        )
      ) : effectiveUpcoming ? (
        <Text
          modifiers={[
            font({ size: 12, weight: "bold", design: "rounded" }),
            monospacedDigit(),
            lineLimit(1),
            minimumScaleFactor(0.75),
            frame({ maxWidth: 50, alignment: "trailing" }),
            foregroundStyle(activeAccent),
          ]}
        >
          {props.compactRoom}
        </Text>
      ) : (
        <Image
          systemName="checkmark.circle.fill"
          size={13}
          color={palette.liveAccent}
        />
      ),

      minimal: (
        <Image
          systemName={minimalSymbol}
          size={13}
          color={effectiveActive ? palette.liveAccent : activeAccent}
        />
      ),

      expandedLeading: (
        <Text
          modifiers={[
            font({ size: 10, weight: "bold", design: "rounded" }),
            lineLimit(1),
            minimumScaleFactor(0.8),
            foregroundStyle(statusText),
            padding({ horizontal: 7, vertical: 3 }),
            background(
              statusBg,
              shapes.capsule({ roundedCornerStyle: "continuous" })
            ),
          ]}
        >
          {compactStatusLabel}
        </Text>
      ),

      expandedTrailing: (
        <HStack alignment="center" spacing={3}>
          <Image
            systemName="mappin.and.ellipse"
            size={11}
            color={activeAccent}
          />
          <Text
            modifiers={[
              font({ size: 14.5, weight: "bold", design: "rounded" }),
              monospacedDigit(),
              lineLimit(1),
              minimumScaleFactor(0.75),
              foregroundStyle(activeAccent),
            ]}
          >
            {props.compactRoom}
          </Text>
        </HStack>
      ),

      expandedCenter: (
        <Text
          modifiers={[
            font({ size: 15, weight: "bold", design: "rounded" }),
            lineLimit(1),
            minimumScaleFactor(0.75),
          ]}
        >
          {props.title}
        </Text>
      ),

      expandedBottom: (
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            padding({ horizontal: 4, vertical: 2 }),
            frame({ maxWidth: Infinity, alignment: "leading" }),
          ]}
        >
          {effectiveActive ? (
            <>
              {canActiveTimer && (
                <ProgressView
                  timerInterval={{
                    lower: new Date(props.startMs),
                    upper: new Date(props.endMs),
                  }}
                  countsDown={false}
                  modifiers={[
                    progressViewStyle("linear"),
                    tint(activeAccent),
                  ]}
                />
              )}
              <HStack alignment="center" spacing={6}>
                {canActiveTimer ? (
                  <Text
                    timerInterval={{
                      lower: new Date(props.startMs),
                      upper: new Date(props.endMs),
                    }}
                    countsDown={true}
                    modifiers={[
                      font({ size: 13, weight: "bold", design: "rounded" }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(palette.liveAccent),
                    ]}
                  />
                ) : (
                  <Text
                    modifiers={[
                      font({ size: 12.5, weight: "bold", design: "rounded" }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(palette.liveAccent),
                    ]}
                  >
                    {`→ ${props.endLabel}`}
                  </Text>
                )}

                <Spacer minLength={6} />

                <Text
                  modifiers={[
                    font({ size: 11.5, weight: "medium", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    minimumScaleFactor(0.78),
                    foregroundStyle(palette.textSecondary),
                  ]}
                >
                  {props.teacher
                    ? `${props.teacher} · → ${props.endLabel}`
                    : `Fin ${props.endLabel}`}
                </Text>
              </HStack>
            </>
          ) : effectiveUpcoming ? (
            <HStack alignment="center" spacing={6}>
              <Image systemName="timer" size={12} color={activeAccent} />
              {canUpcomingTimer ? (
                <HStack alignment="center" spacing={4}>
                  <Text
                    modifiers={[
                      font({ size: 12.5, weight: "semibold", design: "rounded" }),
                      foregroundStyle(activeAccent),
                    ]}
                  >
                    Dans
                  </Text>
                  <Text
                    timerInterval={{
                      lower: new Date(props.entryMs),
                      upper: new Date(props.startMs),
                    }}
                    countsDown={true}
                    modifiers={[
                      font({ size: 13, weight: "bold", design: "rounded" }),
                      monospacedDigit(),
                      lineLimit(1),
                      foregroundStyle(activeAccent),
                    ]}
                  />
                </HStack>
              ) : (
                <Text
                  modifiers={[
                    font({ size: 12.5, weight: "bold", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    foregroundStyle(activeAccent),
                  ]}
                >
                  {props.startLabel}
                </Text>
              )}

              <Spacer minLength={6} />

              <Text
                modifiers={[
                  font({ size: 11.5, weight: "medium", design: "rounded" }),
                  monospacedDigit(),
                  lineLimit(1),
                  minimumScaleFactor(0.78),
                  foregroundStyle(palette.textSecondary),
                ]}
              >
                {props.teacher
                  ? `${props.teacher} · ${props.timeRange}`
                  : props.timeRange}
              </Text>
            </HStack>
          ) : (
            <HStack alignment="center" spacing={6}>
              <Image
                systemName="checkmark.circle.fill"
                size={12}
                color={palette.liveAccent}
              />
              <Text
                modifiers={[
                  font({ size: 12.5, weight: "bold", design: "rounded" }),
                  lineLimit(1),
                  foregroundStyle(palette.liveAccent),
                ]}
              >
                Séance terminée
              </Text>
              <Spacer minLength={6} />
              {Boolean(props.nextCourseHint) && (
                <Text
                  modifiers={[
                    font({ size: 11, weight: "medium", design: "rounded" }),
                    monospacedDigit(),
                    lineLimit(1),
                    minimumScaleFactor(0.75),
                    foregroundStyle(palette.textSecondary),
                  ]}
                >
                  {props.nextCourseHint}
                </Text>
              )}
            </HStack>
          )}
        </VStack>
      ),
    };
  }
);

export default CourseLiveActivity;
