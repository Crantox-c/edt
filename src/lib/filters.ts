import type { Course } from "./geii-api";

export type FilterCriteria = {
  searchQuery: string;
  selectedPromo: string | null;
  selectedKind: string | null;
  selectedSubject: string | null;
  selectedTeacher: string | null;
  selectedTag: string | null;
  selectedRoom: string | null;
  selectedFloor: string | null;
  hiddenSubjects: string[];
};

export const DEFAULT_FILTERS: FilterCriteria = {
  searchQuery: "",
  selectedPromo: null,
  selectedKind: null,
  selectedSubject: null,
  selectedTeacher: null,
  selectedTag: null,
  selectedRoom: null,
  selectedFloor: null,
  hiddenSubjects: [],
};

export type AvailableFilters = {
  promos: string[];
  kinds: string[];
  subjects: string[];
  teachers: string[];
  tags: string[];
  rooms: string[];
  floors: string[];
};

/**
 * Extrait dynamiquement toutes les valeurs de filtres présentes dans les séances.
 * Aucune valeur n'est codée en dur.
 */
export function extractAvailableFilters(courses: Course[]): AvailableFilters {
  const promos = new Set<string>();
  const kinds = new Set<string>();
  const subjects = new Set<string>();
  const teachers = new Set<string>();
  const tags = new Set<string>();
  const rooms = new Set<string>();
  const floors = new Set<string>();

  for (const c of courses) {
    if (c.promo) promos.add(c.promo);
    if (c.kind) kinds.add(c.kind);
    if (c.subject) subjects.add(c.subject);
    if (c.teacher) teachers.add(c.teacher);
    for (const t of c.tags) {
      if (t) tags.add(t);
    }
    if (c.room) {
      rooms.add(c.room);
      const m = c.room.match(/^(\d)/);
      if (m) floors.add(m[1]);
    }
  }

  return {
    promos: Array.from(promos).sort(),
    kinds: Array.from(kinds).sort(),
    subjects: Array.from(subjects).sort(),
    teachers: Array.from(teachers).sort((a, b) => a.localeCompare(b, "fr")),
    tags: Array.from(tags).sort(),
    rooms: Array.from(rooms).sort(),
    floors: Array.from(floors).sort(),
  };
}

/**
 * Filtre les cours selon les critères combinables et la recherche.
 * Règle AGENTS.md : un filtre sauvegardé dont la valeur n'existe plus est ignoré.
 */
export function filterCourses(
  courses: Course[],
  criteria: FilterCriteria,
  available: AvailableFilters
): Course[] {
  const validPromo =
    criteria.selectedPromo && available.promos.includes(criteria.selectedPromo)
      ? criteria.selectedPromo
      : null;

  const validKind =
    criteria.selectedKind && available.kinds.includes(criteria.selectedKind)
      ? criteria.selectedKind
      : null;

  const validSubject =
    criteria.selectedSubject && available.subjects.includes(criteria.selectedSubject)
      ? criteria.selectedSubject
      : null;

  const validTeacher =
    criteria.selectedTeacher && available.teachers.includes(criteria.selectedTeacher)
      ? criteria.selectedTeacher
      : null;

  const validTag =
    criteria.selectedTag && available.tags.includes(criteria.selectedTag)
      ? criteria.selectedTag
      : null;

  const validRoom =
    criteria.selectedRoom && available.rooms.includes(criteria.selectedRoom)
      ? criteria.selectedRoom
      : null;

  const validFloor =
    criteria.selectedFloor && available.floors.includes(criteria.selectedFloor)
      ? criteria.selectedFloor
      : null;

  const hiddenSet = new Set(criteria.hiddenSubjects);
  const searchTerms = criteria.searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return courses.filter((course) => {
    if (hiddenSet.has(course.subject)) {
      return false;
    }
    if (validPromo && course.promo !== validPromo) {
      return false;
    }
    if (validKind && course.kind !== validKind) {
      return false;
    }
    if (validSubject && course.subject !== validSubject) {
      return false;
    }
    if (validTeacher && course.teacher !== validTeacher) {
      return false;
    }
    if (validTag && !course.tags.includes(validTag)) {
      return false;
    }
    if (validRoom && course.room !== validRoom) {
      return false;
    }
    if (validFloor) {
      if (!course.room || !course.room.startsWith(validFloor)) {
        return false;
      }
    }

    if (searchTerms.length > 0) {
      const roomStr = course.room ?? "";
      const teacherStr = course.teacher ?? "";
      const tagsStr = course.tags.join(" ");
      const promoStr = course.promo ?? "";
      const kindStr = course.kind ?? "";
      const haystack = `${course.title} ${teacherStr} ${roomStr} ${course.subject} ${promoStr} ${kindStr} ${tagsStr}`.toLowerCase();

      for (const term of searchTerms) {
        if (!haystack.includes(term)) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Calcule le nombre de filtres actifs (hors recherche textuelle).
 */
export function countActiveFilters(criteria: FilterCriteria): number {
  let count = 0;
  if (criteria.selectedPromo) count++;
  if (criteria.selectedKind) count++;
  if (criteria.selectedSubject) count++;
  if (criteria.selectedTeacher) count++;
  if (criteria.selectedTag) count++;
  if (criteria.selectedRoom) count++;
  if (criteria.selectedFloor) count++;
  if (criteria.hiddenSubjects.length > 0) count += criteria.hiddenSubjects.length;
  return count;
}
