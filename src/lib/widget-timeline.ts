import {
  type AccentPreset,
  type AppTheme,
  type BaseThemeMode,
  getCourseColorTokens,
  resolveTheme,
} from "@/constants/theme";
import {
  TZ_PARIS,
  addDays,
  formatDayHeaderCompact,
  formatDayShort,
  formatTime,
  formatTimeRange,
  formatTotalDuration,
  formatWeekHeader,
  getMondayOfWeek,
  getParisDateString,
  getParisMinutesOfDay,
  getWeekDays,
} from "@/lib/dates";
import { Course, isCourseDS } from "@/lib/geii-api";
import { resolveSubjectReadableName } from "@/lib/subject-names";

export type SubjectDictionary = Record<string, string>;

export type WidgetPalette = {
  bgStart: string;
  bgEnd: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSolid: string;
  accentSoft: string;
  accentText: string;
  textOnAccent: string;
  liveAccent: string;
  liveSoft: string;
  liveText: string;
  dsAccent: string;
  dsSoft: string;
  dsText: string;
};

export type WidgetCourseRow = {
  key: string;
  title: string;
  rawTitle: string;
  subject: string;
  teacher: string;
  room: string;
  compactRoom: string;
  startMs: number;
  endMs: number;
  timeRange: string;
  startLabel: string;
  endLabel: string;
  kind: string;
  isDS: boolean;
  isActive: boolean;
  progress: number;
  accentDark: string;
  accentLight: string;
  badgeBgDark: string;
  badgeBgLight: string;
  badgeTextDark: string;
  badgeTextLight: string;
};

export type NextCourseWidgetProps = {
  status: "active" | "upcoming" | "empty";
  course?: WidgetCourseRow;
  dayContext: string;
  countdownLabel: string;
  useLiveTimer: boolean;
  entryMs: number;
  updatedAtLabel: string;
  updatedShortLabel: string;
  paletteDark: WidgetPalette;
  paletteLight: WidgetPalette;
};

export type DayAgendaWidgetProps = {
  dayLabel: string;
  isToday: boolean;
  totalDuration: string;
  totalCount: number;
  rows: WidgetCourseRow[];
  extraCount: number;
  nextSchoolDayLabel: string;
  entryMs: number;
  updatedAtLabel: string;
  paletteDark: WidgetPalette;
  paletteLight: WidgetPalette;
};

export type WeekDayLoad = {
  dateStr: string;
  dayInitial: string;
  dayNum: string;
  isToday: boolean;
  courseCount: number;
  hasDS: boolean;
  loadRatio: number;
};

export type WeekUpcomingRow = WidgetCourseRow & {
  dayShort: string;
};

export type WeekOverviewWidgetProps = {
  weekLabel: string;
  totalDuration: string;
  totalCoursesCount: number;
  days: WeekDayLoad[];
  upcomingRows: WeekUpcomingRow[];
  extraUpcomingCount: number;
  nextDsSummary: string;
  entryMs: number;
  updatedAtLabel: string;
  paletteDark: WidgetPalette;
  paletteLight: WidgetPalette;
};

export type WidgetTimelinePayload = {
  nextCourseEntries: { date: Date; props: NextCourseWidgetProps }[];
  dayAgendaEntries: { date: Date; props: DayAgendaWidgetProps }[];
  weekOverviewEntries: { date: Date; props: WeekOverviewWidgetProps }[];
};

const shortDayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ_PARIS,
  weekday: "short",
  day: "numeric",
  month: "short",
});

function buildWidgetPalette(t: AppTheme): WidgetPalette {
  return {
    bgStart: t.background,
    bgEnd: t.cardBgSubtle,
    surface: t.cardBg,
    border: t.cardBorder,
    textPrimary: t.text,
    textSecondary: t.textSecondary,
    textMuted: t.textMuted,
    accent: t.accentTiers.primary,
    accentSolid: t.accentTiers.solidBg,
    accentSoft: t.accentTiers.softBg,
    accentText: t.accentTiers.text,
    textOnAccent: t.textOnAccent,
    liveAccent: t.menthe[500],
    liveSoft: t.menthe[100],
    liveText: t.menthe[700],
    dsAccent: t.corail[500],
    dsSoft: t.corail[100],
    dsText: t.corail[700],
  };
}

function buildCourseRow(
  course: Course,
  atMs: number,
  subjectDict: SubjectDictionary,
  darkTheme: AppTheme,
  lightTheme: AppTheme
): WidgetCourseRow {
  const readable = resolveSubjectReadableName(course.subject, subjectDict);
  const darkTokens = getCourseColorTokens(course.subject, course.kind, darkTheme);
  const lightTokens = getCourseColorTokens(
    course.subject,
    course.kind,
    lightTheme
  );
  const isActive = course.start <= atMs && atMs < course.end;
  const durationMs = Math.max(1, course.end - course.start);
  const progress = isActive
    ? Math.min(1, Math.max(0.03, (atMs - course.start) / durationMs))
    : 0;

  return {
    key: course.key,
    title: readable ?? course.title,
    rawTitle: course.title,
    subject: course.subject,
    teacher: course.teacher ?? "",
    room: course.room ?? "salle non communiquée",
    compactRoom: course.room ?? "Salle N.C.",
    startMs: course.start,
    endMs: course.end,
    timeRange: formatTimeRange(course.start, course.end),
    startLabel: formatTime(course.start),
    endLabel: formatTime(course.end),
    kind: course.kind ?? "",
    isDS: isCourseDS(course),
    isActive,
    progress,
    accentDark: darkTokens.accentColor,
    accentLight: lightTokens.accentColor,
    badgeBgDark: darkTokens.badgeBg,
    badgeBgLight: lightTokens.badgeBg,
    badgeTextDark: darkTokens.textColor,
    badgeTextLight: lightTokens.textColor,
  };
}

function formatStaticCountdown(
  targetMs: number,
  atMs: number,
  isCurrent: boolean
): string {
  const diffMin = Math.max(1, Math.round(Math.abs(targetMs - atMs) / 60000));
  if (isCurrent) {
    if (diffMin < 60) return `${diffMin} min rest.`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m === 0 ? `${h}h rest.` : `${h}h${String(m).padStart(2, "0")} rest.`;
  }
  if (diffMin <= 1) return "Imminent";
  if (diffMin < 60) return `Dans ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h < 24) {
    return m === 0 ? `Dans ${h}h` : `Dans ${h}h${String(m).padStart(2, "0")}`;
  }
  return formatTime(targetMs);
}

function formatDayContext(targetDateStr: string, entryDateStr: string): string {
  if (targetDateStr === entryDateStr) return "Aujourd'hui";
  if (targetDateStr === addDays(entryDateStr, 1)) return "Demain";
  const [y, m, d] = targetDateStr.split("-").map(Number);
  const label = shortDayMonthFormatter.format(
    new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildNextCourseProps(
  courses: Course[],
  atMs: number,
  updatedAtLabel: string,
  updatedShortLabel: string,
  subjectDict: SubjectDictionary,
  darkTheme: AppTheme,
  lightTheme: AppTheme,
  paletteDark: WidgetPalette,
  paletteLight: WidgetPalette
): NextCourseWidgetProps {
  const entryDateStr = getParisDateString(atMs);
  const current = courses.find((c) => c.start <= atMs && atMs < c.end);

  if (current) {
    return {
      status: "active",
      course: buildCourseRow(current, atMs, subjectDict, darkTheme, lightTheme),
      dayContext: "En cours",
      countdownLabel: formatStaticCountdown(current.end, atMs, true),
      useLiveTimer: true,
      entryMs: atMs,
      updatedAtLabel,
      updatedShortLabel,
      paletteDark,
      paletteLight,
    };
  }

  const upcoming = courses.find((c) => c.start > atMs);
  if (upcoming) {
    const targetDate = getParisDateString(upcoming.start);
    const withinHalfDay = upcoming.start - atMs <= 12 * 3600 * 1000;
    return {
      status: "upcoming",
      course: buildCourseRow(
        upcoming,
        atMs,
        subjectDict,
        darkTheme,
        lightTheme
      ),
      dayContext: formatDayContext(targetDate, entryDateStr),
      countdownLabel: formatStaticCountdown(upcoming.start, atMs, false),
      useLiveTimer: withinHalfDay,
      entryMs: atMs,
      updatedAtLabel,
      updatedShortLabel,
      paletteDark,
      paletteLight,
    };
  }

  return {
    status: "empty",
    dayContext: formatDayHeaderCompact(entryDateStr),
    countdownLabel: "Aucun cours à venir",
    useLiveTimer: false,
    entryMs: atMs,
    updatedAtLabel,
    updatedShortLabel,
    paletteDark,
    paletteLight,
  };
}

function buildDayAgendaProps(
  courses: Course[],
  atMs: number,
  updatedAtLabel: string,
  subjectDict: SubjectDictionary,
  darkTheme: AppTheme,
  lightTheme: AppTheme,
  paletteDark: WidgetPalette,
  paletteLight: WidgetPalette
): DayAgendaWidgetProps {
  const entryDateStr = getParisDateString(atMs);
  const todayCourses = courses.filter(
    (c) => getParisDateString(c.start) === entryDateStr
  );
  const todayRemaining = todayCourses.filter((c) => c.end > atMs);

  if (todayRemaining.length > 0) {
    const shown = todayRemaining
      .slice(0, 3)
      .map((c) => buildCourseRow(c, atMs, subjectDict, darkTheme, lightTheme));
    return {
      dayLabel: formatDayHeaderCompact(entryDateStr),
      isToday: true,
      totalDuration: formatTotalDuration(todayCourses),
      totalCount: todayRemaining.length,
      rows: shown,
      extraCount: Math.max(0, todayRemaining.length - shown.length),
      nextSchoolDayLabel: "",
      entryMs: atMs,
      updatedAtLabel,
      paletteDark,
      paletteLight,
    };
  }

  // Si aucun cours (ou aucun cours restant) dans la journée, afficher le prochain jour contenant des cours
  const nextCourse = courses.find((c) => c.end > atMs);
  if (nextCourse) {
    const nextDateStr = getParisDateString(nextCourse.start);
    const nextDayCourses = courses.filter(
      (c) => getParisDateString(c.start) === nextDateStr
    );
    const isTomorrow = nextDateStr === addDays(entryDateStr, 1);
    const prefix = isTomorrow ? "Demain • " : "Prochain • ";
    const shown = nextDayCourses
      .slice(0, 3)
      .map((c) => buildCourseRow(c, atMs, subjectDict, darkTheme, lightTheme));

    return {
      dayLabel: `${prefix}${formatDayHeaderCompact(nextDateStr)}`,
      isToday: false,
      totalDuration: formatTotalDuration(nextDayCourses),
      totalCount: nextDayCourses.length,
      rows: shown,
      extraCount: Math.max(0, nextDayCourses.length - shown.length),
      nextSchoolDayLabel: formatDayHeaderCompact(nextDateStr),
      entryMs: atMs,
      updatedAtLabel,
      paletteDark,
      paletteLight,
    };
  }

  return {
    dayLabel: formatDayHeaderCompact(entryDateStr),
    isToday: true,
    totalDuration: "0h",
    totalCount: 0,
    rows: [],
    extraCount: 0,
    nextSchoolDayLabel: "",
    entryMs: atMs,
    updatedAtLabel,
    paletteDark,
    paletteLight,
  };
}

function buildWeekOverviewProps(
  courses: Course[],
  atMs: number,
  updatedAtLabel: string,
  subjectDict: SubjectDictionary,
  darkTheme: AppTheme,
  lightTheme: AppTheme,
  paletteDark: WidgetPalette,
  paletteLight: WidgetPalette
): WeekOverviewWidgetProps {
  const entryDateStr = getParisDateString(atMs);
  let mondayStr = getMondayOfWeek(entryDateStr);
  const currentWeekDaysAll = getWeekDays(mondayStr, true);
  const sundayStr = currentWeekDaysAll[6];

  // Si aucun cours restant cette semaine, basculer sur la prochaine semaine contenant des cours
  const hasRemainingThisWeek = courses.some((c) => {
    const d = getParisDateString(c.start);
    return d >= entryDateStr && d <= sundayStr && c.end > atMs;
  });
  if (!hasRemainingThisWeek) {
    const nextFutureCourse = courses.find(
      (c) => getParisDateString(c.start) >= entryDateStr && c.end > atMs
    );
    if (nextFutureCourse) {
      mondayStr = getMondayOfWeek(getParisDateString(nextFutureCourse.start));
    }
  }

  const weekSixDays = getWeekDays(mondayStr, false);
  const saturdayStr = weekSixDays[5];
  const hasSaturdayCourses = courses.some(
    (c) => getParisDateString(c.start) === saturdayStr
  );
  const activeWeekDates = hasSaturdayCourses
    ? weekSixDays
    : weekSixDays.slice(0, 5);

  const dayCoursesMap = new Map<string, Course[]>();
  activeWeekDates.forEach((d) => dayCoursesMap.set(d, []));
  const weekCourses: Course[] = [];

  for (const c of courses) {
    const d = getParisDateString(c.start);
    const list = dayCoursesMap.get(d);
    if (list) {
      list.push(c);
      weekCourses.push(c);
    }
  }

  let maxDayCount = 1;
  dayCoursesMap.forEach((list) => {
    if (list.length > maxDayCount) maxDayCount = list.length;
  });

  const days: WeekDayLoad[] = activeWeekDates.map((d) => {
    const list = dayCoursesMap.get(d) ?? [];
    const { weekday, dayNum } = formatDayShort(d);
    return {
      dateStr: d,
      dayInitial: weekday.slice(0, 1),
      dayNum,
      isToday: d === entryDateStr,
      courseCount: list.length,
      hasDS: list.some(isCourseDS),
      loadRatio:
        list.length === 0 ? 0 : Math.max(0.18, list.length / maxDayCount),
    };
  });

  const weekUpcoming = weekCourses.filter((c) => c.end > atMs);
  const rowsSource =
    weekUpcoming.length > 0
      ? weekUpcoming
      : courses.filter((c) => c.end > atMs);

  const upcomingRows: WeekUpcomingRow[] = rowsSource.slice(0, 4).map((c) => {
    const { weekday, dayNum } = formatDayShort(getParisDateString(c.start));
    const base = buildCourseRow(c, atMs, subjectDict, darkTheme, lightTheme);
    return {
      ...base,
      dayShort: `${weekday.slice(0, 3)} ${dayNum}`,
    };
  });

  const nextDs = courses.find((c) => c.end > atMs && isCourseDS(c));
  let nextDsSummary = "";
  if (nextDs) {
    const dsDate = getParisDateString(nextDs.start);
    const dsLabel = resolveSubjectReadableName(nextDs.subject, subjectDict) ?? nextDs.title;
    nextDsSummary = `Prochain DS : ${dsLabel} • ${formatDayContext(dsDate, entryDateStr)} ${formatTime(nextDs.start)}`;
  }

  return {
    weekLabel: formatWeekHeader(mondayStr),
    totalDuration: formatTotalDuration(weekCourses),
    totalCoursesCount: weekCourses.length,
    days,
    upcomingRows,
    extraUpcomingCount: Math.max(0, rowsSource.length - upcomingRows.length),
    nextDsSummary,
    entryMs: atMs,
    updatedAtLabel,
    paletteDark,
    paletteLight,
  };
}

function getParisMidnightMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (const offsetHours of [-2, -1, 0]) {
    const candidate = utcMidnight + offsetHours * 3600000;
    if (
      getParisDateString(candidate) === dateStr &&
      getParisMinutesOfDay(candidate) === 0
    ) {
      return candidate;
    }
  }
  return utcMidnight - 3600000;
}

function sanitizePlistValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const clean = sanitizePlistValue(item);
      if (clean !== undefined) {
        out.push(clean);
      }
    }
    return out;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const clean = sanitizePlistValue(v);
      if (clean !== undefined) {
        out[k] = clean;
      }
    }
    return out;
  }
  return undefined;
}

/**
 * Supprime tout `null` / `undefined` / `NaN` avant stockage dans UserDefaults iOS
 * (évite `NSInvalidArgumentException` -> `Exception in HostFunction: <unknown>`).
 */
function sanitizeForPlist<T extends Record<string, unknown>>(obj: T): T {
  return (sanitizePlistValue(obj) as T) ?? ({} as T);
}

function collectTimelineTimestamps(courses: Course[], nowMs: number): number[] {
  const horizonMs = nowMs + 72 * 3600 * 1000;
  const rawPoints = new Set<number>([nowMs]);
  const todayStr = getParisDateString(nowMs);

  // Ajouter les minuits Europe/Paris des 3 prochains jours pour rafraîchir
  // "Demain" / "Prochain" / "Aujourd'hui" même les jours sans cours.
  for (let d = 1; d <= 3; d++) {
    const midnightMs = getParisMidnightMs(addDays(todayStr, d));
    if (midnightMs > nowMs) {
      rawPoints.add(midnightMs);
    }
  }

  for (const c of courses) {
    if (c.start > nowMs && c.start <= horizonMs) {
      rawPoints.add(c.start);
    }
    if (c.end > nowMs && c.end <= horizonMs) {
      rawPoints.add(c.end);
    }
  }

  // Si le prochain cours est au-delà de 72h (week-end prolongé / vacances),
  // inclure sa fenêtre pour assurer la bascule automatique de timeline.
  const firstUpcoming = courses.find((c) => c.end > nowMs);
  if (firstUpcoming) {
    if (firstUpcoming.start > nowMs) rawPoints.add(firstUpcoming.start);
    if (firstUpcoming.end > nowMs) rawPoints.add(firstUpcoming.end);
  }

  // Trier chronologiquement et dédupliquer les bornes proches (< 15s)
  const sorted = Array.from(rawPoints).sort((a, b) => a - b);
  const compact: number[] = [];
  for (const ts of sorted) {
    const prev = compact[compact.length - 1];
    if (prev === undefined || ts - prev >= 15000) {
      compact.push(ts);
    }
  }

  return compact.slice(0, 16);
}

/**
 * Construit les timelines complètes des 3 widgets iOS à partir du cache local GEII.
 * Chaque entrée correspond à un début/fin de cours dans les 72 prochaines heures.
 */
export function buildWidgetTimelines(
  courses: Course[],
  lastSync: number | null,
  subjectDict: SubjectDictionary,
  accentPreset: AccentPreset,
  useOledDark = false,
  nowMs = Date.now()
): WidgetTimelinePayload {
  const darkBase: BaseThemeMode = useOledDark ? "oled" : "nuit";
  const darkTheme = resolveTheme(darkBase, accentPreset);
  const lightTheme = resolveTheme("clair", accentPreset);
  const paletteDark = buildWidgetPalette(darkTheme);
  const paletteLight = buildWidgetPalette(lightTheme);

  const syncTimeStr = formatTime(lastSync ?? nowMs);
  const updatedAtLabel = `Mis à jour à ${syncTimeStr}`;
  const updatedShortLabel = `MAJ ${syncTimeStr}`;

  const sortedCourses = [...courses].sort((a, b) => a.start - b.start);
  const timestamps = collectTimelineTimestamps(sortedCourses, nowMs);

  const nextCourseEntries = timestamps.map((ts) => ({
    date: new Date(ts),
    props: sanitizeForPlist(
      buildNextCourseProps(
        sortedCourses,
        ts,
        updatedAtLabel,
        updatedShortLabel,
        subjectDict,
        darkTheme,
        lightTheme,
        paletteDark,
        paletteLight
      )
    ),
  }));

  const dayAgendaEntries = timestamps.map((ts) => ({
    date: new Date(ts),
    props: sanitizeForPlist(
      buildDayAgendaProps(
        sortedCourses,
        ts,
        updatedAtLabel,
        subjectDict,
        darkTheme,
        lightTheme,
        paletteDark,
        paletteLight
      )
    ),
  }));

  const weekOverviewEntries = timestamps.map((ts) => ({
    date: new Date(ts),
    props: sanitizeForPlist(
      buildWeekOverviewProps(
        sortedCourses,
        ts,
        updatedAtLabel,
        subjectDict,
        darkTheme,
        lightTheme,
        paletteDark,
        paletteLight
      )
    ),
  }));

  return {
    nextCourseEntries,
    dayAgendaEntries,
    weekOverviewEntries,
  };
}
