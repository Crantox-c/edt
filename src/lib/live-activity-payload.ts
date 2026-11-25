import {
  type AccentPreset,
  type BaseThemeMode,
  getCourseColorTokens,
  resolveTheme,
} from "@/constants/theme";
import {
  formatTime,
  formatTimeRange,
  getParisDateString,
} from "@/lib/dates";
import { type Course, isCourseDS } from "@/lib/geii-api";
import { resolveSubjectReadableName } from "@/lib/subject-names";
import {
  type SubjectDictionary,
  type WidgetPalette,
  buildWidgetPalette,
} from "@/lib/widget-timeline";

export type LiveActivityPhase = "upcoming" | "active";

export type CourseLiveActivityProps = {
  courseKey: string;
  phase: LiveActivityPhase;
  title: string;
  subject: string;
  room: string;
  compactRoom: string;
  teacher: string;
  kind: string;
  isDS: boolean;
  startMs: number;
  endMs: number;
  startLabel: string;
  endLabel: string;
  timeRange: string;
  nextCourseHint: string;
  entryMs: number;
  accentDark: string;
  accentLight: string;
  badgeBgDark: string;
  badgeBgLight: string;
  badgeTextDark: string;
  badgeTextLight: string;
  paletteDark: WidgetPalette;
  paletteLight: WidgetPalette;
};

export type LiveActivityTarget = {
  course: Course;
  phase: LiveActivityPhase;
  staleDate: Date;
  isManualPin: boolean;
};

/**
 * Sélectionne le cours à suivre sur la Live Activity :
 * 1) cours épinglé manuellement (s'il n'est pas terminé),
 * 2) cours actuellement en cours,
 * 3) prochain cours démarrant dans `leadTimeMinutes` minutes.
 */
export function selectLiveActivityTarget(
  courses: Course[],
  nowMs: number,
  leadTimeMinutes: number,
  manualCourseKey?: string | null
): LiveActivityTarget | null {
  const sorted = [...courses].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );

  if (manualCourseKey) {
    const pinned = sorted.find(
      (c) => c.key === manualCourseKey && c.end > nowMs
    );
    if (pinned) {
      const isActive = pinned.start <= nowMs;
      return {
        course: pinned,
        phase: isActive ? "active" : "upcoming",
        staleDate: new Date(isActive ? pinned.end : pinned.start),
        isManualPin: true,
      };
    }
  }

  const current = sorted.find((c) => c.start <= nowMs && nowMs < c.end);
  if (current) {
    return {
      course: current,
      phase: "active",
      staleDate: new Date(current.end),
      isManualPin: false,
    };
  }

  const horizonMs = Math.max(0, leadTimeMinutes) * 60_000;
  const upcoming = sorted.find(
    (c) => c.start > nowMs && c.start - nowMs <= horizonMs
  );
  if (upcoming) {
    return {
      course: upcoming,
      phase: "upcoming",
      staleDate: new Date(upcoming.start),
      isManualPin: false,
    };
  }

  return null;
}

/**
 * Pour un démarrage manuel depuis les Réglages : prend le cours en cours,
 * sinon le tout prochain cours à venir sans limite de fenêtre.
 */
export function selectNextCourseForManualStart(
  courses: Course[],
  nowMs: number
): LiveActivityTarget | null {
  const sorted = [...courses].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );
  const current = sorted.find((c) => c.start <= nowMs && nowMs < c.end);
  if (current) {
    return {
      course: current,
      phase: "active",
      staleDate: new Date(current.end),
      isManualPin: true,
    };
  }

  const next = sorted.find((c) => c.start > nowMs);
  if (next) {
    return {
      course: next,
      phase: "upcoming",
      staleDate: new Date(next.start),
      isManualPin: true,
    };
  }

  return null;
}

/**
 * Construit les props sérialisables de la Live Activity à partir du thème,
 * du dictionnaire de matières et du cours ciblé.
 */
export function buildLiveActivityProps(
  target: LiveActivityTarget,
  allCourses: Course[],
  subjectDict: SubjectDictionary,
  accentPreset: AccentPreset,
  useOledDark = false,
  nowMs = Date.now()
): CourseLiveActivityProps {
  const darkBase: BaseThemeMode = useOledDark ? "oled" : "nuit";
  const darkTheme = resolveTheme(darkBase, accentPreset);
  const lightTheme = resolveTheme("clair", accentPreset);
  const paletteDark = buildWidgetPalette(darkTheme);
  const paletteLight = buildWidgetPalette(lightTheme);

  const { course, phase } = target;
  const readable = resolveSubjectReadableName(course.subject, subjectDict);
  const darkTokens = getCourseColorTokens(course.subject, course.kind, darkTheme);
  const lightTokens = getCourseColorTokens(
    course.subject,
    course.kind,
    lightTheme
  );

  const courseDate = getParisDateString(course.start);
  const sortedSameDay = [...allCourses]
    .filter(
      (c) =>
        c.key !== course.key &&
        getParisDateString(c.start) === courseDate &&
        c.start >= course.end
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const following = sortedSameDay[0];
  let nextCourseHint = "";
  if (following) {
    const nextTitle =
      resolveSubjectReadableName(following.subject, subjectDict) ??
      following.title;
    const roomSuffix = following.room ? ` · ${following.room}` : "";
    nextCourseHint = `Ensuite : ${nextTitle} · ${formatTime(following.start)}${roomSuffix}`;
  }

  return {
    courseKey: course.key,
    phase,
    title: readable ?? course.title,
    subject: course.subject,
    room: course.room ?? "salle non communiquée",
    compactRoom: course.room ?? "N.C.",
    teacher: (course.teacher ?? "").trim(),
    kind: course.kind ?? "",
    isDS: isCourseDS(course),
    startMs: course.start,
    endMs: course.end,
    startLabel: formatTime(course.start),
    endLabel: formatTime(course.end),
    timeRange: formatTimeRange(course.start, course.end),
    nextCourseHint,
    entryMs: nowMs,
    accentDark: darkTokens.accentColor,
    accentLight: lightTokens.accentColor,
    badgeBgDark: darkTokens.badgeBg,
    badgeBgLight: lightTokens.badgeBg,
    badgeTextDark: darkTokens.textColor,
    badgeTextLight: lightTokens.textColor,
    paletteDark,
    paletteLight,
  };
}

/**
 * Empreinte stable (hors `entryMs`) pour éviter les appels `update()` redondants
 * lorsque seul le tick de minute avance.
 */
export function getLiveActivityFingerprint(
  props: CourseLiveActivityProps,
  staleDateMs: number
): string {
  const { entryMs: _ignored, ...stableProps } = props;
  return JSON.stringify({
    ...stableProps,
    staleDateMs,
  });
}
