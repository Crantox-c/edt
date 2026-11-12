import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MAX_IOS_NOTIFICATIONS, NotificationSettings } from "@/lib/notifications";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

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
  const glacier = theme.glacier;
  const ambre = theme.ambre;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Notifications & Rappels
            </ThemedText>

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="smallBold">Fermer</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Bannière de permission si non accordée */}
            {permissionGranted === false && (
              <ThemedView
                type="backgroundElement"
                style={[styles.permBanner, { borderColor: ambre[500], backgroundColor: ambre[50] }]}
              >
                <ThemedText type="smallBold" style={{ color: ambre[700] }}>
                  ⚠️ Notifications non autorisées
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Activez les notifications pour recevoir les rappels avant vos cours.
                </ThemedText>
                <Pressable
                  onPress={onRequestPermission}
                  style={[styles.permBtn, { backgroundColor: ambre[500] }]}
                >
                  <ThemedText type="smallBold" style={{ color: "#FFFFFF" }}>
                    Autoriser les notifications
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}

            {/* 1. Activation générale */}
            <View style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={styles.rowInfo}>
                <ThemedText type="default">Activer les rappels</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Programmation locale automatique après chaque synchronisation
                </ThemedText>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(val) => onUpdateSettings({ enabled: val })}
                trackColor={{ false: theme.border, true: glacier[500] }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.enabled && (
              <>
                {/* 2. Délai avant le cours */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    DÉLAI DU RAPPEL AVANT COURS
                  </ThemedText>
                  <View style={styles.chipsRow}>
                    {LEAD_TIMES.map((mins) => {
                      const isSelected = settings.leadTimeMinutes === mins;
                      return (
                        <Pressable
                          key={mins}
                          onPress={() => onUpdateSettings({ leadTimeMinutes: mins })}
                          style={[
                            styles.chip,
                            { backgroundColor: theme.backgroundElement },
                            isSelected && {
                              backgroundColor: glacier[100],
                              borderColor: glacier[500],
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={isSelected ? { color: glacier[700], fontWeight: "700" } : undefined}
                          >
                            {mins} min avant
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Résumé du matin */}
                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <View style={styles.rowInfo}>
                    <ThemedText type="default">Résumé du matin</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Notification à 07h30 les jours où vous avez cours
                    </ThemedText>
                  </View>
                  <Switch
                    value={settings.morningBriefingEnabled}
                    onValueChange={(val) =>
                      onUpdateSettings({ morningBriefingEnabled: val })
                    }
                    trackColor={{ false: theme.border, true: glacier[500] }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* 4. Alerte spéciale veille de DS */}
                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <View style={styles.rowInfo}>
                    <ThemedText type="default">Alerte veille de DS</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Rappel la veille à 20h00 pour chaque devoir surveillé
                    </ThemedText>
                  </View>
                  <Switch
                    value={settings.dsSpecialAlert}
                    onValueChange={(val) =>
                      onUpdateSettings({ dsSpecialAlert: val })
                    }
                    trackColor={{ false: theme.border, true: glacier[500] }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* 5. Statut système & Limite iOS 64 */}
                <ThemedView
                  type="backgroundElement"
                  style={[styles.statusCard, { borderColor: theme.border }]}
                >
                  <View style={styles.statusHeader}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      STATUT DU PLANIFICATEUR
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: glacier[500] }}>
                      {scheduledCount} / {MAX_IOS_NOTIFICATIONS} en attente
                    </ThemedText>
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    Conforme à la limite stricte d&apos;iOS de 64 notifications locales.
                    Les notifications couvrent les prochains jours et sont renouvelées à chaque synchro.
                  </ThemedText>

                  <Pressable
                    onPress={onReschedule}
                    style={[styles.rescheduleBtn, { backgroundColor: theme.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold">
                      🔄 Reprogrammer maintenant
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  permBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.one,
  },
  permBtn: {
    alignSelf: "flex-start",
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInfo: {
    flex: 1,
    marginRight: Spacing.two,
    gap: 2,
  },
  section: {
    gap: Spacing.two,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one * 1.5,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rescheduleBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
});
