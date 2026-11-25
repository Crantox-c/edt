import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_GROUP_ID = "15824860"; // BUT2_ESEA
export const PRELOAD_WEEK_OFFSETS = [-1, 0, 1, 2, 3, 4, 5, 6] as const;
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const TZ_PARIS = "Europe/Paris";
const KINDS = new Set<string>(["TUT", "DS", "TP", "TD", "CM"]);

const STORAGE_KEYS = {
  GROUPS: "geii_groups_v2",
  SELECTED_GROUP: "geii_selected_group_v2",
  API_BASE: "geii_api_base_v2",
  EVENTS: (groupId: string) => `geii_events_v2_${groupId}`,
};

export type CourseKind = "TUT" | "DS" | "TP" | "TD" | "CM";

export type Course = {
  key: string; // début|fin|titre|salle (préserve les notes perso & comparaison inter-synchros)
  apiId?: string;
  start: number; // epoch ms
  end: number; // epoch ms
  title: string; // intitulé brut de l'API
  subject: string; // lettres initiales (AN, SAE, ELEN...)
  promo: string | null; // ESE / ESEA / EME / A2I si présent dans le titre
  kind: CourseKind | null; // TUT | DS | TP | TD | CM uniquement si explicite
  tags: string[];
  teacher: string | null;
  room: string | null;
  extraLines: string[];
};

export type RawGroupNode = {
  id: number | string;
  text: string;
  item?: RawGroupNode[];
  children?: RawGroupNode[];
};

export type FlatGroup = {
  id: string;
  text: string;
  codes: string[]; // [groupId, parent1, parent2, ..., rootId]
  path: string[];
  section: string;
};

export type GeiiGroupSection = {
  title: string;
  data: FlatGroup[];
};

export type RawSeance = {
  id: number | string;
  start_date: string;
  end_date: string;
  text: string;
  color?: string;
  textColor?: string;
};

export type CachedGroupEvents = {
  courses: Course[];
  loadedMondays: string[];
  lastSync: number | null;
};

export type CourseChanges = {
  added: Course[];
  removed: Course[];
};

export type GeiiSyncResult = {
  courses: Course[];
  loadedMondays: string[];
  lastSync: number | null;
  error?: string;
  changes: CourseChanges;
  stale: boolean;
};

/**
 * Snapshot vérifié de Groupes.php (42 classes GEII).
 * Utilisé uniquement en repli si le tout premier chargement échoue hors-ligne.
 */
export const FALLBACK_GROUPS_TREE: RawGroupNode[] = [
  {
    id: 15824539,
    text: "IUT-A",
    item: [
      {
        id: 15824833,
        text: "GEII",
        item: [
          {
            id: 15824815,
            text: "GEII_BUT1_S1",
            item: [
              {
                id: 15824821,
                text: "E11",
                item: [
                  { id: 15824947, text: "E11A" },
                  { id: 15824948, text: "E11B" },
                ],
              },
              {
                id: 15824822,
                text: "E12",
                item: [
                  { id: 15824949, text: "E12A" },
                  { id: 15824950, text: "E12B" },
                ],
              },
              {
                id: 15824823,
                text: "E13",
                item: [
                  { id: 15824951, text: "E13A" },
                  { id: 15824952, text: "E13B" },
                ],
              },
              {
                id: 15824824,
                text: "E14",
                item: [
                  { id: 15824953, text: "E14A" },
                  { id: 15824954, text: "E14B" },
                ],
              },
            ],
          },
          {
            id: 15824927,
            text: "GEII_BUT1_S2",
            item: [
              {
                id: 15824928,
                text: "E21",
                item: [
                  { id: 15824931, text: "E21A" },
                  { id: 15824932, text: "E21B" },
                ],
              },
              {
                id: 15824929,
                text: "E22",
                item: [
                  { id: 15824933, text: "E22A" },
                  { id: 15824934, text: "E22B" },
                ],
              },
              {
                id: 15824930,
                text: "E23",
                item: [
                  { id: 15824935, text: "E23A" },
                  { id: 15824936, text: "E23B" },
                ],
              },
              {
                id: 15824959,
                text: "E24",
                item: [{ id: 15824960, text: "E24A" }],
              },
            ],
          },
          {
            id: 15824817,
            text: "GEII_BUT2",
            item: [
              {
                id: 15824844,
                text: "BUT2_A2I",
                item: [
                  { id: 15824858, text: "BUT2_A2IA" },
                  { id: 15824859, text: "BUT2_A2IB" },
                ],
              },
              {
                id: 15824843,
                text: "BUT2_EME",
                item: [
                  { id: 15824856, text: "BUT2_EMEA" },
                  { id: 15824857, text: "BUT2_EMEB" },
                ],
              },
              {
                id: 15824845,
                text: "BUT2_ESE",
                item: [
                  { id: 15824860, text: "BUT2_ESEA" },
                  { id: 15824962, text: "BUT2_ESEB" },
                ],
              },
            ],
          },
          {
            id: 15824937,
            text: "GEII_BUT3",
            item: [
              {
                id: 15824963,
                text: "BUT3_A2I",
                item: [
                  { id: 15824966, text: "BUT3_A2IA" },
                  { id: 15824967, text: "BUT3_A2IB" },
                ],
              },
              {
                id: 15824964,
                text: "BUT3_EME",
                item: [
                  { id: 15824965, text: "BUT3_EMEA" },
                  { id: 15824968, text: "BUT3_EMEB" },
                ],
              },
              {
                id: 15824969,
                text: "BUT3_ESE",
                item: [
                  { id: 15824970, text: "BUT3_ESEA" },
                  { id: 15824971, text: "BUT3_ESEB" },
                ],
              },
            ],
          },
        ],
      },
      { id: 15824955, text: "HAB ELEC" },
      {
        id: 15824820,
        text: "LPMTG",
        item: [
          {
            id: 15824834,
            text: "MTG FA",
            item: [
              { id: 15824979, text: "MTG FA1" },
              { id: 15824980, text: "MTG FA2" },
            ],
          },
          { id: 15824836, text: "MTG FI" },
        ],
      },
      { id: 15824956, text: "LPROBOCOM" },
      {
        id: 15824981,
        text: "PLANNING_APP_BUT2-3",
        item: [
          { id: 15824987, text: "A2IA_BUT2" },
          { id: 15824982, text: "A2IA_BUT3" },
          { id: 15824988, text: "A2IB_BUT2" },
          { id: 15824983, text: "A2IB_BUT3" },
          { id: 15824989, text: "EMEA_BUT2" },
          { id: 15824984, text: "EMEA_BUT3" },
          { id: 15824990, text: "EMEB_BUT2" },
          { id: 15824986, text: "EMEB_BUT3" },
          { id: 15824991, text: "ESEA_BUT2" },
          { id: 15824985, text: "ESEA_BUT3" },
        ],
      },
    ],
  },
];

const parisDateIsoFormatter = new Intl.DateTimeFormat("fr-CA", {
  timeZone: TZ_PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ_PARIS,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/**
 * Convertit une date/heure murale Europe/Paris en epoch ms (gère l'heure d'été/hiver).
 */
export function parisToEpoch(
  y: number,
  mo: number,
  d: number,
  h = 0,
  mi = 0,
  s = 0
): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      parisPartsFormatter.formatToParts(new Date(guess)).map((x) => [x.type, Number(x.value)])
    );
    const seen = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    guess += wall - seen;
  }
  return guess;
}

export function parseApiDateTime(str: string): number | null {
  const m = String(str)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "0"] = m;
  const epoch = parisToEpoch(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s));
  return Number.isFinite(epoch) ? epoch : null;
}

export function getParisDateIso(epochMs: number): string {
  return parisDateIsoFormatter.format(new Date(epochMs));
}

function formatUtcNoonDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return formatUtcNoonDate(dt);
}

export function getParisMondayIso(epochMsOrDateStr?: number | string): string {
  const dateStr =
    typeof epochMsOrDateStr === "string"
      ? epochMsOrDateStr
      : getParisDateIso(epochMsOrDateStr ?? Date.now());
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  return formatUtcNoonDate(dt);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

/**
 * Découpe `<center>MATIÈRE<br>ENSEIGNANT<br>SALLE</center>` en conservant strictement
 * les emplacements vides pour ne jamais décaler la salle vers l'enseignant.
 */
export function parseSeanceText(html: string): {
  title: string;
  teacher: string | null;
  room: string | null;
  extraLines: string[];
} {
  const rawSegments = String(html ?? "")
    .replace(/<\/?center\b[^>]*>/gi, "")
    .split(/<br\s*\/?>/i);

  const cleaned = rawSegments.map((seg) =>
    decodeHtmlEntities(seg.replace(/<[^>]*>/g, ""))
      .replace(/\s+/g, " ")
      .trim()
  );

  return {
    title: cleaned[0] || "(sans titre)",
    teacher: cleaned[1] || null,
    room: cleaned[2] || null,
    extraLines: cleaned.slice(3).filter(Boolean),
  };
}

export function parseTitle(title: string): {
  subject: string;
  promo: string | null;
  kind: CourseKind | null;
  tags: string[];
} {
  const subject = (title.match(/^[A-Za-zÀ-ÿ]+/)?.[0] ?? title).toUpperCase();
  const tokens = title.split(/[_.\s-]+/).filter(Boolean);
  let promo: string | null = null;
  let kind: CourseKind | null = null;
  const tags: string[] = [];
  const seenTags = new Set<string>();

  for (const token of tokens.slice(1)) {
    const upper = token.toUpperCase();
    if (/^(?:ESE|EME|A2I|EII)[A-Z]?$/.test(upper)) {
      promo = upper;
    } else if (!kind && KINDS.has(upper)) {
      kind = upper as CourseKind;
    } else if (!seenTags.has(token)) {
      seenTags.add(token);
      tags.push(token);
    }
  }

  return { subject, promo, kind, tags };
}

export function isCourseDS(course: Pick<Course, "kind" | "title">): boolean {
  return (
    course.kind === "DS" || /(?:^|[_.\s-])DS(?:$|[_.\s-])/i.test(course.title)
  );
}

export function flattenGroups(
  nodes: RawGroupNode[] = [],
  ancestors: RawGroupNode[] = [],
  out: FlatGroup[] = []
): FlatGroup[] {
  for (const node of nodes) {
    if (!node) continue;
    const nodeId = Array.isArray(node.id)
      ? String(node.id[0] ?? "")
      : String(node.id ?? "");
    const children = node.item ?? node.children;

    if (Array.isArray(children) && children.length > 0) {
      const nextAncestors = nodeId === "0" ? ancestors : [...ancestors, node];
      flattenGroups(children, nextAncestors, out);
      continue;
    }

    if (!nodeId || nodeId === "0" || !node.text) continue;
    const path = ancestors.map((a) => String(a.text));
    const shortAnc = ancestors.filter((a) => a.text !== "IUT-A" && a.text !== "GEII");
    const section =
      shortAnc.map((a) => String(a.text)).join(" › ") ||
      path.join(" › ") ||
      "Autres";
    const codes = [
      nodeId,
      ...ancestors
        .map((a) => String(a.id))
        .filter((id) => id && id !== "0")
        .reverse(),
    ];

    out.push({
      id: nodeId,
      text: String(node.text).trim(),
      codes,
      path,
      section,
    });
  }
  return out;
}

export function groupBySection(groups: FlatGroup[]): GeiiGroupSection[] {
  const map = new Map<string, FlatGroup[]>();
  for (const g of groups) {
    const list = map.get(g.section);
    if (list) list.push(g);
    else map.set(g.section, [g]);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export const FALLBACK_FLAT_GROUPS: FlatGroup[] = flattenGroups(FALLBACK_GROUPS_TREE);
export const DEFAULT_GROUP: FlatGroup =
  FALLBACK_FLAT_GROUPS.find((g) => g.id === DEFAULT_GROUP_ID) ??
  FALLBACK_FLAT_GROUPS[0];

export function getAcademicYearForDate(epochMs = Date.now()): number {
  const iso = getParisDateIso(epochMs);
  const [yStr, mStr] = iso.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 2026;
  }
  return month >= 8 ? year : year - 1;
}

export function buildDefaultApiBaseForYear(year: number): string {
  return `https://www.iuta-geii.univ-lille.fr/${year}/students`;
}

export function getDefaultApiBase(epochMs = Date.now()): string {
  return buildDefaultApiBaseForYear(getAcademicYearForDate(epochMs));
}

export const DEFAULT_API_BASE = getDefaultApiBase();

let resolvedDefaultApiBase: string | null = null;

export function resetResolvedDefaultApiBase(): void {
  resolvedDefaultApiBase = null;
}

export type ApiBaseUrlValidation =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function validateApiBaseUrl(raw?: string | null): ApiBaseUrlValidation {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return { ok: true, normalized: getDefaultApiBase() };
  }
  const isHttps = /^https:\/\/[^\s/$.?#][^\s]*$/i.test(trimmed);
  const isLocalDevHttp =
    /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s]*)?$/i.test(trimmed);
  if (!isHttps && !isLocalDevHttp) {
    return {
      ok: false,
      error:
        "URL invalide : utilisez https:// (ou http://localhost pour un proxy local).",
    };
  }
  return { ok: true, normalized: trimmed };
}

export function normalizeBaseUrl(raw?: string | null): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  return trimmed || getDefaultApiBase();
}

function getCandidateBaseUrls(baseUrl: string): string[] {
  const normalized = normalizeBaseUrl(baseUrl);
  const defaultBase = getDefaultApiBase();
  if (normalized !== defaultBase) {
    return [normalized];
  }

  const academicYear = getAcademicYearForDate();
  const rawList = [
    resolvedDefaultApiBase,
    defaultBase,
    buildDefaultApiBaseForYear(academicYear + 1),
    buildDefaultApiBaseForYear(academicYear - 1),
  ].filter((x): x is string => Boolean(x));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of rawList) {
    if (!seen.has(item)) {
      seen.add(item);
      unique.push(item);
    }
  }
  return unique;
}

export function isSyncStale(
  lastSync: number | null,
  maxAgeMs = STALE_AFTER_MS,
  nowMs = Date.now()
): boolean {
  if (lastSync === null) return false;
  return nowMs - lastSync > maxAgeMs;
}

function parseRawSeance(raw: RawSeance): Course | null {
  if (!raw || !raw.start_date || !raw.end_date) return null;
  const start = parseApiDateTime(raw.start_date);
  const end = parseApiDateTime(raw.end_date);
  if (start === null || end === null || end <= start) return null;

  const { title, teacher, room, extraLines } = parseSeanceText(raw.text);
  const parsed = parseTitle(title);

  return {
    key: `${start}|${end}|${title}|${room ?? ""}`,
    apiId: raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined,
    start,
    end,
    title,
    room,
    teacher,
    extraLines,
    ...parsed,
  };
}

function richnessScore(c: Course): number {
  return (c.teacher ? 2 : 0) + (c.room ? 2 : 0) + c.extraLines.length;
}

export function dedupeAndSortCourses(list: Course[]): Course[] {
  const byKey = new Map<string, Course>();
  for (const course of list) {
    const existing = byKey.get(course.key);
    if (!existing || richnessScore(course) > richnessScore(existing)) {
      byKey.set(course.key, course);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title)
  );
}

export function diffCourses(before: Course[], after: Course[]): CourseChanges {
  const prevKeys = new Set(before.map((c) => c.key));
  const nextKeys = new Set(after.map((c) => c.key));
  return {
    added: after.filter((c) => !prevKeys.has(c.key)),
    removed: before.filter((c) => !nextKeys.has(c.key)),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 12000,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort);
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

export async function fetchGroups(
  baseUrl = getDefaultApiBase(),
  signal?: AbortSignal
): Promise<FlatGroup[]> {
  const candidates = getCandidateBaseUrls(baseUrl);
  const normalizedInput = normalizeBaseUrl(baseUrl);
  const isDefault = normalizedInput === getDefaultApiBase();

  let res: Response | null = null;
  let usedBase = candidates[0];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const attempt = await fetchWithTimeout(
      `${candidate}/Groupes.php`,
      { method: "GET" },
      12000,
      signal
    );
    if (attempt.status === 404 && i < candidates.length - 1) {
      continue;
    }
    res = attempt;
    usedBase = candidate;
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`Groupes.php HTTP ${res?.status ?? "404"}`);
  }
  if (isDefault) {
    resolvedDefaultApiBase = usedBase;
  }

  const rawText = await res.text();
  if (!rawText.trim()) {
    throw new Error("Réponse vide de Groupes.php");
  }
  const parsed = JSON.parse(rawText) as
    | RawGroupNode[]
    | { item?: RawGroupNode[] };
  const roots = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.item)
      ? parsed.item
      : [];
  const flat = flattenGroups(roots);
  if (flat.length === 0) {
    throw new Error("Aucun groupe trouvé dans Groupes.php");
  }
  await saveCachedGroups(flat);
  return flat;
}

export async function fetchWeekSeances(
  mondayIso: string,
  codes: string[],
  baseUrl = getDefaultApiBase(),
  signal?: AbortSignal
): Promise<Course[]> {
  const candidates = getCandidateBaseUrls(baseUrl);
  const normalizedInput = normalizeBaseUrl(baseUrl);
  const isDefault = normalizedInput === getDefaultApiBase();

  // Encodage manuel sûr sur Hermes (sans dépendance au polyfill URLSearchParams)
  const body =
    `monday=${encodeURIComponent(mondayIso)}` +
    `&ressource=${encodeURIComponent(JSON.stringify(codes))}`;

  let res: Response | null = null;
  let usedBase = candidates[0];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const attempt = await fetchWithTimeout(
      `${candidate}/Seances.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
        },
        body,
      },
      12000,
      signal
    );
    if (attempt.status === 404 && i < candidates.length - 1) {
      continue;
    }
    res = attempt;
    usedBase = candidate;
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`Seances.php HTTP ${res?.status ?? "404"} (${mondayIso})`);
  }
  if (isDefault) {
    resolvedDefaultApiBase = usedBase;
  }

  const rawText = await res.text();
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Format inattendu Seances.php (${mondayIso})`);
  }

  const out: Course[] = [];
  for (const item of parsed as RawSeance[]) {
    const course = parseRawSeance(item);
    if (course) out.push(course);
  }
  return out;
}

export async function loadCachedGroups(): Promise<FlatGroup[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as FlatGroup[]) : null;
  } catch {
    return null;
  }
}

export async function saveCachedGroups(groups: FlatGroup[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.warn("Erreur sauvegarde groupes GEII:", e);
  }
}

export async function loadSelectedGroupId(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_GROUP)) || DEFAULT_GROUP_ID;
  } catch {
    return DEFAULT_GROUP_ID;
  }
}

export async function saveSelectedGroupId(groupId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, groupId);
  } catch (e) {
    console.warn("Erreur sauvegarde groupe actif:", e);
  }
}

export async function loadApiBaseUrl(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE);
    if (!raw) return getDefaultApiBase();
    const validation = validateApiBaseUrl(raw);
    return validation.ok ? validation.normalized : getDefaultApiBase();
  } catch {
    return getDefaultApiBase();
  }
}

export async function saveApiBaseUrl(baseUrl: string): Promise<string> {
  const validation = validateApiBaseUrl(baseUrl);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const normalized = validation.normalized;
  const defaultBase = getDefaultApiBase();
  try {
    if (normalized === defaultBase) {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.API_BASE, normalized);
    }
  } catch (e) {
    console.warn("Erreur sauvegarde URL API GEII:", e);
  }
  return normalized;
}

export async function loadCachedGroupEvents(
  groupId: string
): Promise<CachedGroupEvents> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS(groupId));
    if (!raw) return { courses: [], loadedMondays: [], lastSync: null };
    const parsed = JSON.parse(raw) as Partial<CachedGroupEvents>;
    const rawCourses = Array.isArray(parsed.courses) ? parsed.courses : [];
    const normalizedCourses: Course[] = rawCourses.map((c) => ({
      ...c,
      teacher: c.teacher ?? null,
      room: c.room ?? null,
      promo: c.promo ?? null,
      kind: c.kind ?? null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      extraLines: Array.isArray(c.extraLines) ? c.extraLines : [],
    }));
    return {
      courses: dedupeAndSortCourses(normalizedCourses),
      loadedMondays: Array.isArray(parsed.loadedMondays)
        ? parsed.loadedMondays.filter((x): x is string => typeof x === "string")
        : [],
      lastSync: typeof parsed.lastSync === "number" ? parsed.lastSync : null,
    };
  } catch {
    return { courses: [], loadedMondays: [], lastSync: null };
  }
}

export async function saveCachedGroupEvents(
  groupId: string,
  payload: CachedGroupEvents
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS(groupId), JSON.stringify(payload));
  } catch (e) {
    console.warn("Erreur sauvegarde cache classe GEII:", e);
  }
}

/**
 * Synchronise la fenêtre de base (-1 à +6 semaines autour de la semaine courante)
 * pour une classe donnée, tout en conservant les semaines lointaines déjà visitées
 * et sans jamais écraser un cache valide sur erreur réseau.
 */
export async function syncGroupSchedule(
  group: FlatGroup,
  baseUrl = getDefaultApiBase(),
  signal?: AbortSignal
): Promise<GeiiSyncResult> {
  const cached = await loadCachedGroupEvents(group.id);
  const currentMonday = getParisMondayIso(Date.now());
  const targetMondays = PRELOAD_WEEK_OFFSETS.map((offset) =>
    addDaysIso(currentMonday, offset * 7)
  );

  const settled = await Promise.allSettled(
    targetMondays.map(async (mondayIso) => ({
      mondayIso,
      courses: await fetchWeekSeances(mondayIso, group.codes, baseUrl, signal),
    }))
  );

  const succeededMondays = new Set<string>();
  const freshCourses: Course[] = [];
  const errors: string[] = [];

  for (const res of settled) {
    if (res.status === "fulfilled") {
      succeededMondays.add(res.value.mondayIso);
      freshCourses.push(...res.value.courses);
    } else {
      const msg = String((res.reason as Error)?.message ?? res.reason);
      errors.push(msg);
    }
  }

  // Échec complet : conserver intégralement le cache local existant
  if (succeededMondays.size === 0) {
    return {
      courses: cached.courses,
      loadedMondays: cached.loadedMondays,
      lastSync: cached.lastSync,
      error: errors[0] || "Erreur réseau",
      changes: { added: [], removed: [] },
      stale: isSyncStale(cached.lastSync),
    };
  }

  // Remplacer uniquement les semaines qui ont répondu avec succès, garder les autres en cache
  const retainedOld = cached.courses.filter(
    (c) => !succeededMondays.has(getParisMondayIso(c.start))
  );
  const mergedCourses = dedupeAndSortCourses([...retainedOld, ...freshCourses]);

  // Garde anti-écrasement si réponse partielle anormalement vide alors qu'un cache non vide existait
  if (
    succeededMondays.size < targetMondays.length &&
    mergedCourses.length === 0 &&
    cached.courses.length > 0
  ) {
    return {
      courses: cached.courses,
      loadedMondays: cached.loadedMondays,
      lastSync: cached.lastSync,
      error: errors[0] || "Synchronisation partielle",
      changes: { added: [], removed: [] },
      stale: isSyncStale(cached.lastSync),
    };
  }

  const loadedMondaysSet = new Set<string>([
    ...cached.loadedMondays,
    ...Array.from(succeededMondays),
  ]);
  const loadedMondays = Array.from(loadedMondaysSet).sort();
  const now = Date.now();

  await saveCachedGroupEvents(group.id, {
    courses: mergedCourses,
    loadedMondays,
    lastSync: now,
  });

  // Calculer les changements uniquement sur les semaines qui étaient déjà synchronisées
  const cachedMondaySet = new Set(cached.loadedMondays);
  const comparableBefore = cached.courses.filter((c) => {
    const monday = getParisMondayIso(c.start);
    return succeededMondays.has(monday) && cachedMondaySet.has(monday);
  });
  const comparableAfter = mergedCourses.filter((c) => {
    const monday = getParisMondayIso(c.start);
    return succeededMondays.has(monday) && cachedMondaySet.has(monday);
  });

  const changes =
    cached.lastSync !== null && cached.courses.length > 0
      ? diffCourses(comparableBefore, comparableAfter)
      : { added: [], removed: [] };

  return {
    courses: mergedCourses,
    loadedMondays,
    lastSync: now,
    error: errors.length > 0 ? errors[0] : undefined,
    changes,
    stale: false,
  };
}

/**
 * Charge une semaine spécifique à la demande (hors fenêtre -1..+6 semaines)
 * et la fusionne dans le cache de la classe sans marquer les cours comme modifiés.
 */
export async function fetchAndMergeWeek(
  group: FlatGroup,
  mondayIso: string,
  baseUrl = getDefaultApiBase(),
  signal?: AbortSignal
): Promise<CachedGroupEvents> {
  const weekCourses = await fetchWeekSeances(mondayIso, group.codes, baseUrl, signal);
  const cached = await loadCachedGroupEvents(group.id);
  const retained = cached.courses.filter(
    (c) => getParisMondayIso(c.start) !== mondayIso
  );
  const merged = dedupeAndSortCourses([...retained, ...weekCourses]);
  const loadedMondays = Array.from(
    new Set([...cached.loadedMondays, mondayIso])
  ).sort();
  const nextCache: CachedGroupEvents = {
    courses: merged,
    loadedMondays,
    lastSync: cached.lastSync ?? Date.now(),
  };
  await saveCachedGroupEvents(group.id, nextCache);
  return nextCache;
}
