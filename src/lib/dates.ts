import { Course } from "./ics";

export const TZ_PARIS = "Europe/Paris";

const parisDateFormatter = new Intl.DateTimeFormat("fr-CA", {
  timeZone: TZ_PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ_PARIS,
  hourCycle: "h23",
  hour: "numeric",
  minute: "numeric",
});

/**
 * Retourne la date "YYYY-MM-DD" en heure Europe/Paris pour un epoch ms donné.
 */
export function getParisDateString(epochMs: number): string {
  return parisDateFormatter.format(new Date(epochMs));
}

/**
 * Retourne les minutes écoulées depuis minuit (0..1439) en heure Europe/Paris.
 */
export function getParisMinutesOfDay(epochMs: number): number {
  const parts = parisTimePartsFormatter.formatToParts(new Date(epochMs));
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "hour") hour = Number(part.value);
    if (part.type === "minute") minute = Number(part.value);
  }
  return hour * 60 + minute;
}

/**
 * Date d'aujourd'hui en Europe/Paris "YYYY-MM-DD".
 */
export function getTodayParisDateString(): string {
  return getParisDateString(Date.now());
}

/**
 * Trouve le lundi de la semaine pour une date "YYYY-MM-DD" donnée.
 */
export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0 = Dimanche, 1 = Lundi, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  return parisDateFormatter.format(dt);
}

/**
 * Retourne les 6 ou 7 jours de la semaine (lundi au samedi ou dimanche).
 */
export function getWeekDays(mondayStr: string, includeSunday = false): string[] {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const count = includeSunday ? 7 : 6;
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0));
    days.push(parisDateFormatter.format(dt));
  }
  return days;
}

/**
 * Ajoute (ou soustrait) un nombre de jours à une date "YYYY-MM-DD".
 */
export function addDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return parisDateFormatter.format(dt);
}

/**
 * Formate une date "YYYY-MM-DD" pour l'en-tête (ex: "Jeudi 12 novembre 2026").
 */
export function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formate une date "YYYY-MM-DD" de façon concise (ex: "Jeudi 12 nov.").
 */
export function formatDayHeaderCompact(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(dt);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formate le mois et l'année (ex: "Novembre 2026").
 */
export function formatMonthYear(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    month: "long",
    year: "numeric",
  }).format(dt);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formate le nom court du jour (ex: "JEU", "12").
 */
export function formatDayShort(dateStr: string): { weekday: string; dayNum: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    weekday: "short",
  }).format(dt);
  return {
    weekday: weekday.replace(".", "").slice(0, 3).toUpperCase(),
    dayNum: String(d),
  };
}

/**
 * Formate la plage de la semaine (ex: "Semaine du 9 au 14 nov. 2026").
 */
export function formatWeekHeader(mondayStr: string): string {
  const saturdayStr = addDays(mondayStr, 5);
  const [y1, m1, d1] = mondayStr.split("-").map(Number);
  const [y2, m2, d2] = saturdayStr.split("-").map(Number);
  const dt1 = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
  const dt2 = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));

  const startDay = dt1.getUTCDate();
  const endFormatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt2);

  return `Semaine du ${startDay} au ${endFormatted}`;
}

/**
 * Formate l'heure seulement (ex: "08:00").
 */
export function formatTime(epochMs: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMs));
}

/**
 * Formate une plage horaire (ex: "08:00 - 10:00").
 */
export function formatTimeRange(startMs: number, endMs: number): string {
  return `${formatTime(startMs)} - ${formatTime(endMs)}`;
}

/**
 * Formate un nombre de minutes en durée lisible (ex: "2h", "1h30", "45 min").
 */
export function formatMinutesAsDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h${String(remainder).padStart(2, "0")}`;
}

/**
 * Calcule et formate la durée d'un cours (ex: "2h", "1h30").
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diffMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  return formatMinutesAsDuration(diffMinutes);
}

/**
 * Calcule la durée cumulée de cours en fusionnant d'abord les créneaux qui se chevauchent
 * afin d'éviter le double-comptage entre groupes parallèles (ESE / ESEA).
 */
export function formatTotalDuration(courses: Course[]): string {
  if (courses.length === 0) return "0h";
  const sorted = [...courses]
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (sorted.length === 0) return "0h";

  let totalMs = 0;
  let curStart = sorted[0].start;
  let curEnd = sorted[0].end;

  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i];
    if (c.start <= curEnd) {
      if (c.end > curEnd) curEnd = c.end;
    } else {
      totalMs += curEnd - curStart;
      curStart = c.start;
      curEnd = c.end;
    }
  }
  totalMs += curEnd - curStart;

  return formatMinutesAsDuration(totalMs / 60000);
}

/**
 * Décrit la pause entre deux cours consécutifs si >= 15 min.
 */
export function formatGapBetween(
  prevEndMs: number,
  nextStartMs: number
): { label: string; isLunch: boolean } | null {
  const diffMinutes = Math.round((nextStartMs - prevEndMs) / 60000);
  if (diffMinutes < 15) return null;

  const startMin = getParisMinutesOfDay(prevEndMs);
  const endMin = getParisMinutesOfDay(nextStartMs);
  const lunchOverlap = Math.min(endMin, 13 * 60 + 45) - Math.max(startMin, 11 * 60 + 45);
  const isLunch = lunchOverlap >= 30 && diffMinutes >= 45;
  const dur = formatMinutesAsDuration(diffMinutes);

  return {
    label: isLunch ? `Pause déjeuner • ${dur}` : `Pause • ${dur}`,
    isLunch,
  };
}

/**
 * Extrait le libellé d'étage court depuis un nom de salle (1er chiffre).
 */
export function extractFloor(room: string | null): string | null {
  if (!room) return null;
  const match = room.match(/^(\d)/);
  if (!match) return null;
  return match[1] === "0" ? "RDC" : `${match[1]}e ét.`;
}

export type NextCourseInfo = {
  course: Course | null;
  isCurrent: boolean;
  countdown: string;
};

/**
 * Détermine le cours en cours ou le prochain cours et calcule le compte à rebours.
 */
export function getNextOrCurrentCourse(
  courses: Course[],
  now = Date.now()
): NextCourseInfo {
  if (courses.length === 0) {
    return { course: null, isCurrent: false, countdown: "" };
  }

  // 1. Cours en cours
  const current = courses.find((c) => c.start <= now && now < c.end);
  if (current) {
    const remainingMin = Math.max(1, Math.round((current.end - now) / 60000));
    const countdown =
      remainingMin >= 60
        ? `${Math.floor(remainingMin / 60)}h${String(remainingMin % 60).padStart(2, "0")} restantes`
        : `${remainingMin} min restantes`;
    return { course: current, isCurrent: true, countdown };
  }

  // 2. Prochain cours à venir
  const upcoming = courses.find((c) => c.start > now);
  if (!upcoming) {
    return { course: null, isCurrent: false, countdown: "Aucun cours à venir" };
  }

  const diffMs = upcoming.start - now;
  const diffMin = Math.round(diffMs / 60000);

  let countdown: string;
  if (diffMin <= 1) {
    countdown = "Imminent";
  } else if (diffMin < 60) {
    countdown = `Dans ${diffMin} min`;
  } else if (diffMin < 24 * 60) {
    const todayStr = getTodayParisDateString();
    const upcomingDateStr = getParisDateString(upcoming.start);
    if (todayStr === upcomingDateStr) {
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      countdown =
        minutes === 0
          ? `Dans ${hours}h`
          : `Dans ${hours}h${String(minutes).padStart(2, "0")}`;
    } else {
      countdown = `Demain ${formatTime(upcoming.start)}`;
    }
  } else {
    const dayFmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ_PARIS,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(upcoming.start));
    countdown = `${dayFmt} • ${formatTime(upcoming.start)}`;
  }

  return { course: upcoming, isCurrent: false, countdown };
}
