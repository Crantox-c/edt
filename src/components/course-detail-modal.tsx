import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { GlassButton } from "@/components/ui/glass-button";
import {
  GlassSurface,
  GlassSurfaceContainer,
} from "@/components/ui/glass-surface";
import {
  FontFamilies,
  Radius,
  Spacing,
  getCourseColorTokens,
} from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import {
  extractFloor,
  formatDayHeader,
  formatDuration,
  formatTimeRange,
  getParisDateString,
} from "@/lib/dates";
import { haptics } from "@/lib/haptics";
import { Course, isCourseDS } from "@/lib/geii-api";
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
  onRegisterCloseHandler: (fn: () => void) => void;
  onFilterBySubject?: (subject: string) => void;
  onHideSubject?: (subject: string) => void;
};

function CourseDetailContent({
  course,
  onClose,
  onRegisterCloseHandler,
  onFilterBySubject,
  onHideSubject,
}: CourseDetailContentProps) {
  const theme = useTheme();
  const nowMs = useCurrentTime();
  const { liveActivity } = useSchedule();
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

  const noteInputRef = useRef(noteInput);
  const savedNoteRef = useRef(savedNote);
  const dirtyRef = useRef(false);
  const savedOnCloseRef = useRef(false);

  useEffect(() => {
    noteInputRef.current = noteInput;
  }, [noteInput]);

  useEffect(() => {
    savedNoteRef.current = savedNote;
    if (!dirtyRef.current) {
      setNoteInput(savedNote);
    }
  }, [savedNote]);

  const dateStr = getParisDateString(course.start);
  const dayName = formatDayHeader(dateStr);
  const timeRange = formatTimeRange(course.start, course.end);
  const duration = formatDuration(course.start, course.end);
  const roomText = course.room ?? "salle non communiquée";
  const floorLabel = extractFloor(course.room);

  const readableName = resolveSubjectReadableName(course.subject, subjectDict);
  const tokens = getCourseColorTokens(course.subject, course.kind, theme);
  const isDS = isCourseDS(course);

  const isCurrent = nowMs >= course.start && nowMs < course.end;
  const isPast = nowMs >= course.end;
  const statusInfo = isCurrent
    ? { label: "En cours", scale: theme.menthe }
    : isPast
      ? { label: "Terminé", scale: null }
      : { label: "À venir", scale: theme.accentScale };

  const isSaved = noteInput.trim().length > 0 && noteInput.trim() === savedNote;

  const flushNote = useCallback(
    (withHaptic: boolean): boolean => {
      if (savedOnCloseRef.current) return false;
      const current = noteInputRef.current;
      if (current.trim() !== savedNoteRef.current) {
        savedOnCloseRef.current = true;
        dirtyRef.current = false;
        if (withHaptic) {
          haptics.success();
        }
        void saveCourseNote(course.key, current);
        return true;
      }
      return false;
    },
    [course.key]
  );

  const handleClose = useCallback(() => {
    const didSave = flushNote(true);
    if (!didSave) {
      haptics.tap();
    }
    onClose();
  }, [flushNote, onClose]);

  useEffect(() => {
    onRegisterCloseHandler(handleClose);
  }, [onRegisterCloseHandler, handleClose]);

  useEffect(() => {
    return () => {
      flushNote(false);
    };
  }, [flushNote]);

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
        showsVerticalScrollIndicator={false}
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
                Code : {course.title}
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

          {course.teacher && (
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
                    name={{
                      ios: "person.fill",
                      android: "person",
                      web: "person",
                    }}
                    size={15}
                    tintColor={tokens.accentColor}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    Enseignant
                  </ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  style={styles.infoValueRight}
                  numberOfLines={2}
                >
                  {course.teacher}
                </ThemedText>
              </View>
            </>
          )}

          {course.extraLines.length > 0 && (
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
                    name={{
                      ios: "info.circle.fill",
                      android: "info",
                      web: "info",
                    }}
                    size={15}
                    tintColor={tokens.accentColor}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    Informations
                  </ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  style={styles.infoValueRight}
                  numberOfLines={2}
                >
                  {course.extraLines.join(" • ")}
                </ThemedText>
              </View>
            </>
          )}

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

        {/* Suivi en direct (Live Activity / Dynamic Island) */}
        {!isPast && liveActivity.available && liveActivity.settings.enabled && (
          <GlassButton
            haptic="none"
            tintColor={
              liveActivity.status.isActive &&
              liveActivity.status.courseKey === course.key
                ? theme.corail[600]
                : theme.accentTiers.softBg
            }
            borderColor={
              liveActivity.status.isActive &&
              liveActivity.status.courseKey === course.key
                ? theme.corail[500]
                : theme.accentTiers.border
            }
            onPress={() => {
              if (
                liveActivity.status.isActive &&
                liveActivity.status.courseKey === course.key
              ) {
                haptics.selection();
                void liveActivity.stop();
              } else {
                haptics.success();
                void liveActivity.startForCourse(course);
              }
            }}
            style={styles.quickActionPill}
          >
            <SymbolView
              name={{
                ios:
                  liveActivity.status.isActive &&
                  liveActivity.status.courseKey === course.key
                    ? "stop.circle.fill"
                    : "sparkles.rectangle.stack.fill",
                android:
                  liveActivity.status.isActive &&
                  liveActivity.status.courseKey === course.key
                    ? "stop_circle"
                    : "notifications_active",
                web:
                  liveActivity.status.isActive &&
                  liveActivity.status.courseKey === course.key
                    ? "stop_circle"
                    : "notifications_active",
              }}
              size={15}
              tintColor={
                liveActivity.status.isActive &&
                liveActivity.status.courseKey === course.key
                  ? theme.textOnAccent
                  : theme.accentTiers.primary
              }
            />
            <ThemedText
              type="captionBold"
              style={{
                color:
                  liveActivity.status.isActive &&
                  liveActivity.status.courseKey === course.key
                    ? theme.textOnAccent
                    : theme.accentTiers.text,
              }}
            >
              {liveActivity.status.isActive &&
              liveActivity.status.courseKey === course.key
                ? "Arrêter la Live Activity"
                : "Suivre sur la Dynamic Island"}
            </ThemedText>
          </GlassButton>
        )}

        {/* Actions rapides matière */}
        {(onFilterBySubject || onHideSubject) && (
          <GlassSurfaceContainer spacing={8} style={styles.quickActionsRow}>
            {onFilterBySubject && (
              <GlassButton
                haptic="soft"
                tintColor={theme.accentTiers.solidBg}
                borderColor={theme.accentTiers.primary}
                onPress={() => {
                  saveCourseNote(course.key, noteInput);
                  onFilterBySubject(course.subject);
                  onClose();
                }}
                containerStyle={styles.quickActionContainer}
                style={styles.quickActionPill}
              >
                <SymbolView
                  name={{
                    ios: "line.3.horizontal.decrease.circle.fill",
                    android: "filter_alt",
                    web: "filter_alt",
                  }}
                  size={14}
                  tintColor={theme.textOnAccent}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.textOnAccent }}
                >
                  Filtrer {course.subject}
                </ThemedText>
              </GlassButton>
            )}

            {onHideSubject && (
              <GlassButton
                haptic="none"
                tintColor={theme.corail[600]}
                borderColor={theme.corail[500]}
                onPress={() => {
                  haptics.warning();
                  saveCourseNote(course.key, noteInput);
                  onHideSubject(course.subject);
                  onClose();
                }}
                containerStyle={styles.quickActionContainer}
                style={styles.quickActionPill}
              >
                <SymbolView
                  name={{
                    ios: "eye.slash.fill",
                    android: "visibility_off",
                    web: "visibility_off",
                  }}
                  size={14}
                  tintColor={theme.textOnAccent}
                />
                <ThemedText
                  type="captionBold"
                  style={{ color: theme.textOnAccent }}
                >
                  Masquer {course.subject}
                </ThemedText>
              </GlassButton>
            )}
          </GlassSurfaceContainer>
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
            onChangeText={(text) => {
              dirtyRef.current = true;
              savedOnCloseRef.current = false;
              setNoteInput(text);
            }}
            onBlur={() => {
              flushNote(false);
            }}
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

        <GlassButton
          haptic="none"
          tintColor={theme.accentTiers.solidBg}
          borderColor={theme.accentTiers.primary}
          onPress={handleClose}
          style={styles.doneButton}
        >
          <ThemedText type="smallBold" style={{ color: theme.textOnAccent }}>
            Enregistrer et fermer
          </ThemedText>
        </GlassButton>
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
  const requestCloseRef = useRef<() => void>(onClose);

  useEffect(() => {
    if (!visible || !course) {
      requestCloseRef.current = onClose;
    }
  }, [visible, course, onClose]);

  const registerCloseHandler = useCallback((fn: () => void) => {
    requestCloseRef.current = fn;
  }, []);

  if (!course) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={() => requestCloseRef.current()}
    >
      <CourseDetailContent
        key={course.key}
        course={course}
        onClose={onClose}
        onRegisterCloseHandler={registerCloseHandler}
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
    width: 44,
    height: 44,
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
  infoValueRight: {
    flexShrink: 1,
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  quickActionContainer: {
    flex: 1,
  },
  quickActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
    borderCurve: "continuous",
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
