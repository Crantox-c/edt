import { Course } from "./ics";

export type FilterCriteria = {
  searchQuery: string;
  selectedPromo: string | null;
  selectedKind: string | null;
  selectedSubject: string | null;
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
  selectedTag: null,
  selectedRoom: null,
  selectedFloor: null,
  hiddenSubjects: [],
};

export type AvailableFilters = {
  promos: string[];
  kinds: string[];
  subjects: string[];
  tags: string[];
  rooms: string[];
  floors: string[];
};

/**
 * Extrait dynamiquement toutes les valeurs de filtres présentes dans le flux.
 * Aucune valeur n'est codée en dur.
 */
export function extractAvailableFilters(courses: Course[]): AvailableFilters {
  const promos = new Set<string>();
  const kinds = new Set<string>();
  const subjects = new Set<string>();
  const tags = new Set<string>();
  const rooms = new Set<string>();
  const floors = new Set<string>();

  for (const c of courses) {
    if (c.promo) promos.add(c.promo);
    if (c.kind) kinds.add(c.kind);
    if (c.subject) subjects.add(c.subject);
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
    tags: Array.from(tags).sort(),
    rooms: Array.from(rooms).sort(),
    floors: Array.from(floors).sort(),
  };
}

/**
 * Filtre les cours selon les critères combinables et la recherche.
 * Règle AGENTS.md : un filtre sauvegardé dont la valeur n'existe plus dans le flux est ignoré.
 */
export function filterCourses(
  courses: Course[],
  criteria: FilterCriteria,
  available: AvailableFilters
): Course[] {
  // Vérification de validité des filtres par rapport aux valeurs actuelles du flux
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
    // 1. Matière masquée ?
    if (hiddenSet.has(course.subject)) {
      return false;
    }

    // 2. Filtre promo
    if (validPromo && course.promo !== validPromo) {
      return false;
    }

    // 3. Filtre type / kind
    if (validKind && course.kind !== validKind) {
      return false;
    }

    // 4. Filtre matière sélectionnée
    if (validSubject && course.subject !== validSubject) {
      return false;
    }

    // 5. Filtre tag / sous-groupe
    if (validTag && !course.tags.includes(validTag)) {
      return false;
    }

    // 6. Filtre salle
    if (validRoom && course.room !== validRoom) {
      return false;
    }

    // 7. Filtre étage (premier chiffre de la salle)
    if (validFloor) {
      if (!course.room || !course.room.startsWith(validFloor)) {
        return false;
      }
    }

    // 8. Recherche textuelle multi-termes insensible à la casse
    if (searchTerms.length > 0) {
      const roomStr = course.room ?? "";
      const tagsStr = course.tags.join(" ");
      const promoStr = course.promo ?? "";
      const kindStr = course.kind ?? "";
      const haystack = `${course.title} ${roomStr} ${course.subject} ${promoStr} ${kindStr} ${tagsStr}`.toLowerCase();

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
  if (criteria.selectedTag) count++;
  if (criteria.selectedRoom) count++;
  if (criteria.selectedFloor) count++;
  if (criteria.hiddenSubjects.length > 0) count += criteria.hiddenSubjects.length;
  return count;
}
