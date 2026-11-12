import { useSyncExternalStore } from "react";

let currentTime = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function startTimerIfNeeded() {
  if (timer === null && typeof setInterval !== "undefined") {
    currentTime = Date.now();
    timer = setInterval(() => {
      currentTime = Date.now();
      listeners.forEach((l) => l());
    }, 15000);
  }
}

function stopTimerIfEmpty() {
  if (listeners.size === 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startTimerIfNeeded();
  return () => {
    listeners.delete(listener);
    stopTimerIfEmpty();
  };
}

function getSnapshot() {
  if (currentTime === 0) {
    currentTime = Date.now();
  }
  return currentTime;
}

/**
 * Hook retournant l'epoch ms actuel mis à jour automatiquement toutes les 15s.
 * Utilise useSyncExternalStore pour respecter la pureté de rendu React 19.
 */
export function useCurrentTime(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
