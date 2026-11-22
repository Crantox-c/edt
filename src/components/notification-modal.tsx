import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { GlassSurface } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";
import { MAX_IOS_NOTIFICATIONS, NotificationSettings } from "@/lib/notifications";

export type NotificationModalProps = {
  visible: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  permissionGranted: boolean | null;
  scheduledCount: number;
  onUpdateSettings: (updater: Partial<NotificationSettings>) => void;
  onRequestPermission: () => Promise<boolean>;
  onReschedule: () => Promise<number>;
};

const LEAD_TIMES = [5, 10, 15, 30];

export function NotificationModal({
  visible,
  onClose,
  settings,
  permissionGranted,
  scheduledCount,
  onUpdateSettings,
  onRequestPermission,
  onReschedule,
}: NotificationModalProps) {
  const theme = useTheme();
  const accent = theme.accentTiers;
  const ambre = theme.ambre;

  const handleReschedule = async () => {
    await onReschedule();
    haptics.success();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <AmbientBackground />

        {/* En-tête feuille iOS 26 */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          <View style={styles.headerTopRow}>
            <ThemedText type="subtitle">Notifications & Rappels</ThemedText>

            <Pressable
              onPress={() => {
                haptics.tap();
                onClose();
              }}
              hitSlop={6}
              accessibilityLabel="Fermer"
            >
              <GlassSurface
                glassEffectStyle="regular"
                isInteractive={true}
                style={styles.closeCircle}
                fallbackStyle={{
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                }}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={17}
                  weight="semibold"
                  tintColor={theme.text}
                />
              </GlassSurface>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Bannière de permission si non accordée */}
          {permissionGranted === false && (
            <View
              style={[
                styles.permBanner,
                { borderColor: ambre[500], backgroundColor: ambre[50] },
              ]}
            >
              <ThemedText type="smallBold" style={{ color: ambre[700] }}>
                Notifications non autorisées
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Activez les notifications pour recevoir les rappels avant vos
                cours.
              </ThemedText>
              <PressableScale
                haptic="soft"
                onPress={onRequestPermission}
                style={[styles.permBtn, { backgroundColor: ambre[500] }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.textOnAccent }}
                >
                  Autoriser les notifications
                </ThemedText>
              </PressableScale>
            </View>
          )}

          {/* Carte Inset Grouped des réglages */}
          <View
            style={[
              styles.groupCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            {/* 1. Activation générale */}
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <ThemedText type="smallBold">Activer les rappels</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Programmation locale automatique après chaque synchro
                </ThemedText>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(val) => {
                  haptics.toggle();
                  onUpdateSettings({ enabled: val });
                }}
                trackColor={{ false: theme.border, true: accent.primary }}
                thumbColor={theme.switchThumb}
              />
            </View>

            {settings.enabled && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                {/* 2. Délai avant le cours */}
                <View style={styles.section}>
                  <ThemedText type="overline" themeColor="textSecondary">
                    Délai du rappel avant cours
                  </ThemedText>
                  <View style={styles.chipsRow}>
                    {LEAD_TIMES.map((mins) => {
                      const isSelected = settings.leadTimeMinutes === mins;
                      return (
                        <Pressable
                          key={mins}
                          onPress={() => {
                            haptics.selection();
                            onUpdateSettings({ leadTimeMinutes: mins });
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? accent.softBg
                                : theme.cardBgSubtle,
                              borderColor: isSelected
                                ? accent.primary
                                : theme.cardBorder,
                            },
                          ]}
                        >
                          <ThemedText
                            type={isSelected ? "smallBold" : "small"}
                            style={{
                              color: isSelected
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
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                {/* 3. Résumé du matin */}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <ThemedText type="smallBold">Résumé du matin</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Notification à 07h30 les jours où vous avez cours
                    </ThemedText>
                  </View>
                  <Switch
                    value={settings.morningBriefingEnabled}
                    onValueChange={(val) => {
                      haptics.toggle();
                      onUpdateSettings({ morningBriefingEnabled: val });
                    }}
                    trackColor={{ false: theme.border, true: accent.primary }}
                    thumbColor={theme.switchThumb}
                  />
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
                />

                {/* 4. Alerte spéciale veille de DS */}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <ThemedText type="smallBold">Alerte veille de DS</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Rappel la veille à 20h00 pour chaque devoir surveillé
                    </ThemedText>
                  </View>
                  <Switch
                    value={settings.dsSpecialAlert}
                    onValueChange={(val) => {
                      haptics.toggle();
                      onUpdateSettings({ dsSpecialAlert: val });
                    }}
                    trackColor={{ false: theme.border, true: accent.primary }}
                    thumbColor={theme.switchThumb}
                  />
                </View>
              </>
            )}
          </View>

          {settings.enabled && (
            /* 5. Statut système & Limite iOS 64 */
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <View style={styles.statusHeader}>
                <ThemedText type="overline" themeColor="textSecondary">
                  Statut du planificateur
                </ThemedText>
                <ThemedText type="tabular" style={{ color: accent.primary }}>
                  {scheduledCount} / {MAX_IOS_NOTIFICATIONS} en attente
                </ThemedText>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                Conforme à la limite stricte d&apos;iOS de 64 notifications
                locales. Les notifications couvrent les prochains jours et sont
                renouvelées à chaque synchro.
              </ThemedText>

              <PressableScale
                haptic="none"
                onPress={handleReschedule}
                style={[
                  styles.rescheduleBtn,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="smallBold">
                  Reprogrammer maintenant
                </ThemedText>
              </PressableScale>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
    alignSelf: "center",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  permBanner: {
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one + 2,
  },
  permBtn: {
    alignSelf: "flex-start",
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  groupCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two + 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  rowInfo: {
    flex: 1,
    marginRight: Spacing.two,
    gap: 2,
  },
  section: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rescheduleBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two + 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    marginTop: Spacing.one,
  },
});
