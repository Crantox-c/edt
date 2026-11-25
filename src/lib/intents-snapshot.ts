import { addDays, formatTime, getParisDateString } from "@/lib/dates";
import { type Course, isCourseDS } from "@/lib/geii-api";
import { resolveSubjectReadableName } from "@/lib/subject-names";
import type { SubjectDictionary } from "@/lib/widget-timeline";

export type IntentCourseItem = {
  key: string;
  title: string;
  rawTitle: string;
  subject: string;
  room: string;
  compactRoom: string;
  teacher: string;
  kind: string;
  isDS: boolean;
  dateIso: string;
  startMs: number;
  endMs: number;
  startLabel: string;
  endLabel: string;
};

export type ScheduleIntentsSnapshot = {
  version: 1;
  groupName: string;
  generatedAtMs: number;
  lastSyncMs: number | null;
  courses: IntentCourseItem[];
};

/**
 * Construit un instantané JSON compact et filtré des cours à partir d'hier
 * (Europe/Paris) pour alimenter les App Intents Siri & Raccourcis hors ligne.
 */
export function buildScheduleIntentsSnapshot(
  courses: Course[],
  groupName: string,
  lastSyncMs: number | null,
  subjectDict: SubjectDictionary,
  nowMs = Date.now()
): ScheduleIntentsSnapshot {
  const yesterdayIso = addDays(getParisDateString(nowMs), -1);

  const items: IntentCourseItem[] = [...courses]
    .map((course) => ({
      course,
      dateIso: getParisDateString(course.start),
    }))
    .filter(({ dateIso }) => dateIso >= yesterdayIso)
    .sort(
      (a, b) =>
        a.course.start - b.course.start ||
        a.course.end - b.course.end ||
        a.course.title.localeCompare(b.course.title)
    )
    .map(({ course, dateIso }) => {
      const readable = resolveSubjectReadableName(course.subject, subjectDict);
      return {
        key: course.key,
        title: readable ?? course.title,
        rawTitle: course.title,
        subject: course.subject,
        room: course.room ?? "salle non communiquée",
        compactRoom: course.room ?? "N.C.",
        teacher: (course.teacher ?? "").trim(),
        kind: course.kind ?? "",
        isDS: isCourseDS(course),
        dateIso,
        startMs: course.start,
        endMs: course.end,
        startLabel: formatTime(course.start),
        endLabel: formatTime(course.end),
      };
    });

  return {
    version: 1,
    groupName: groupName.trim() || "GEII",
    generatedAtMs: nowMs,
    lastSyncMs,
    courses: items,
  };
}

/**
 * Empreinte stable (hors `generatedAtMs`) pour éviter les réécritures disque inutiles.
 */
export function getIntentsSnapshotFingerprint(
  snapshot: ScheduleIntentsSnapshot
): string {
  return JSON.stringify({
    version: snapshot.version,
    groupName: snapshot.groupName,
    lastSyncMs: snapshot.lastSyncMs,
    courses: snapshot.courses,
  });
}
