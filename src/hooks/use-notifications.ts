import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Course } from "@/lib/ics";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  NotificationSettings,
  requestNotificationPermissions,
  saveNotificationSettings,
  scheduleAllNotifications,
} from "@/lib/notifications";

export function useNotifications(courses: Course[]) {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  // 1. Charger les réglages et vérifier les permissions au montage
  useEffect(() => {
    let mounted = true;

    async function init() {
      const loaded = await loadNotificationSettings();
      if (mounted) setSettings(loaded);

      if (Platform.OS !== "web") {
        const { status } = await Notifications.getPermissionsAsync();
        if (mounted) setPermissionGranted(status === "granted");

        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (mounted) setScheduledCount(scheduled.length);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Reprogrammer les notifications manuellement
  const reschedule = useCallback(
    async (coursesToSchedule: Course[], customSettings = settings) => {
      const count = await scheduleAllNotifications(coursesToSchedule, customSettings);
      setScheduledCount(count);
      return count;
    },
    [settings]
  );

  // 3. Programmer automatiquement de façon asynchrone dès que les cours ou réglages changent
  useEffect(() => {
    let mounted = true;
    if (courses.length > 0 && settings.enabled) {
      scheduleAllNotifications(courses, settings).then((count) => {
        if (mounted) {
          setScheduledCount(count);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [courses, settings]);

  // Mettre à jour un réglage
  const updateSettings = useCallback(
    async (updater: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updater };
        saveNotificationSettings(next);
        return next;
      });
    },
    []
  );

  // Demander la permission
  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (granted && courses.length > 0) {
      const count = await scheduleAllNotifications(courses, settings);
      setScheduledCount(count);
    }
    return granted;
  }, [courses, settings]);

  return {
    settings,
    permissionGranted,
    scheduledCount,
    updateSettings,
    requestPermission,
    reschedule: () => reschedule(courses, settings),
  };
}
