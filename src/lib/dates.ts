import { Course } from "./ics";

export const TZ_PARIS = "Europe/Paris";

const parisDateFormatter = new Intl.DateTimeFormat("fr-CA", {
  timeZone: TZ_PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Retourne la date "YYYY-MM-DD" en heure Europe/Paris pour un epoch ms donné.
 */
export function getParisDateString(epochMs: number): string {
  return parisDateFormatter.format(new Date(epochMs));
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
 * Formate le nom court du jour (ex: "Jeu.", "12").
 */
export function formatDayShort(dateStr: string): { weekday: string; dayNum: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ_PARIS,
    weekday: "short",
  }).format(dt);
  return {
    weekday: weekday.slice(0, 3).toUpperCase(),
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
 * Calcule et formate la durée d'un cours (ex: "2h00", "1h30").
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diffMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
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
        ? `Se termine dans ${Math.floor(remainingMin / 60)}h${String(remainingMin % 60).padStart(2, "0")}`
        : `Se termine dans ${remainingMin} min`;
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
    countdown = "Commence imminemment";
  } else if (diffMin < 60) {
    countdown = `Dans ${diffMin} min`;
  } else if (diffMin < 24 * 60) {
    const todayStr = getTodayParisDateString();
    const upcomingDateStr = getParisDateString(upcoming.start);
    if (todayStr === upcomingDateStr) {
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      countdown = minutes === 0 ? `Dans ${hours}h` : `Dans ${hours}h${String(minutes).padStart(2, "0")}`;
    } else {
      countdown = `Demain à ${formatTime(upcoming.start)}`;
    }
  } else {
    const dayFmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ_PARIS,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(upcoming.start));
    countdown = `${dayFmt} à ${formatTime(upcoming.start)}`;
  }

  return { course: upcoming, isCurrent: false, countdown };
}
