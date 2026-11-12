// Parseur ICS minimal, sans dépendance. Aucune donnée en dur : tout vient du flux.

export type Course = {
  key: string;            // clé de comparaison entre deux synchros (les UID changent à chaque export)
  start: number;          // epoch ms
  end: number;            // epoch ms
  title: string;          // titre brut du flux, toujours conservé
  room: string | null;    // null si LOCATION vide
  subject: string;        // lettres initiales du titre (AN3_ESE -> AN)
  promo: string | null;   // dernier segment de type ESE / ESEA / ESEB
  kind: "TUT" | "DS" | "TP" | "TD" | "CM" | null; // null = inconnu, on n'invente pas
  tags: string[];         // segments restants (DG, TL, AV, A, B...), non interprétés
};

const TZ = "Europe/Paris";
const KINDS = new Set(["TUT", "DS", "TP", "TD", "CM"]);

// Convertit une heure "murale" Europe/Paris en epoch ms (gère l'heure d'été).
function parisToEpoch(y: number, mo: number, d: number, h: number, mi: number, s: number): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  });
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, +x.value]));
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += wall - seen;
  }
  return guess;
}

function parseDate(value: string, params: string): number | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d, h = "0", mi = "0", s = "0"] = m.slice(1, 7);
  if (m[7] === "Z") return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  // TZID absent ou Europe/Paris : on traite comme heure locale Paris
  void params;
  return parisToEpoch(+y, +mo, +d, +h, +mi, +s);
}

const unescape = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

export function parseTitle(title: string) {
  const subject = (title.match(/^[A-Za-zÀ-ÿ]+/)?.[0] ?? title).toUpperCase();
  const tokens = title.split("_");
  let promo: string | null = null;
  let kind: Course["kind"] = null;
  const tags: string[] = [];
  tokens.slice(1).forEach((t) => {
    const u = t.toUpperCase();
    if (/^ESE[A-Z]?$/.test(u)) promo = u;                 // ESE, ESEA, ESEB... n'importe où après le 1er segment
    else if (!kind && KINDS.has(u)) kind = u as Course["kind"];
    else tags.push(t);
  });
  return { subject, promo, kind, tags };
}

export function parseIcs(text: string): Course[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: Course[] = [];
  let cur: Record<string, { v: string; p: string }> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur?.DTSTART && cur?.DTEND) {
        const start = parseDate(cur.DTSTART.v, cur.DTSTART.p);
        const end = parseDate(cur.DTEND.v, cur.DTEND.p);
        if (start !== null && end !== null) {
          const title = unescape(cur.SUMMARY?.v ?? "") || "(sans titre)";
          const room = unescape(cur.LOCATION?.v ?? "") || null;
          out.push({ key: `${start}|${end}|${title}|${room ?? ""}`, start, end, title, room, ...parseTitle(title) });
        }
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(";");
    cur[name.toUpperCase()] = { v: line.slice(i + 1), p: params.join(";") };
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function diffCourses(before: Course[], after: Course[]) {
  const a = new Set(before.map((c) => c.key));
  const b = new Set(after.map((c) => c.key));
  return {
    added: after.filter((c) => !a.has(c.key)),
    removed: before.filter((c) => !b.has(c.key)),
  };
}
