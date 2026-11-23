import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { EdrText } from "@/components/ui/edr-text";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSurface } from "@/components/ui/glass-surface";
import {
  QiblaCompass,
  isQiblaCompassAvailable,
  type QiblaUpdateEvent,
  type QiblaUpdatePayload,
} from "@/components/ui/qibla-compass";
import { StatusBarProgressiveBlur } from "@/components/ui/status-bar-blur";
import {
  FontFamilies,
  MaxContentWidth,
  Radius,
  Spacing,
  getTabScrollPaddingBottom,
} from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import { haptics, useHapticsPreference } from "@/lib/haptics";
import {
  KAABA_LAT,
  KAABA_LON,
  formatCardinalFrench,
  formatCoordinatePair,
  formatDistanceKm,
  getAlignmentGuidance,
} from "@/lib/qibla";

const INITIAL_QIBLA_STATE: QiblaUpdatePayload = {
  permissionStatus: "notDetermined",
  headingAvailable: false,
  locationAvailable: false,
  isTrueNorth: false,
  headingDeg: 0,
  qiblaBearingDeg: 0,
  deltaDeg: 0,
  distanceKm: 0,
  headingAccuracyDeg: -1,
  horizontalAccuracyM: -1,
  latitude: 0,
  longitude: 0,
  isAligned: false,
};

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { isReduced: reducedMotion } = useReducedMotion();
  const { enabled: hapticsEnabled } = useHapticsPreference();
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active"
  );
  const [qiblaState, setQiblaState] =
    useState<QiblaUpdatePayload>(INITIAL_QIBLA_STATE);
  const [permissionNonce, setPermissionNonce] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const compassAvailable = isQiblaCompassAvailable();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      setAppActive(nextState === "active");
    });
    return () => sub.remove();
  }, []);

  const sensorsActive = isFocused && appActive;

  const handleQiblaUpdate = useCallback((event: QiblaUpdateEvent) => {
    setQiblaState(event.nativeEvent);
  }, []);

  const handleRequestPermission = useCallback(() => {
    haptics.soft();
    setPermissionNonce((n) => n + 1);
  }, []);

  const handleRefreshPosition = useCallback(() => {
    haptics.soft();
    setRefreshNonce((n) => n + 1);
  }, []);

  const handleOpenSettings = useCallback(() => {
    haptics.soft();
    void Linking.openSettings();
  }, []);

  const alignedColor = theme.isDark ? theme.menthe[300] : theme.menthe[700];
  const northColor = theme.isDark ? theme.corail[300] : theme.corail[700];
  const warningColor = theme.isDark ? theme.ambre[300] : theme.ambre[700];

  const guidance = getAlignmentGuidance({
    permissionStatus: qiblaState.permissionStatus,
    headingAvailable: qiblaState.headingAvailable,
    locationAvailable: qiblaState.locationAvailable,
    deltaDeg: qiblaState.deltaDeg,
    isAligned: qiblaState.isAligned,
  });

  const toneStyle =
    guidance.tone === "aligned"
      ? {
          bg: theme.isDark ? theme.menthe[900] : theme.menthe[50],
          border: theme.menthe[500],
          fg: alignedColor,
          icon: "checkmark.seal.fill" as const,
        }
      : guidance.tone === "approaching"
        ? {
            bg: theme.accentTiers.softBg,
            border: theme.accentTiers.border,
            fg: theme.accentTiers.text,
            icon: "location.north.line.fill" as const,
          }
        : guidance.tone === "denied"
          ? {
              bg: theme.isDark ? theme.corail[900] : theme.corail[50],
              border: theme.corail[500],
              fg: northColor,
              icon: "location.slash.fill" as const,
            }
          : guidance.tone === "seeking"
            ? {
                bg: theme.cardBg,
                border: theme.cardBorder,
                fg: theme.text,
                icon: "safari.fill" as const,
              }
            : {
                bg: theme.cardBgSubtle,
                border: theme.border,
                fg: theme.textSecondary,
                icon: "location.fill" as const,
              };

  const qiblaBearingDisplay = qiblaState.locationAvailable
    ? `${Math.round(qiblaState.qiblaBearingDeg)}° ${formatCardinalFrench(qiblaState.qiblaBearingDeg)}`
    : "—";
  const headingDisplay = qiblaState.headingAvailable
    ? `${Math.round(qiblaState.headingDeg)}° ${formatCardinalFrench(qiblaState.headingDeg)}`
    : "—";
  const distanceDisplay = qiblaState.locationAvailable
    ? formatDistanceKm(qiblaState.distanceKm)
    : "—";
  const absDeltaRounded = Math.round(Math.abs(qiblaState.deltaDeg));
  const needsCalibration =
    qiblaState.headingAvailable &&
    (qiblaState.headingAccuracyDeg < 0 || qiblaState.headingAccuracyDeg > 25);

  const sensorLabel = qiblaState.isTrueNorth
    ? "Nord vrai"
    : qiblaState.headingAvailable
      ? "Magnétique"
      : "En attente";

  const accuracyLabel =
    qiblaState.locationAvailable && qiblaState.horizontalAccuracyM >= 0
      ? `GPS ±${Math.round(qiblaState.horizontalAccuracyM)} m`
      : formatCoordinatePair(KAABA_LAT, KAABA_LON);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Qibla" }} />
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="location.fill"
            accessibilityLabel="Actualiser la position GPS"
            onPress={handleRefreshPosition}
          >
            <Stack.Toolbar.Label>Recalculer</Stack.Toolbar.Label>
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}

      <ScrollViewMarker
        style={styles.scrollView}
        scrollEdgeEffects={{ top: "soft", bottom: "soft" }}
      >
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop:
                Platform.OS === "ios" ? Spacing.one : insets.top + Spacing.two,
              paddingBottom: getTabScrollPaddingBottom(insets.bottom),
            },
          ]}
        >
          <View style={styles.container}>
            <View style={styles.headerBlock}>
              <ThemedText type="overline" themeColor="accent">
                LA MECQUE · {formatCoordinatePair(KAABA_LAT, KAABA_LON)}
              </ThemedText>
              {Platform.OS !== "ios" && (
                <ThemedText type="largeTitle">Qibla</ThemedText>
              )}
            </View>

            {/* Pilule de guidage temps réel */}
            <GlassSurface
              glassEffectStyle="regular"
              tintColor={toneStyle.bg}
              style={[styles.statusCard, { borderColor: toneStyle.border }]}
              fallbackStyle={{
                backgroundColor: toneStyle.bg,
                borderColor: toneStyle.border,
              }}
            >
              <View style={styles.statusRow}>
                <View style={styles.statusIconWrap}>
                  <SymbolView
                    name={toneStyle.icon}
                    tintColor={toneStyle.fg}
                    size={22}
                  />
                </View>
                <View style={styles.statusTextWrap}>
                  <ThemedText
                    type="headline"
                    style={{ color: toneStyle.fg }}
                    numberOfLines={1}
                  >
                    {guidance.title}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={2}
                  >
                    {guidance.subtitle}
                  </ThemedText>
                </View>
                {qiblaState.locationAvailable && qiblaState.headingAvailable && (
                  <View
                    style={[
                      styles.deltaBadge,
                      {
                        backgroundColor: theme.surfaceMuted,
                        borderColor: toneStyle.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="tabular"
                      style={[styles.deltaBadgeText, { color: toneStyle.fg }]}
                    >
                      {qiblaState.isAligned ? "0°" : `${absDeltaRounded}°`}
                    </ThemedText>
                  </View>
                )}
              </View>
            </GlassSurface>

            {/* Scène de la boussole Metal EDR — aucun overflow:hidden ni borderRadius pour préserver le headroom > 1.0 */}
            <View style={styles.compassStage}>
              {compassAvailable ? (
                <QiblaCompass
                  accentColor={theme.accentTiers.primary}
                  alignedColor={alignedColor}
                  northColor={northColor}
                  ringColor={theme.border}
                  tickColor={theme.textSecondary}
                  textColor={theme.text}
                  surfaceColor={theme.cardBg}
                  isDark={theme.isDark}
                  reducedMotion={reducedMotion}
                  hapticsEnabled={hapticsEnabled}
                  active={sensorsActive}
                  permissionRequestNonce={permissionNonce}
                  refreshNonce={refreshNonce}
                  onQiblaUpdate={handleQiblaUpdate}
                  style={styles.compassCanvas}
                />
              ) : (
                <GlassSurface
                  glassEffectStyle="regular"
                  style={[
                    styles.fallbackCompassCard,
                    { borderColor: theme.cardBorder },
                  ]}
                  fallbackStyle={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <SymbolView
                    name="location.north.circle"
                    tintColor={theme.accent}
                    size={42}
                  />
                  <ThemedText type="headline" style={styles.fallbackTitle}>
                    Boussole Metal EDR iOS
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.fallbackBody}
                  >
                    L’orientation temps réel (CoreLocation, Metal 16-bit EDR et
                    retours CoreHaptics) nécessite un build natif iOS.
                  </ThemedText>
                </GlassSurface>
              )}
            </View>

            {/* Cartes KPI : Cap Qibla, Distance, Capteur */}
            <View style={styles.kpiRow}>
              <GlassSurface
                glassEffectStyle="regular"
                style={[styles.kpiCard, { borderColor: theme.cardBorder }]}
                fallbackStyle={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                }}
              >
                <ThemedText type="overline" themeColor="textMuted">
                  CAP QIBLA
                </ThemedText>
                {qiblaState.isAligned &&
                theme.isDark &&
                qiblaState.locationAvailable ? (
                  <EdrText
                    text={qiblaBearingDisplay}
                    color={alignedColor}
                    linearExposure={1.85}
                    fontSize={20}
                    fontFamily={FontFamilies.displayBold}
                    glowColor={alignedColor}
                    glowRadius={6}
                    style={styles.edrKpiHeight}
                  />
                ) : (
                  <ThemedText
                    type="headline"
                    style={[
                      styles.kpiValue,
                      qiblaState.isAligned ? { color: alignedColor } : null,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {qiblaBearingDisplay}
                  </ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  Cap : {headingDisplay}
                </ThemedText>
              </GlassSurface>

              <GlassSurface
                glassEffectStyle="regular"
                style={[styles.kpiCard, { borderColor: theme.cardBorder }]}
                fallbackStyle={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                }}
              >
                <ThemedText type="overline" themeColor="textMuted">
                  DISTANCE
                </ThemedText>
                <ThemedText
                  type="headline"
                  style={styles.kpiValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {distanceDisplay}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  Grand cercle
                </ThemedText>
              </GlassSurface>

              <GlassSurface
                glassEffectStyle="regular"
                style={[styles.kpiCard, { borderColor: theme.cardBorder }]}
                fallbackStyle={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                }}
              >
                <ThemedText type="overline" themeColor="textMuted">
                  CAPTEUR
                </ThemedText>
                <ThemedText
                  type="headline"
                  style={styles.kpiValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {sensorLabel}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {accuracyLabel}
                </ThemedText>
              </GlassSurface>
            </View>

            {/* Alerte de calibration magnétique si la précision est dégradée */}
            {needsCalibration && (
              <GlassSurface
                glassEffectStyle="regular"
                tintColor={theme.isDark ? theme.ambre[900] : theme.ambre[50]}
                style={[
                  styles.calibrationCard,
                  { borderColor: theme.ambre[500] },
                ]}
                fallbackStyle={{
                  backgroundColor: theme.isDark
                    ? theme.ambre[900]
                    : theme.ambre[50],
                  borderColor: theme.ambre[500],
                }}
              >
                <SymbolView
                  name="gyroscope"
                  tintColor={warningColor}
                  size={20}
                />
                <View style={styles.calibrationTextWrap}>
                  <ThemedText type="captionBold" style={{ color: warningColor }}>
                    Précision magnétique réduite
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Effectuez un mouvement en « 8 » avec l’iPhone pour
                    calibrer le magnétomètre.
                  </ThemedText>
                </View>
              </GlassSurface>
            )}

            {/* Bouton d'autorisation ou d'ouverture des réglages iOS */}
            {compassAvailable && qiblaState.permissionStatus === "notDetermined" && (
              <GlassButton
                tintColor={theme.accentTiers.solidBg}
                borderColor={theme.accentTiers.border}
                onPress={handleRequestPermission}
                style={styles.ctaButton}
              >
                <SymbolView
                  name="location.fill"
                  tintColor={theme.textOnAccent}
                  size={17}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.textOnAccent }}
                >
                  Autoriser la localisation
                </ThemedText>
              </GlassButton>
            )}

            {compassAvailable &&
              (qiblaState.permissionStatus === "denied" ||
                qiblaState.permissionStatus === "restricted") && (
                <GlassButton
                  tintColor={theme.accentTiers.solidBg}
                  borderColor={theme.accentTiers.border}
                  onPress={handleOpenSettings}
                  style={styles.ctaButton}
                >
                  <SymbolView
                    name="gearshape.fill"
                    tintColor={theme.textOnAccent}
                    size={17}
                  />
                  <ThemedText
                    type="captionBold"
                    style={{ color: theme.textOnAccent }}
                  >
                    Ouvrir Réglages iOS
                  </ThemedText>
                </GlassButton>
              )}

            {/* Pied de page discret sur les capteurs et la confidentialité */}
            <View style={styles.footerNote}>
              <ThemedText
                type="small"
                themeColor="textMuted"
                style={styles.footerNoteText}
              >
                Calcul local hors ligne sur l’appareil (Nord vrai GPS +
                magnétomètre). Crans haptiques dynamiques à l’approche et
                verrouillage exact à ±2,5°.
              </ThemedText>
              {qiblaState.locationAvailable && (
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.footerCoords}
                >
                  Position :{" "}
                  {formatCoordinatePair(
                    qiblaState.latitude,
                    qiblaState.longitude
                  )}
                </ThemedText>
              )}
            </View>
          </View>
        </ScrollView>
      </ScrollViewMarker>

      <StatusBarProgressiveBlur />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
  },
  container: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
  },
  headerBlock: {
    gap: Spacing.half,
  },
  statusCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  statusIconWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextWrap: {
    flex: 1,
    gap: 2,
  },
  deltaBadge: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    minWidth: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  deltaBadgeText: {
    fontFamily: FontFamilies.displayBold,
    fontSize: 13,
  },
  compassStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.one,
  },
  compassCanvas: {
    width: 304,
    height: 304,
  },
  fallbackCompassCard: {
    width: "100%",
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  fallbackTitle: {
    textAlign: "center",
  },
  fallbackBody: {
    textAlign: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: FontFamilies.displayBold,
  },
  edrKpiHeight: {
    height: 26,
  },
  calibrationCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  calibrationTextWrap: {
    flex: 1,
    gap: 2,
  },
  ctaButton: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  footerNote: {
    paddingTop: Spacing.one,
    gap: Spacing.half,
  },
  footerNoteText: {
    textAlign: "center",
  },
  footerCoords: {
    textAlign: "center",
  },
});
