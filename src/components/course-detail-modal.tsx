import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing, getCourseColorTokens } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDayHeader, formatDuration, formatTimeRange, getParisDateString } from "@/lib/dates";
import { Course } from "@/lib/ics";

export type CourseDetailModalProps = {
  course: Course | null;
  visible: boolean;
  onClose: () => void;
};

export function CourseDetailModal({
  course,
  visible,
  onClose,
}: CourseDetailModalProps) {
  const theme = useTheme();

  if (!course) return null;

  const dateStr = getParisDateString(course.start);
  const dayName = formatDayHeader(dateStr);
  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";

  const tokens = getCourseColorTokens(course.subject, course.kind, theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: tokens.borderColor,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              DÉTAIL DU COURS
            </ThemedText>
            {course.kind && (
              <View style={[styles.badge, { backgroundColor: tokens.badgeBg }]}>
                <ThemedText type="smallBold" style={{ color: tokens.textColor }}>
                  {course.kind}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText type="default" style={styles.title}>
            {course.title}
          </ThemedText>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Date
            </ThemedText>
            <ThemedText type="smallBold" style={styles.value}>
              {dayName}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Horaires
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={[styles.value, { color: tokens.textColor }]}
            >
              {timeRange} ({duration})
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Salle
            </ThemedText>
            <ThemedText type="smallBold" style={styles.value}>
              {roomText}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Matière
            </ThemedText>
            <ThemedText type="smallBold" style={[styles.value, { color: tokens.textColor }]}>
              {course.subject}
            </ThemedText>
          </View>

          {course.promo && (
            <View style={styles.infoRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Groupe / Promo
              </ThemedText>
              <ThemedText type="small" style={styles.value}>
                {course.promo}
              </ThemedText>
            </View>
          )}

          {course.tags.length > 0 && (
            <View style={styles.infoRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Sous-groupes / Tags
              </ThemedText>
              <ThemedText type="small" style={styles.value}>
                {course.tags.join(", ")}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.closeButton, { backgroundColor: theme.backgroundSelected }]}
            onPress={onClose}
          >
            <ThemedText type="smallBold">Fermer</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    marginTop: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 2,
    textAlign: "right",
  },
  closeButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
});
