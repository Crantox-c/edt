import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { SymbolView } from "expo-symbols";

import { AccentSwitcher } from "@/components/accent-switcher";
import { ClassPickerModal } from "@/components/class-picker-modal";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/segmented-control";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSurfaceContainer } from "@/components/ui/glass-surface";
import {
  FontFamilies,
  MaxContentWidth,
  Radius,
  Spacing,
  getCourseColorTokens,
  getTabScrollPaddingBottom,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import {
  useReducedMotion,
  type ReducedMotionPreference,
} from "@/hooks/use-reduced-motion";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import { formatTime, formatTotalDuration } from "@/lib/dates";
import { DEFAULT_API_BASE, isCourseDS } from "@/lib/geii-api";
import { haptics, useHapticsPreference } from "@/lib/haptics";
import { MAX_IOS_NOTIFICATIONS } from "@/lib/notifications";
import {
  getSubjectDictionarySnapshot,
  resetSubjectDictionary,
  setSubjectCustomName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";
import {
  getWidgetSyncStatusSnapshot,
  isWidgetsAvailable,
  subscribeWidgetSync,
} from "@/lib/widget-sync";

const LEAD_TIMES = [5, 10, 15, 30];

const REDUCED_MOTION_OPTIONS: readonly SegmentedOption<ReducedMotionPreference>[] = [
  { key: "system", label: "Système" },
  { key: "on", label: "Activé" },
  { key: "off", label: "Désactivé" },
];

const WIDGET_SUMMARY_ITEMS = [
  {
    name: "NextCourseWidget",
    title: "Prochain cours",
    subtitle: "Accueil petit · Écran verrouillé (cercle, rectangle, ligne)",
  },
  {
    name: "DayAgendaWidget",
    title: "Journée",
    subtitle: "Accueil moyen · Programme du jour & salles",
  },
  {
    name: "WeekOverviewWidget",
    title: "Semaine & DS",
    subtitle: "Accueil grand · Charge hebdo & prochain DS",
  },
] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const nowMs = useCurrentTime();
  const { preference: motionPref, setPreference: setMotionPref } =
    useReducedMotion();
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled } =
    useHapticsPreference();
  const accent = theme.accentTiers;
  const ambre = theme.ambre;
  const corail = theme.corail;

  const {
    groups,
    activeGroup,
    apiBaseUrl,
    courses,
    isSyncing,
    refresh,
    selectGroup,
    updateApiBaseUrl,
    refreshWidgets,
    notifications: {
      settings: notifSettings,
      permissionGranted,
      scheduledCount,
      updateSettings: updateNotifSettings,
      requestPermission,
      reschedule,
    },
  } = useSchedule();

  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );

  const widgetStatus = useSyncExternalStore(
    subscribeWidgetSync,
    getWidgetSyncStatusSnapshot,
    getWidgetSyncStatusSnapshot
  );
  const widgetsReady = isWidgetsAvailable();

  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [showAdvancedApi, setShowAdvancedApi] = useState(false);
  const [editedBaseUrl, setEditedBaseUrl] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const baseUrlValue = editedBaseUrl ?? apiBaseUrl;

  const kpis = useMemo(() => {
    const upcoming = courses.filter((c) => c.end > nowMs);
    const upcomingDs = upcoming.filter((c) => isCourseDS(c));
    return {
      totalHours: formatTotalDuration(courses),
      upcomingCount: upcoming.length,
      upcomingDsCount: upcomingDs.length,
    };
  }, [courses, nowMs]);

  const subjectStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      const hours = Math.max(0, (c.end - c.start) / 3600000);
      map.set(c.subject, (map.get(c.subject) ?? 0) + hours);
    }
    return Array.from(map.entries())
      .map(([subject, hours]) => ({
        subject,
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [courses]);

  const maxSubjectHours = subjectStats[0]?.hours || 1;

  const handleAddSubjectMapping = () => {
    if (!newCode.trim() || !newName.trim()) {
      haptics.warning();
      return;
    }
    haptics.success();
    setSubjectCustomName(newCode, newName);
    setNewCode("");
    setNewName("");
  };

  const handleToggleHaptics = (next: boolean) => {
    setHapticsEnabled(next);
    if (next) {
      haptics.toggle();
    }
  };

  const handleReschedule = async () => {
    await reschedule();
    haptics.success();
  };

  const handleSyncWidgets = async () => {
    const synced = await refreshWidgets();
    if (synced) {
      haptics.success();
    } else {
      haptics.soft();
    }
  };

  const cardSurfaceStyle = {
    backgroundColor: theme.cardBg,
    borderColor: theme.cardBorder,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Réglages" }} />

      <ScrollViewMarker
        style={[styles.scrollView, styles.scrollLayer]}
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
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <ThemedText type="overline" themeColor="accent">
            Préférences & Bilan
          </ThemedText>
          {Platform.OS !== "ios" && (
            <ThemedText type="largeTitle">Réglages & Stats</ThemedText>
          )}
          <ThemedText type="caption" themeColor="textSecondary">
            Apparence, accentuation, haptique, classe GEII, rappels et matières
          </ThemedText>
        </View>

        {/* Cartes KPI mates (géométrie continue, alignement à gauche HIG iOS 26) */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, cardSurfaceStyle]}>
            <ThemedText type="overline" themeColor="textSecondary">
              Volume total
            </ThemedText>
            <ThemedText type="tabular" style={[styles.kpiValue, { color: accent.primary }]}>
              {kpis.totalHours}
            </ThemedText>
          </View>

          <View style={[styles.kpiCard, cardSurfaceStyle]}>
            <ThemedText type="overline" themeColor="textSecondary">
              À venir
            </ThemedText>
            <ThemedText type="tabular" style={[styles.kpiValue, { color: theme.menthe[500] }]}>
              {kpis.upcomingCount}
            </ThemedText>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.cardBg,
                borderColor:
                  kpis.upcomingDsCount > 0 ? corail[300] : theme.cardBorder,
              },
            ]}
          >
            <ThemedText type="overline" themeColor="textSecondary">
              DS à venir
            </ThemedText>
            <ThemedText
              type="tabular"
              style={[
                styles.kpiValue,
                {
                  color:
                    kpis.upcomingDsCount > 0 ? corail[500] : theme.textSecondary,
                },
              ]}
            >
              {kpis.upcomingDsCount}
            </ThemedText>
          </View>
        </View>

        <View style={styles.sections}>
          {/* 1. Apparence, Couleur d'accentuation, Mouvement réduit & Retours haptiques */}
          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: accent.softBg }]}>
                <SymbolView
                  name={{
                    ios: "paintbrush.fill",
                    android: "palette",
                    web: "palette",
                  }}
                  size={15}
                  tintColor={accent.primary}
                />
              </View>
              <ThemedText type="overline">Thème & Apparence</ThemedText>
            </View>
            <ThemeSwitcher embedded />

            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />

            <View style={styles.motionSection}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: accent.softBg }]}>
                  <SymbolView
                    name={{
                      ios: "drop.fill",
                      android: "palette",
                      web: "palette",
                    }}
                    size={14}
                    tintColor={accent.primary}
                  />
                </View>
                <ThemedText type="smallBold">
                  Couleur d&apos;accentuation
                </ThemedText>
              </View>
              <AccentSwitcher />
            </View>

            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />

            <View style={styles.motionSection}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: theme.violet[100] }]}>
                  <SymbolView
                    name={{
                      ios: "figure.walk.motion",
                      android: "accessibility",
                      web: "accessibility",
                    }}
                    size={14}
                    tintColor={theme.violet[500]}
                  />
                </View>
                <ThemedText type="smallBold">Mouvement réduit</ThemedText>
              </View>
              <SegmentedControl
                compact
                embedded
                options={REDUCED_MOTION_OPTIONS}
                value={motionPref}
                onChange={setMotionPref}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.iconBadge, { backgroundColor: accent.softBg }]}>
                    <SymbolView
                      name={{
                        ios: "hand.tap.fill",
                        android: "vibration",
                        web: "vibration",
                      }}
                      size={14}
                      tintColor={accent.primary}
                    />
                  </View>
                  <ThemedText type="smallBold">Retours haptiques</ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  Vibrations subtiles sur les interactions et validations
                </ThemedText>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={handleToggleHaptics}
                trackColor={{ false: theme.border, true: accent.primary }}
                thumbColor={theme.switchThumb}
              />
            </View>
          </View>

          {/* 2. Classe & Source GEII en direct */}
          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: accent.softBg }]}>
                  <SymbolView
                    name={{
                      ios: "graduationcap.fill",
                      android: "school",
                      web: "school",
                    }}
                    size={15}
                    tintColor={accent.primary}
                  />
                </View>
                <ThemedText type="overline">Classe &amp; Source GEII</ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textMuted">
                {groups.length} classes
              </ThemedText>
            </View>

            <Pressable
              onPress={() => {
                haptics.soft();
                setIsClassPickerOpen(true);
              }}
              style={[
                styles.activeClassBox,
                {
                  backgroundColor: theme.cardBgSubtle,
                  borderColor: accent.border,
                },
              ]}
            >
              <View style={styles.activeClassInfo}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Classe sélectionnée
                </ThemedText>
                <ThemedText
                  type="subtitle"
                  style={{ color: accent.primary }}
                  numberOfLines={1}
                >
                  {activeGroup.text}
                </ThemedText>
                <ThemedText
                  type="caption"
                  themeColor="textMuted"
                  numberOfLines={1}
                >
                  {activeGroup.section}
                </ThemedText>
              </View>
              <SymbolView
                name={{
                  ios: "chevron.up.chevron.down",
                  android: "unfold_more",
                  web: "unfold_more",
                }}
                size={16}
                tintColor={accent.primary}
              />
            </Pressable>

            <GlassSurfaceContainer spacing={8} style={styles.actionRow}>
              <GlassButton
                haptic="soft"
                tintColor={accent.solidBg}
                borderColor={accent.primary}
                onPress={() => setIsClassPickerOpen(true)}
                containerStyle={styles.primaryBtnContainer}
                style={styles.primaryBtn}
              >
                <SymbolView
                  name={{
                    ios: "person.2.fill",
                    android: "group",
                    web: "group",
                  }}
                  size={14}
                  tintColor={theme.textOnAccent}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.textOnAccent }}
                >
                  Changer de classe
                </ThemedText>
              </GlassButton>

              <GlassButton
                haptic="toggle"
                tintColor={theme.backgroundSelected}
                borderColor={theme.border}
                onPress={refresh}
                style={styles.secondaryBtn}
              >
                <ThemedText type="captionBold">
                  {isSyncing ? "Synchro..." : "Rafraîchir"}
                </ThemedText>
              </GlassButton>
            </GlassSurfaceContainer>

            <View
              style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
            />

            <Pressable
              onPress={() => {
                haptics.selection();
                setShowAdvancedApi((v) => !v);
              }}
              style={styles.advancedToggleRow}
            >
              <ThemedText type="caption" themeColor="textSecondary">
                Paramètre avancé · Serveur API GEII
              </ThemedText>
              <SymbolView
                name={{
                  ios: showAdvancedApi ? "chevron.up" : "chevron.down",
                  android: showAdvancedApi ? "expand_less" : "expand_more",
                  web: showAdvancedApi ? "expand_less" : "expand_more",
                }}
                size={12}
                tintColor={theme.textMuted}
              />
            </Pressable>

            {showAdvancedApi && (
              <View style={styles.advancedApiBox}>
                <ThemedText type="caption" themeColor="textMuted">
                  Utile uniquement pour un relais CORS en aperçu navigateur.
                </ThemedText>
                <TextInput
                  value={baseUrlValue}
                  onChangeText={setEditedBaseUrl}
                  placeholder={DEFAULT_API_BASE}
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.cardBgSubtle,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                />
                <GlassSurfaceContainer spacing={8} style={styles.actionRow}>
                  <GlassButton
                    haptic="soft"
                    tintColor={theme.backgroundSelected}
                    borderColor={theme.border}
                    onPress={() => {
                      const target = baseUrlValue;
                      setEditedBaseUrl(null);
                      void updateApiBaseUrl(target);
                    }}
                    containerStyle={styles.primaryBtnContainer}
                    style={styles.secondaryBtn}
                  >
                    <ThemedText type="captionBold">
                      Appliquer l&apos;URL API
                    </ThemedText>
                  </GlassButton>

                  <GlassButton
                    haptic="selection"
                    tintColor={theme.backgroundSelected}
                    borderColor={theme.border}
                    onPress={() => {
                      setEditedBaseUrl(null);
                      void updateApiBaseUrl(DEFAULT_API_BASE);
                    }}
                    style={styles.secondaryBtn}
                  >
                    <ThemedText type="captionBold">Par défaut</ThemedText>
                  </GlassButton>
                </GlassSurfaceContainer>
              </View>
            )}
          </View>

          {/* 3. Notifications & Rappels */}
          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: theme.ambre[100] }]}>
                  <SymbolView
                    name={{
                      ios: "bell.badge.fill",
                      android: "notifications",
                      web: "notifications",
                    }}
                    size={15}
                    tintColor={theme.ambre[500]}
                  />
                </View>
                <ThemedText type="overline">Notifications locales</ThemedText>
              </View>
              <ThemedText
                type="tabular"
                style={[styles.notifCounter, { color: accent.text }]}
              >
                {scheduledCount}/{MAX_IOS_NOTIFICATIONS}
              </ThemedText>
            </View>

            {permissionGranted === false && (
              <Pressable
                onPress={() => {
                  haptics.soft();
                  requestPermission();
                }}
                style={[
                  styles.permBanner,
                  { backgroundColor: ambre[100], borderColor: ambre[500] },
                ]}
              >
                <ThemedText
                  type="captionBold"
                  style={{ color: ambre[700] }}
                >
                  Notifications désactivées dans iOS — Touchez pour autoriser
                </ThemedText>
              </Pressable>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <ThemedText type="smallBold">Rappels avant les cours</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Reprogrammés à chaque synchronisation
                </ThemedText>
              </View>
              <Switch
                value={notifSettings.enabled}
                onValueChange={(v) => {
                  haptics.toggle();
                  updateNotifSettings({ enabled: v });
                }}
                trackColor={{ false: theme.border, true: accent.primary }}
                thumbColor={theme.switchThumb}
              />
            </View>

            {notifSettings.enabled && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                <View style={styles.chipsRow}>
                  {LEAD_TIMES.map((mins) => {
                    const selected = notifSettings.leadTimeMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => {
                          haptics.selection();
                          updateNotifSettings({ leadTimeMinutes: mins });
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? accent.softBg
                              : theme.cardBgSubtle,
                            borderColor: selected
                              ? accent.primary
                              : theme.cardBorder,
                          },
                        ]}
                      >
                        <ThemedText
                          type="captionBold"
                          style={{
                            color: selected
                              ? accent.text
                              : theme.textSecondary,
                          }}
                        >
                          {mins} min avant
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <ThemedText type="smallBold">
                      Résumé du matin (07h30)
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Uniquement les jours où vous avez cours
                    </ThemedText>
                  </View>
                  <Switch
                    value={notifSettings.morningBriefingEnabled}
                    onValueChange={(v) => {
                      haptics.toggle();
                      updateNotifSettings({ morningBriefingEnabled: v });
                    }}
                    trackColor={{ false: theme.border, true: accent.primary }}
                    thumbColor={theme.switchThumb}
                  />
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <ThemedText type="smallBold">
                      Alerte veille de DS (20h00)
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Rappel spécial la veille d&apos;une évaluation
                    </ThemedText>
                  </View>
                  <Switch
                    value={notifSettings.dsSpecialAlert}
                    onValueChange={(v) => {
                      haptics.toggle();
                      updateNotifSettings({ dsSpecialAlert: v });
                    }}
                    trackColor={{ false: theme.border, true: accent.primary }}
                    thumbColor={theme.switchThumb}
                  />
                </View>

                <GlassButton
                  haptic="none"
                  tintColor={theme.backgroundSelected}
                  borderColor={theme.border}
                  onPress={handleReschedule}
                  style={styles.secondaryBtn}
                >
                  <ThemedText type="captionBold">
                    Reprogrammer les notifications maintenant
                  </ThemedText>
                </GlassButton>
              </>
            )}
          </View>

          {/* 4. Widgets iOS natifs */}
          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: accent.softBg }]}>
                  <SymbolView
                    name={{
                      ios: "widget.small",
                      android: "widgets",
                      web: "widgets",
                    }}
                    size={15}
                    tintColor={accent.primary}
                  />
                </View>
                <ThemedText type="overline">Widgets iOS</ThemedText>
              </View>

              <View
                style={[
                  styles.widgetStatusPill,
                  {
                    backgroundColor: widgetsReady
                      ? theme.menthe[100]
                      : theme.ambre[100],
                  },
                ]}
              >
                <ThemedText
                  type="captionBold"
                  style={{
                    color: widgetsReady ? theme.menthe[700] : theme.ambre[700],
                  }}
                >
                  {widgetsReady ? "Actif" : "Development build"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.widgetList}>
              {WIDGET_SUMMARY_ITEMS.map((item) => (
                <View
                  key={item.name}
                  style={[
                    styles.widgetItem,
                    {
                      backgroundColor: theme.cardBgSubtle,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <ThemedText type="smallBold">{item.title}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {item.subtitle}
                  </ThemedText>
                </View>
              ))}
            </View>

            <GlassButton
              haptic="none"
              tintColor={theme.backgroundSelected}
              borderColor={theme.border}
              onPress={handleSyncWidgets}
              style={styles.secondaryBtn}
            >
              <ThemedText type="captionBold">
                Synchroniser les widgets
              </ThemedText>
            </GlassButton>

            {widgetStatus.lastSyncAt !== null && (
              <ThemedText type="caption" themeColor="textSecondary">
                Dernière synchronisation widget :{" "}
                {formatTime(widgetStatus.lastSyncAt)} ·{" "}
                {widgetStatus.entryCount} entrées
                {widgetStatus.appGroupAccessible === true
                  ? " · App Group OK"
                  : ""}
              </ThemedText>
            )}

            {widgetStatus.lastError !== null && (
              <View
                style={[
                  styles.permBanner,
                  {
                    backgroundColor: corail[100],
                    borderColor: corail[500],
                  },
                ]}
              >
                <ThemedText
                  type="captionBold"
                  style={{ color: corail[700] }}
                >
                  Erreur widget : {widgetStatus.lastError}
                </ThemedText>
              </View>
            )}

            <ThemedText type="caption" themeColor="textMuted">
              {widgetsReady
                ? "Après une mise à jour de l'app, recompilez l'IPA depuis GitHub Actions puis réinstallez-le avec votre outil de signature en conservant l'App Group partagé."
                : "Les widgets natifs fonctionnent hors ligne depuis le cache local GEII et nécessitent un build iOS natif (non inclus dans Expo Go)."}
            </ThemedText>
          </View>

          {/* 5. Dictionnaire éditable des matières */}
          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.cardHeaderBetween}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: theme.violet[100] }]}>
                  <SymbolView
                    name={{
                      ios: "character.book.closed.fill",
                      android: "menu_book",
                      web: "menu_book",
                    }}
                    size={15}
                    tintColor={theme.violet[500]}
                  />
                </View>
                <ThemedText type="overline">Dictionnaire des matières</ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  haptics.warning();
                  resetSubjectDictionary();
                }}
              >
                <ThemedText type="captionBold" style={{ color: corail[700] }}>
                  Par défaut
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.dictFormRow}>
              <TextInput
                value={newCode}
                onChangeText={setNewCode}
                placeholder="Code (ex. AN)"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
                style={[
                  styles.codeInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.cardBgSubtle,
                    borderColor: theme.cardBorder,
                  },
                ]}
              />
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nom lisible (ex. Anglais)"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.nameInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.cardBgSubtle,
                    borderColor: theme.cardBorder,
                  },
                ]}
              />
              <GlassButton
                haptic="none"
                tintColor={accent.solidBg}
                borderColor={accent.primary}
                onPress={handleAddSubjectMapping}
                style={styles.addBtn}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  size={15}
                  weight="bold"
                  tintColor={theme.textOnAccent}
                />
              </GlassButton>
            </View>

            <View style={styles.chipsRow}>
              {Object.entries(subjectDict).map(([code, name]) => (
                <Pressable
                  key={code}
                  onPress={() => {
                    haptics.warning();
                    setSubjectCustomName(code, "");
                  }}
                  style={[
                    styles.dictPill,
                    {
                      backgroundColor: theme.cardBgSubtle,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <ThemedText type="captionBold">
                    {code}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    → {name}
                  </ThemedText>
                  <SymbolView
                    name={{ ios: "xmark", android: "close", web: "close" }}
                    size={9}
                    tintColor={theme.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* 6. Volume horaire par matière */}
          {subjectStats.length > 0 && (
            <View style={[styles.card, cardSurfaceStyle]}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: theme.menthe[100] }]}>
                  <SymbolView
                    name={{
                      ios: "chart.bar.fill",
                      android: "bar_chart",
                      web: "bar_chart",
                    }}
                    size={15}
                    tintColor={theme.menthe[500]}
                  />
                </View>
                <ThemedText type="overline">
                  Volume horaire par matière ({courses.length} cours)
                </ThemedText>
              </View>

              <View style={styles.statsList}>
                {subjectStats.slice(0, 12).map((item) => {
                  const tokens = getCourseColorTokens(item.subject, null, theme);
                  const label = subjectDict[item.subject]
                    ? `${subjectDict[item.subject]} (${item.subject})`
                    : item.subject;
                  const pct = Math.max(
                    6,
                    Math.round((item.hours / maxSubjectHours) * 100)
                  );
                  return (
                    <View key={item.subject} style={styles.statRow}>
                      <View style={styles.statHeader}>
                        <ThemedText type="captionBold">
                          {label}
                        </ThemedText>
                        <ThemedText
                          type="tabular"
                          style={[
                            styles.statHours,
                            { color: tokens.textColor },
                          ]}
                        >
                          {item.hours}h
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.statTrack,
                          { backgroundColor: theme.surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            styles.statBar,
                            {
                              width: `${pct}%`,
                              backgroundColor: tokens.accentColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        </ScrollView>
      </ScrollViewMarker>

      <AmbientBackground />

      <ClassPickerModal
        visible={isClassPickerOpen}
        onClose={() => setIsClassPickerOpen(false)}
        groups={groups}
        activeGroupId={activeGroup.id}
        onSelectGroup={(groupId) => {
          void selectGroup(groupId);
        }}
      />
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
  scrollLayer: {
    zIndex: 1,
  },
  content: {
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    gap: 2,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two + 5,
    paddingHorizontal: Spacing.three - 2,
    alignItems: "flex-start",
    gap: 4,
  },
  kpiValue: {
    fontFamily: FontFamilies.displayBold,
    fontSize: 22,
    lineHeight: 26,
  },
  sections: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two + 4,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  motionSection: {
    gap: Spacing.two,
  },
  activeClassBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  activeClassInfo: {
    flex: 1,
    gap: 2,
  },
  advancedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  advancedApiBox: {
    gap: Spacing.two,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    fontFamily: FontFamilies.bodyMedium,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: 10,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  primaryBtnContainer: {
    flex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  notifCounter: {
    fontSize: 12,
  },
  permBanner: {
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  switchInfo: {
    flex: 1,
    gap: 2,
  },
  dictFormRow: {
    flexDirection: "row",
    gap: 6,
  },
  codeInput: {
    width: 92,
    fontFamily: FontFamilies.monoMedium,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  nameInput: {
    flex: 1,
    fontFamily: FontFamilies.bodyMedium,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  dictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  widgetStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  widgetList: {
    gap: 6,
  },
  widgetItem: {
    gap: 2,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsList: {
    gap: 8,
  },
  statRow: {
    gap: 4,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statHours: {
    fontSize: 12,
  },
  statTrack: {
    height: 6,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  statBar: {
    height: "100%",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
});
