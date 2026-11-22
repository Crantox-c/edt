import React, { useState, useSyncExternalStore } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { GlassSurface } from "@/components/ui/glass-surface";
import { PressableScale } from "@/components/ui/pressable-scale";
import {
  FontFamilies,
  Radius,
  Spacing,
  getCourseColorTokens,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import {
  extractFloor,
  formatDayHeader,
  formatDuration,
  formatTimeRange,
  getParisDateString,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course } from "@/lib/ics";
import {
  getCourseNotesSnapshot,
  saveCourseNote,
  subscribeCourseNotes,
} from "@/lib/notes";
import {
  getSubjectDictionarySnapshot,
  resolveSubjectReadableName,
  subscribeSubjectDictionary,
} from "@/lib/subject-names";

export type CourseDetailModalProps = {
  course: Course | null;
  visible: boolean;
  onClose: () => void;
  onFilterBySubject?: (subject: string) => void;
  onHideSubject?: (subject: string) => void;
};

type CourseDetailContentProps = {
  course: Course;
  onClose: () => void;
  onFilterBySubject?: (subject: string) => void;
  onHideSubject?: (subject: string) => void;
};

function CourseDetailContent({
  course,
  onClose,
  onFilterBySubject,
  onHideSubject,
}: CourseDetailContentProps) {
  const theme = useTheme();
  const nowMs = useCurrentTime();
  const subjectDict = useSyncExternalStore(
    subscribeSubjectDictionary,
    getSubjectDictionarySnapshot,
    getSubjectDictionarySnapshot
  );
  const notesMap = useSyncExternalStore(
    subscribeCourseNotes,
    getCourseNotesSnapshot,
    getCourseNotesSnapshot
  );

  const savedNote = notesMap[course.key] ?? "";
  const [noteInput, setNoteInput] = useState(savedNote);

  const dateStr = getParisDateString(course.start);
  const dayName = formatDayHeader(dateStr);
  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";
  const floorLabel = extractFloor(course.room);

  const readableName = resolveSubjectReadableName(course.subject, subjectDict);
  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const isDS =
    course.kind === "DS" || course.title.toUpperCase().includes("_DS");

  const isCurrent = nowMs >= course.start && nowMs < course.end;
  const isPast = nowMs >= course.end;
  const statusInfo = isCurrent
    ? { label: "En cours", scale: theme.menthe }
    : isPast
      ? { label: "Terminé", scale: null }
      : { label: "À venir", scale: theme.accentScale };

  const isSaved = noteInput.trim().length > 0 && noteInput.trim() === savedNote;

  const handleClose = () => {
    const trimmed = noteInput.trim();
    if (trimmed !== savedNote) {
      haptics.success();
      saveCourseNote(course.key, noteInput);
    } else {
      haptics.tap();
    }
    onClose();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <AmbientBackground />

      {/* Barre de poignée + fermeture */}
      <View style={styles.sheetHeader}>
        <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
        <View style={styles.headerTopRow}>
          <ThemedText type="overline" themeColor="textSecondary">
            Détail du cours
          </ThemedText>
          <Pressable
            onPress={handleClose}
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Carte d'en-tête du cours (surface mate nette) */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: tokens.borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.heroAccentStrip,
              { backgroundColor: tokens.accentColor },
            ]}
          />

          <View style={styles.heroBody}>
            <View style={styles.heroBadges}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: statusInfo.scale
                      ? statusInfo.scale[100]
                      : theme.surfaceMuted,
                  },
                ]}
              >
                <ThemedText
                  type="captionBold"
                  style={{
                    color: statusInfo.scale
                      ? statusInfo.scale[700]
                      : theme.textSecondary,
                  }}
                >
                  {statusInfo.label}
                </ThemedText>
              </View>

              {(course.kind || isDS) && (
                <View
                  style={[styles.badge, { backgroundColor: tokens.badgeBg }]}
                >
                  <ThemedText
                    type="captionBold"
                    style={{ color: tokens.textColor }}
                  >
                    {isDS ? "DS" : course.kind}
                  </ThemedText>
                </View>
              )}

              {course.promo && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.surfaceMuted },
                  ]}
                >
                  <ThemedText type="captionBold" themeColor="textSecondary">
                    {course.promo}
                  </ThemedText>
                </View>
              )}
            </View>

            <ThemedText type="subtitle">
              {readableName
                ? `${readableName} (${course.subject})`
                : course.title}
            </ThemedText>

            <View
              style={[
                styles.rawCodePill,
                { backgroundColor: theme.surfaceMuted },
              ]}
            >
              <ThemedText type="code" themeColor="textSecondary">
                ICS : {course.title}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Informations détaillées */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <SymbolView
                name={{ ios: "calendar", android: "event", web: "event" }}
                size={15}
                tintColor={tokens.accentColor}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Date
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{dayName}</ThemedText>
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
          />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <SymbolView
                name={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                size={15}
                tintColor={tokens.accentColor}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Horaires
              </ThemedText>
            </View>
            <ThemedText type="tabular" style={{ color: tokens.textColor }}>
              {timeRange} ({duration})
            </ThemedText>
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
          />

          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <SymbolView
                name={{
                  ios: "mappin.and.ellipse",
                  android: "place",
                  web: "place",
                }}
                size={15}
                tintColor={tokens.accentColor}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Salle
              </ThemedText>
            </View>
            <ThemedText
              type="smallBold"
              themeColor={course.room ? "text" : "textMuted"}
            >
              {roomText}
              {floorLabel ? ` • ${floorLabel}` : ""}
            </ThemedText>
          </View>

          {course.tags.length > 0 && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.borderSubtle },
                ]}
              />
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <SymbolView
                    name={{ ios: "tag.fill", android: "label", web: "label" }}
                    size={15}
                    tintColor={tokens.accentColor}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    Sous-groupes / Tags
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">
                  {course.tags.join(", ")}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {/* Actions rapides matière */}
        {(onFilterBySubject || onHideSubject) && (
          <View style={styles.quickActionsRow}>
            {onFilterBySubject && (
              <PressableScale
                haptic="soft"
                onPress={() => {
                  saveCourseNote(course.key, noteInput);
                  onFilterBySubject(course.subject);
                  onClose();
                }}
                style={[
                  styles.quickActionPill,
                  {
                    backgroundColor: theme.accentTiers.softBg,
                    borderColor: theme.accentTiers.border,
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "line.3.horizontal.decrease.circle.fill",
                    android: "filter_alt",
                    web: "filter_alt",
                  }}
                  size={14}
                  tintColor={theme.accentTiers.text}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.accentTiers.text }}
                >
                  Filtrer {course.subject}
                </ThemedText>
              </PressableScale>
            )}

            {onHideSubject && (
              <PressableScale
                haptic="none"
                onPress={() => {
                  haptics.warning();
                  saveCourseNote(course.key, noteInput);
                  onHideSubject(course.subject);
                  onClose();
                }}
                style={[
                  styles.quickActionPill,
                  {
                    backgroundColor: theme.corail[100],
                    borderColor: theme.corail[300],
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "eye.slash.fill",
                    android: "visibility_off",
                    web: "visibility_off",
                  }}
                  size={14}
                  tintColor={theme.corail[700]}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.corail[700] }}
                >
                  Masquer {course.subject}
                </ThemedText>
              </PressableScale>
            )}
          </View>
        )}

        {/* Note personnelle par cours */}
        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.noteHeaderRow}>
            <View style={styles.infoLabelRow}>
              <SymbolView
                name={{
                  ios: "note.text",
                  android: "edit_note",
                  web: "edit_note",
                }}
                size={15}
                tintColor={theme.violet[500]}
              />
              <ThemedText type="smallBold">Note personnelle</ThemedText>
            </View>

            {isSaved && (
              <View style={styles.savedRow}>
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  size={12}
                  tintColor={theme.menthe[500]}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.menthe[700] }}
                >
                  Sauvegardé
                </ThemedText>
              </View>
            )}
          </View>

          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            onBlur={() => saveCourseNote(course.key, noteInput)}
            placeholder="Ajouter un mémo (ex. apporter blouse, devoir à rendre...)"
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.noteInput,
              {
                color: theme.text,
                backgroundColor: theme.cardBgSubtle,
                borderColor: theme.cardBorder,
              },
            ]}
          />
        </View>

        <PressableScale
          haptic="none"
          onPress={handleClose}
          style={[
            styles.doneButton,
            { backgroundColor: theme.accentTiers.solidBg },
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.textOnAccent }}>
            Enregistrer et fermer
          </ThemedText>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

export function CourseDetailModal({
  course,
  visible,
  onClose,
  onFilterBySubject,
  onHideSubject,
}: CourseDetailModalProps) {
  if (!course) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={onClose}
    >
      <CourseDetailContent
        key={course.key}
        course={course}
        onClose={onClose}
        onFilterBySubject={onFilterBySubject}
        onHideSubject={onHideSubject}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetHeader: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
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
  heroCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  heroAccentStrip: {
    height: 4,
    width: "100%",
  },
  heroBody: {
    padding: Spacing.three,
    gap: Spacing.one + 2,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
  },
  rawCodePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderCurve: "continuous",
    marginTop: 2,
  },
  infoCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteCard: {
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  noteHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  noteInput: {
    minHeight: 84,
    fontFamily: FontFamilies.bodyMedium,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two + 4,
    fontSize: 14,
    textAlignVertical: "top",
  },
  doneButton: {
    paddingVertical: Spacing.two + 5,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
