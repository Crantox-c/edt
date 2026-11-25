import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Course } from "@/lib/geii-api";
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
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  const settingsRef = useRef<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const scheduleGenRef = useRef(0);

  // 1. Charger les réglages et vérifier les permissions au montage
  useEffect(() => {
    let mounted = true;

    async function init() {
      const loaded = await loadNotificationSettings();
      if (!mounted) return;
      settingsRef.current = loaded;
      setSettings(loaded);
      setSettingsLoaded(true);

      if (Platform.OS !== "web") {
        const { status } = await Notifications.getPermissionsAsync();
        if (mounted) setPermissionGranted(status === "granted");

        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
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
    async (
      coursesToSchedule: Course[],
      customSettings = settingsRef.current
    ) => {
      const gen = ++scheduleGenRef.current;
      const count = await scheduleAllNotifications(
        coursesToSchedule,
        customSettings
      );
      if (scheduleGenRef.current === gen) {
        setScheduledCount(count);
      }
      return count;
    },
    []
  );

  // 3. Programmer ou annuler automatiquement dès que les cours, réglages ou permissions changent
  useEffect(() => {
    if (!settingsLoaded) return;

    let mounted = true;
    const gen = ++scheduleGenRef.current;

    if (!settings.enabled) {
      scheduleAllNotifications([], settings).then((count) => {
        if (mounted && scheduleGenRef.current === gen) {
          setScheduledCount(count);
        }
      });
    } else if (permissionGranted !== false) {
      scheduleAllNotifications(courses, settings).then((count) => {
        if (mounted && scheduleGenRef.current === gen) {
          setScheduledCount(count);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [courses, settings, settingsLoaded, permissionGranted]);

  // Mettre à jour un réglage hors du updater React
  const updateSettings = useCallback(
    async (updater: Partial<NotificationSettings>) => {
      const next = { ...settingsRef.current, ...updater };
      settingsRef.current = next;
      setSettings(next);
      await saveNotificationSettings(next);
    },
    []
  );

  // Demander la permission
  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (granted) {
      const gen = ++scheduleGenRef.current;
      const count = await scheduleAllNotifications(courses, settingsRef.current);
      if (scheduleGenRef.current === gen) {
        setScheduledCount(count);
      }
    }
    return granted;
  }, [courses]);

  const rescheduleCurrent = useCallback(
    () => reschedule(courses, settingsRef.current),
    [courses, reschedule]
  );

  return {
    settings,
    permissionGranted,
    scheduledCount,
    updateSettings,
    requestPermission,
    reschedule: rescheduleCurrent,
  };
}
