import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTES_STORAGE_KEY = "app:course_notes_v1";

let notesCache: Record<string, string> = {};
let initialized = false;
let initStarted = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export async function initCourseNotes(): Promise<Record<string, string>> {
  if (initialized) return notesCache;
  initStarted = true;
  try {
    const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (raw) {
      notesCache = JSON.parse(raw) as Record<string, string>;
    }
  } catch (e) {
    console.warn("Erreur chargement notes de cours:", e);
  } finally {
    initialized = true;
    notify();
  }
  return notesCache;
}

export function getCourseNotesSnapshot(): Record<string, string> {
  return notesCache;
}

export function subscribeCourseNotes(listener: () => void): () => void {
  listeners.add(listener);
  if (!initStarted) {
    initStarted = true;
    void initCourseNotes();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function saveCourseNote(
  courseKey: string,
  noteText: string
): Promise<void> {
  const trimmed = noteText.trim();
  const next = { ...notesCache };
  if (!trimmed) {
    delete next[courseKey];
  } else {
    next[courseKey] = trimmed;
  }
  initStarted = true;
  initialized = true;
  notesCache = next;
  notify();
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("Erreur sauvegarde note de cours:", e);
  }
}
