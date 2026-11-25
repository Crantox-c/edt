import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatTime, getParisDateString } from "./dates";
import { Course, addDaysIso, isCourseDS, parisToEpoch } from "./geii-api";

// Configuration du gestionnaire de notifications pour le premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationSettings = {
  enabled: boolean;
  leadTimeMinutes: number;       // Délai avant le cours (5, 10, 15, 30 min)
  morningBriefingEnabled: boolean; // Résumé du matin
  morningBriefingTime: string;   // Heure du résumé "HH:mm" (ex: "07:30")
  dsSpecialAlert: boolean;       // Alerte veille de DS
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  leadTimeMinutes: 15,
  morningBriefingEnabled: true,
  morningBriefingTime: "07:30",
  dsSpecialAlert: true,
};

const SETTINGS_STORAGE_KEY = "app:notification_settings_v1";

// Limite stricte iOS : 64 notifications locales programmées.
// On plafonne à 50 pour laisser une marge de sécurité.
export const MAX_IOS_NOTIFICATIONS = 50;

/**
 * Charge les paramètres de notifications depuis AsyncStorage.
 */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Erreur chargement réglages notifications:", e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Sauvegarde les paramètres de notifications.
 */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Erreur sauvegarde réglages notifications:", e);
  }
}

/**
 * Demande les permissions de notifications système.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (e) {
    console.warn("Erreur demande permissions notifications:", e);
    return false;
  }
}

export function parseMorningBriefingTime(value: string): {
  hour: number;
  minute: number;
} {
  const parts = String(value ?? "").trim().split(":");
  const h = parts.length >= 1 && parts[0] !== "" ? Number(parts[0]) : NaN;
  const m = parts.length >= 2 && parts[1] !== "" ? Number(parts[1]) : NaN;
  return {
    hour: Number.isInteger(h) && h >= 0 && h <= 23 ? h : 7,
    minute: Number.isInteger(m) && m >= 0 && m <= 59 ? m : 30,
  };
}

/**
 * Annule puis recrée les notifications locales à venir.
 * Règle AGENTS.md :
 * "annuler puis recréer les notifications locales (limite iOS : 64 en attente, ne programmer que les prochains jours)"
 */
export async function scheduleAllNotifications(
  courses: Course[],
  settings: NotificationSettings,
  now = Date.now()
): Promise<number> {
  if (Platform.OS === "web") {
    return 0;
  }

  try {
    if (!settings.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return 0;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return 0;
    }

    // 1. Annulation préalable de toutes les notifications en attente
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Filtrer les cours futurs triés chronologiquement
    const upcomingCourses = courses
      .filter((c) => c.start > now)
      .sort((a, b) => a.start - b.start);

    type NotificationCandidate = {
      triggerMs: number;
      priority: number;
      content: Notifications.NotificationContentInput;
    };

    const candidates: NotificationCandidate[] = [];

    // 3. Collecter les résumés du matin (si activé)
    if (settings.morningBriefingEnabled) {
      const { hour: targetHour, minute: targetMinute } =
        parseMorningBriefingTime(settings.morningBriefingTime);

      const daysMap = new Map<string, Course[]>();
      for (const c of upcomingCourses) {
        const dStr = getParisDateString(c.start);
        const list = daysMap.get(dStr);
        if (list) list.push(c);
        else daysMap.set(dStr, [c]);
      }

      for (const [dateStr, dayList] of daysMap.entries()) {
        const [y, m, d] = dateStr.split("-").map(Number);
        // Date du résumé du matin en heure exacte Europe/Paris (été/hiver gérés)
        const triggerMs = parisToEpoch(y, m, d, targetHour, targetMinute, 0);

        if (triggerMs > now + 10_000 && dayList.length > 0) {
          const first = dayList[0];
          const firstRoom = first.room ?? "salle non communiquée";
          const teacherPart = first.teacher ? ` • ${first.teacher}` : "";
          const courseWord =
            dayList.length === 1 ? "1 cours" : `${dayList.length} cours`;

          candidates.push({
            triggerMs,
            priority: 1,
            content: {
              title: "📅 Emploi du temps du jour",
              body: `${courseWord} aujourd'hui. 1er cours : ${first.title} à ${formatTime(first.start)} (${firstRoom}${teacherPart}).`,
              data: { type: "morning_briefing", date: dateStr },
            },
          });
        }
      }
    }

    // 4. Collecter les alertes veille de DS (si activé)
    if (settings.dsSpecialAlert) {
      for (const course of upcomingCourses) {
        if (!isCourseDS(course)) continue;

        // La veille à 20h00 heure Europe/Paris
        const courseDateStr = getParisDateString(course.start);
        const eveDateStr = addDaysIso(courseDateStr, -1);
        const [y, m, d] = eveDateStr.split("-").map(Number);
        const triggerMs = parisToEpoch(y, m, d, 20, 0, 0);

        if (triggerMs > now + 10_000) {
          const roomText = course.room ?? "salle non communiquée";
          const teacherPart = course.teacher ? ` • ${course.teacher}` : "";
          candidates.push({
            triggerMs,
            priority: 0,
            content: {
              title: "📝 Rappel DS demain",
              body: `${course.title} à ${formatTime(course.start)} en salle ${roomText}${teacherPart}.`,
              data: { type: "ds_alert", courseKey: course.key },
            },
          });
        }
      }
    }

    // 5. Collecter les rappels avant chaque cours
    for (const course of upcomingCourses) {
      const triggerMs = course.start - settings.leadTimeMinutes * 60 * 1000;
      if (triggerMs > now + 5_000) {
        const roomText = course.room ?? "salle non communiquée";
        const teacherPart = course.teacher ? ` • ${course.teacher}` : "";
        const isDS = isCourseDS(course);
        const prefix = isDS
          ? "📝 [DS] "
          : course.kind
            ? `[${course.kind}] `
            : "";

        candidates.push({
          triggerMs,
          priority: 2,
          content: {
            title: `${prefix}${course.title}`,
            body: `Dans ${settings.leadTimeMinutes} min (${formatTime(course.start)}) • Salle : ${roomText}${teacherPart}`,
            data: { courseKey: course.key },
          },
        });
      }
    }

    // 6. Trier chronologiquement avant d'appliquer le plafond iOS
    candidates.sort(
      (a, b) => a.triggerMs - b.triggerMs || a.priority - b.priority
    );
    const toSchedule = candidates.slice(0, MAX_IOS_NOTIFICATIONS);

    let scheduledCount = 0;
    for (const item of toSchedule) {
      await Notifications.scheduleNotificationAsync({
        content: item.content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.triggerMs),
        },
      });
      scheduledCount++;
    }

    return scheduledCount;
  } catch (e) {
    console.warn("Erreur programmation des notifications:", e);
    return 0;
  }
}
