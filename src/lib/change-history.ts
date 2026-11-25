import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  formatDayHeaderCompact,
  formatTime,
  formatTimeRange,
  getParisDateString,
} from "@/lib/dates";
import { type Course, type CourseChanges, type CourseKind, isCourseDS } from "@/lib/geii-api";
import { resolveSubjectReadableName } from "@/lib/subject-names";

export const URGENT_CHANGE_WINDOW_MS = 48 * 3600 * 1000;
export const MAX_HISTORY_BATCHES = 25;
export const HISTORY_RETENTION_MS = 30 * 24 * 3600 * 1000;
const TIME_MATCH_WINDOW_MS = 7 * 24 * 3600 * 1000;

export type ScheduleChangeKind =
  | "room_changed"
  | "time_changed"
  | "added"
  | "removed";

export type ScheduleChangeItem = {
  id: string;
  kind: ScheduleChangeKind;
  detectedAtMs: number;
  courseKey: string;
  subject: string;
  title: string;
  courseKind: CourseKind | null;
  isDS: boolean;
  start: number;
  end: number;
  room: string | null;
  teacher: string | null;
  previousStart?: number;
  previousEnd?: number;
  previousRoom?: string | null;
  previousTeacher?: string | null;
  isWithin48h: boolean;
};

export type ScheduleChangeBatch = {
  id: string;
  groupId: string;
  detectedAtMs: number;
  unread: boolean;
  items: ScheduleChangeItem[];
};

function historyStorageKey(groupId: string): string {
  return `geii_change_history_v1_${groupId}`;
}

function isFutureOrOngoingWithin48h(
  startMs: number,
  endMs: number,
  nowMs: number
): boolean {
  return endMs > nowMs && startMs - nowMs <= URGENT_CHANGE_WINDOW_MS;
}

function buildChangeItem(
  index: number,
  kind: ScheduleChangeKind,
  course: Course,
  detectedAtMs: number,
  nowMs: number,
  previous?: Course
): ScheduleChangeItem {
  const isWithin48h =
    isFutureOrOngoingWithin48h(course.start, course.end, nowMs) ||
    (previous != null &&
      isFutureOrOngoingWithin48h(previous.start, previous.end, nowMs));

  return {
    id: `${detectedAtMs}_${kind}_${index}_${course.key}`,
    kind,
    detectedAtMs,
    courseKey: course.key,
    subject: course.subject,
    title: course.title,
    courseKind: course.kind,
    isDS: isCourseDS(course) || (previous ? isCourseDS(previous) : false),
    start: course.start,
    end: course.end,
    room: course.room,
    teacher: course.teacher,
    ...(previous
      ? {
          previousStart: previous.start,
          previousEnd: previous.end,
          previousRoom: previous.room,
          previousTeacher: previous.teacher,
        }
      : {}),
    isWithin48h,
  };
}

/**
 * Classifie un diff brut (`added` / `removed`) en modifications sémantiques :
 * - `room_changed` (même créneau & titre, salle différente),
 * - `time_changed` (même matière & intitulé déplacé à ±7 jours),
 * - `added` / `removed` purs.
 */
export function classifyScheduleChanges(
  changes: CourseChanges,
  detectedAtMs = Date.now(),
  nowMs = detectedAtMs
): ScheduleChangeItem[] {
  const added = [...changes.added];
  const removed = [...changes.removed];
  if (added.length === 0 && removed.length === 0) {
    return [];
  }

  const usedAdded = new Set<number>();
  const usedRemoved = new Set<number>();
  const items: ScheduleChangeItem[] = [];
  let seq = 0;

  // Passe 1 : changement de salle exact sur le même créneau et le même intitulé
  for (let rIdx = 0; rIdx < removed.length; rIdx++) {
    const rem = removed[rIdx];
    const matchIdx = added.findIndex(
      (add, aIdx) =>
        !usedAdded.has(aIdx) &&
        rem.start === add.start &&
        rem.end === add.end &&
        rem.title === add.title &&
        (rem.room ?? "") !== (add.room ?? "")
    );
    if (matchIdx !== -1) {
      usedRemoved.add(rIdx);
      usedAdded.add(matchIdx);
      items.push(
        buildChangeItem(
          seq++,
          "room_changed",
          added[matchIdx],
          detectedAtMs,
          nowMs,
          rem
        )
      );
    }
  }

  // Passe 2 : déplacement horaire d'une même séance à ±7 jours (tri global par proximité)
  type TimeCandidate = {
    rIdx: number;
    aIdx: number;
    sameDayRank: number;
    deltaMs: number;
  };
  const timeCandidates: TimeCandidate[] = [];
  for (let rIdx = 0; rIdx < removed.length; rIdx++) {
    if (usedRemoved.has(rIdx)) continue;
    const rem = removed[rIdx];
    const remDay = getParisDateString(rem.start);
    for (let aIdx = 0; aIdx < added.length; aIdx++) {
      if (usedAdded.has(aIdx)) continue;
      const add = added[aIdx];
      if (rem.title !== add.title || rem.subject !== add.subject) continue;
      const deltaMs = Math.abs(add.start - rem.start);
      if (deltaMs > TIME_MATCH_WINDOW_MS) continue;
      const sameDayRank = getParisDateString(add.start) === remDay ? 0 : 1;
      timeCandidates.push({ rIdx, aIdx, sameDayRank, deltaMs });
    }
  }

  timeCandidates.sort(
    (a, b) =>
      a.sameDayRank - b.sameDayRank ||
      a.deltaMs - b.deltaMs ||
      a.rIdx - b.rIdx ||
      a.aIdx - b.aIdx
  );

  for (const cand of timeCandidates) {
    if (usedRemoved.has(cand.rIdx) || usedAdded.has(cand.aIdx)) continue;
    usedRemoved.add(cand.rIdx);
    usedAdded.add(cand.aIdx);
    items.push(
      buildChangeItem(
        seq++,
        "time_changed",
        added[cand.aIdx],
        detectedAtMs,
        nowMs,
        removed[cand.rIdx]
      )
    );
  }

  // Passe 3 : ajouts et suppressions non appariés
  for (let aIdx = 0; aIdx < added.length; aIdx++) {
    if (usedAdded.has(aIdx)) continue;
    items.push(buildChangeItem(seq++, "added", added[aIdx], detectedAtMs, nowMs));
  }
  for (let rIdx = 0; rIdx < removed.length; rIdx++) {
    if (usedRemoved.has(rIdx)) continue;
    items.push(
      buildChangeItem(seq++, "removed", removed[rIdx], detectedAtMs, nowMs)
    );
  }

  return items.sort(
    (a, b) =>
      a.start - b.start || a.end - b.end || a.title.localeCompare(b.title)
  );
}

function pruneBatches(
  batches: ScheduleChangeBatch[],
  nowMs: number
): ScheduleChangeBatch[] {
  const minTs = nowMs - HISTORY_RETENTION_MS;
  return batches
    .filter(
      (b) =>
        typeof b?.id === "string" &&
        typeof b?.detectedAtMs === "number" &&
        b.detectedAtMs >= minTs &&
        Array.isArray(b.items) &&
        b.items.length > 0
    )
    .sort((a, b) => b.detectedAtMs - a.detectedAtMs)
    .slice(0, MAX_HISTORY_BATCHES);
}

export async function loadChangeHistory(
  groupId: string,
  nowMs = Date.now()
): Promise<ScheduleChangeBatch[]> {
  if (!groupId) return [];
  try {
    const raw = await AsyncStorage.getItem(historyStorageKey(groupId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return pruneBatches(parsed as ScheduleChangeBatch[], nowMs);
  } catch (e) {
    console.warn("Erreur chargement historique des changements:", e);
    return [];
  }
}

async function saveChangeHistory(
  groupId: string,
  batches: ScheduleChangeBatch[]
): Promise<void> {
  if (!groupId) return;
  try {
    if (batches.length === 0) {
      await AsyncStorage.removeItem(historyStorageKey(groupId));
    } else {
      await AsyncStorage.setItem(
        historyStorageKey(groupId),
        JSON.stringify(batches)
      );
    }
  } catch (e) {
    console.warn("Erreur sauvegarde historique des changements:", e);
  }
}

export async function appendChangeBatch(
  groupId: string,
  changes: CourseChanges,
  detectedAtMs = Date.now()
): Promise<{
  history: ScheduleChangeBatch[];
  newBatch: ScheduleChangeBatch | null;
}> {
  const existing = await loadChangeHistory(groupId, detectedAtMs);
  const items = classifyScheduleChanges(changes, detectedAtMs, detectedAtMs);
  if (items.length === 0) {
    return { history: existing, newBatch: null };
  }

  const newBatch: ScheduleChangeBatch = {
    id: `${detectedAtMs}_${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    detectedAtMs,
    unread: true,
    items,
  };

  const nextHistory = pruneBatches([newBatch, ...existing], detectedAtMs);
  await saveChangeHistory(groupId, nextHistory);
  return { history: nextHistory, newBatch };
}

export async function markChangeHistoryRead(
  groupId: string,
  nowMs = Date.now()
): Promise<ScheduleChangeBatch[]> {
  const existing = await loadChangeHistory(groupId, nowMs);
  const hasUnread = existing.some((b) => b.unread);
  if (!hasUnread) return existing;

  const next = existing.map((b) => (b.unread ? { ...b, unread: false } : b));
  await saveChangeHistory(groupId, next);
  return next;
}

export async function clearChangeHistory(groupId: string): Promise<void> {
  if (!groupId) return;
  try {
    await AsyncStorage.removeItem(historyStorageKey(groupId));
  } catch (e) {
    console.warn("Erreur suppression historique des changements:", e);
  }
}

export function countUnreadChanges(history: ScheduleChangeBatch[]): number {
  let total = 0;
  for (const batch of history) {
    if (batch.unread) {
      total += batch.items.length;
    }
  }
  return total;
}

export function hasUnreadUrgentChanges(
  history: ScheduleChangeBatch[]
): boolean {
  return history.some(
    (batch) => batch.unread && batch.items.some((item) => item.isWithin48h)
  );
}

export function getUrgent48hChanges(
  batch: ScheduleChangeBatch | null
): ScheduleChangeItem[] {
  if (!batch) return [];
  return batch.items.filter((item) => item.isWithin48h);
}

export function formatChangeItemSummary(
  item: ScheduleChangeItem,
  subjectDict: Record<string, string>
): { badgeLabel: string; headline: string; detail: string } {
  const readable = resolveSubjectReadableName(item.subject, subjectDict);
  const headline = readable ?? item.title;
  const dayLabel = formatDayHeaderCompact(getParisDateString(item.start));
  const newTime = formatTimeRange(item.start, item.end);
  const newRoom = item.room ?? "salle non communiquée";

  switch (item.kind) {
    case "room_changed": {
      const oldRoom = item.previousRoom ?? "salle non communiquée";
      return {
        badgeLabel: "Salle modifiée",
        headline,
        detail: `${dayLabel} • ${newTime} • ${oldRoom} → ${newRoom}`,
      };
    }
    case "time_changed": {
      const prevStart = item.previousStart ?? item.start;
      const prevEnd = item.previousEnd ?? item.end;
      const prevDay = formatDayHeaderCompact(getParisDateString(prevStart));
      const sameDay =
        getParisDateString(prevStart) === getParisDateString(item.start);
      const oldSlot = sameDay
        ? formatTimeRange(prevStart, prevEnd)
        : `${prevDay} ${formatTime(prevStart)}-${formatTime(prevEnd)}`;
      const roomChangedSuffix =
        item.previousRoom !== undefined &&
        (item.previousRoom ?? "") !== (item.room ?? "")
          ? ` (${item.previousRoom ?? "salle non communiquée"} → ${newRoom})`
          : ` (${newRoom})`;
      return {
        badgeLabel: "Horaire déplacé",
        headline,
        detail: `${oldSlot} → ${dayLabel} ${newTime}${roomChangedSuffix}`,
      };
    }
    case "added":
      return {
        badgeLabel: "Cours ajouté",
        headline,
        detail: `${dayLabel} • ${newTime} • ${newRoom}`,
      };
    case "removed":
      return {
        badgeLabel: "Cours annulé",
        headline,
        detail: `${dayLabel} • ${newTime} • ${newRoom}`,
      };
  }
}
