import AsyncStorage from "@react-native-async-storage/async-storage";

const SUBJECT_DICT_STORAGE_KEY = "app:subject_dictionary_v1";

/**
 * Dictionnaire optionnel éditable par l'utilisateur (Section 3 d'AGENTS.md).
 * Si un code matière est absent du dictionnaire, l'UI affiche le code brut.
 */
export const DEFAULT_SUBJECT_NAMES: Record<string, string> = {
  AN: "Anglais",
  ENER: "Énergie",
  SAE: "Projet SAÉ",
  INFO: "Informatique",
  OML: "Outils Mathématiques & Logiques",
  VE: "Vérification & Évaluation",
  AUTO: "Automatique",
  ELEC: "Électronique",
  RES: "Réseaux",
  COMM: "Communication",
  PPP: "Projet Personnel & Professionnel",
};

let memoryCache: Record<string, string> = { ...DEFAULT_SUBJECT_NAMES };
const listeners = new Set<() => void>();
let initialized = false;

function notify() {
  listeners.forEach((l) => l());
}

export async function initSubjectDictionary(): Promise<Record<string, string>> {
  if (initialized) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(SUBJECT_DICT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      memoryCache = { ...DEFAULT_SUBJECT_NAMES, ...parsed };
    }
  } catch (e) {
    console.warn("Erreur lecture dictionnaire matières:", e);
  } finally {
    initialized = true;
    notify();
  }
  return memoryCache;
}

export function getSubjectDictionarySnapshot(): Record<string, string> {
  if (!initialized) {
    initSubjectDictionary();
  }
  return memoryCache;
}

export function subscribeSubjectDictionary(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setSubjectCustomName(
  code: string,
  readableName: string
): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = readableName.trim();
  if (!cleanCode) return;

  const next = { ...memoryCache };
  if (!cleanName) {
    delete next[cleanCode];
  } else {
    next[cleanCode] = cleanName;
  }
  memoryCache = next;
  notify();

  try {
    await AsyncStorage.setItem(SUBJECT_DICT_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("Erreur sauvegarde dictionnaire matières:", e);
  }
}

export async function resetSubjectDictionary(): Promise<void> {
  memoryCache = { ...DEFAULT_SUBJECT_NAMES };
  notify();
  try {
    await AsyncStorage.removeItem(SUBJECT_DICT_STORAGE_KEY);
  } catch (e) {
    console.warn("Erreur reset dictionnaire matières:", e);
  }
}

/**
 * Retourne le nom lisible si présent dans le dictionnaire, sinon null.
 */
export function resolveSubjectReadableName(
  subjectCode: string,
  dict: Record<string, string> = memoryCache
): string | null {
  const key = subjectCode.trim().toUpperCase();
  return dict[key] ?? null;
}
