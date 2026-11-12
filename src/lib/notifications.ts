import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatTime, getParisDateString } from "./dates";
import { Course } from "./ics";

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
  if (Platform.OS === "web" || !settings.enabled) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
    return 0;
  }

  try {
    // 1. Annulation préalable de toutes les notifications en attente
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduledCount = 0;

    // 2. Filtrer les cours futurs triés chronologiquement
    const upcomingCourses = courses
      .filter((c) => c.start > now)
      .sort((a, b) => a.start - b.start);

    // 3. Programmation des résumés du matin (si activé)
    if (settings.morningBriefingEnabled) {
      const [hStr, mStr] = settings.morningBriefingTime.split(":");
      const targetHour = Number(hStr) || 7;
      const targetMinute = Number(mStr) || 30;

      // Grouper les cours par date
      const daysMap = new Map<string, Course[]>();
      for (const c of upcomingCourses) {
        const dStr = getParisDateString(c.start);
        if (!daysMap.has(dStr)) daysMap.set(dStr, []);
        daysMap.get(dStr)!.push(c);
      }

      for (const [dateStr, dayList] of daysMap.entries()) {
        if (scheduledCount >= MAX_IOS_NOTIFICATIONS) break;

        const [y, m, d] = dateStr.split("-").map(Number);
        // Date du résumé du matin en heure locale Paris
        const briefingDate = new Date(Date.UTC(y, m - 1, d, targetHour - 1, targetMinute, 0));
        const triggerMs = briefingDate.getTime();

        if (triggerMs > now + 10000 && dayList.length > 0) {
          const first = dayList[0];
          const firstRoom = first.room ?? "salle non communiquée";
          const courseWord = dayList.length === 1 ? "1 cours" : `${dayList.length} cours`;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: "📅 Emploi du temps du jour",
              body: `${courseWord} aujourd'hui. 1er cours : ${first.title} à ${formatTime(first.start)} (${firstRoom}).`,
              data: { type: "morning_briefing", date: dateStr },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: briefingDate,
            },
          });
          scheduledCount++;
        }
      }
    }

    // 4. Programmation des alertes veille de DS (si activé)
    if (settings.dsSpecialAlert) {
      for (const course of upcomingCourses) {
        if (scheduledCount >= MAX_IOS_NOTIFICATIONS) break;

        const isDS = course.kind === "DS" || course.title.toUpperCase().includes("_DS");
        if (isDS) {
          // La veille à 20h00
          const courseDateStr = getParisDateString(course.start);
          const [y, m, d] = courseDateStr.split("-").map(Number);
          const eveDate = new Date(Date.UTC(y, m - 1, d - 1, 19, 0, 0)); // 20h Paris
          const triggerMs = eveDate.getTime();

          if (triggerMs > now + 10000) {
            const roomText = course.room ?? "salle non communiquée";
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "📝 Rappel DS demain",
                body: `${course.title} à ${formatTime(course.start)} en salle ${roomText}.`,
                data: { type: "ds_alert", courseKey: course.key },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: eveDate,
              },
            });
            scheduledCount++;
          }
        }
      }
    }

    // 5. Programmation des rappels de cours
    for (const course of upcomingCourses) {
      if (scheduledCount >= MAX_IOS_NOTIFICATIONS) break;

      const triggerMs = course.start - settings.leadTimeMinutes * 60 * 1000;
      if (triggerMs > now + 5000) {
        const roomText = course.room ?? "salle non communiquée";
        const isDS = course.kind === "DS" || course.title.toUpperCase().includes("_DS");
        const prefix = isDS ? "📝 [DS] " : course.kind ? `[${course.kind}] ` : "";

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${prefix}${course.title}`,
            body: `Dans ${settings.leadTimeMinutes} min (${formatTime(course.start)}) • Salle : ${roomText}`,
            data: { courseKey: course.key },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerMs),
          },
        });
        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch (e) {
    console.warn("Erreur programmation des notifications:", e);
    return 0;
  }
}
