import { Course, diffCourses, parseIcs } from "./ics";

// À implémenter avec AsyncStorage ou expo-file-system (stockage partagé App Group pour les widgets).
export interface KV { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void>; }

export type SyncResult = {
  courses: Course[];
  fromCache: boolean;       // true si le réseau a échoué ou rien n'a changé
  lastSync: number | null;  // epoch ms du dernier fetch réussi
  changes: { added: Course[]; removed: Course[] };
  error?: string;
};

const K = { body: "ics:body", etag: "ics:etag", last: "ics:last" };

// Appeler à chaque ouverture / retour au premier plan. Ne vide jamais le cache sur erreur.
export async function syncIcs(url: string, kv: KV, signal?: AbortSignal): Promise<SyncResult> {
  const cached = await kv.get(K.body);
  const before = cached ? parseIcs(cached) : [];
  const last = Number(await kv.get(K.last)) || null;
  const none = { added: [], removed: [] };
  try {
    const etag = await kv.get(K.etag);
    const res = await fetch(url, { headers: etag ? { "If-None-Match": etag } : {}, signal });
    if (res.status === 304) {
      const now = Date.now(); await kv.set(K.last, String(now));
      return { courses: before, fromCache: true, lastSync: now, changes: none };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    const courses = parseIcs(body);
    if (!body.includes("BEGIN:VCALENDAR")) throw new Error("Flux invalide");
    if (courses.length === 0 && before.length > 0) throw new Error("Flux vide, cache conservé");
    const now = Date.now();
    await kv.set(K.body, body);
    await kv.set(K.last, String(now));
    const newEtag = res.headers.get("etag"); if (newEtag) await kv.set(K.etag, newEtag);
    return { courses, fromCache: false, lastSync: now, changes: cached ? diffCourses(before, courses) : none };
  } catch (e) {
    return { courses: before, fromCache: true, lastSync: last, changes: none, error: String((e as Error).message ?? e) };
  }
}

export const isStale = (lastSync: number | null, maxAgeMs = 24 * 3600 * 1000) =>
  lastSync === null || Date.now() - lastSync > maxAgeMs;

export const DEFAULT_ICS_URL =
  "https://www.iuta-geii.univ-lille.fr/calendar/ICS_ETU/GEII+GEII_BUT2+BUT2_ESE+BUT2_ESEA.ics";

export async function getCachedCourses(kv: KV): Promise<{ courses: Course[]; lastSync: number | null }> {
  const cached = await kv.get(K.body);
  const courses = cached ? parseIcs(cached) : [];
  const last = Number(await kv.get(K.last)) || null;
  return { courses, lastSync: last };
}
