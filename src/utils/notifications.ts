import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays } from 'date-fns';
import { RING_IN_DAYS, CYCLE_LENGTH } from './cycle';

// ─── Setup ───

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Permissions ───

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule notifications for a cycle ───

export async function scheduleRingNotifications(
  insertionDate: Date,
  reminderHour: number = 9,
  reminderMinute: number = 0
): Promise<void> {
  // Cancel all existing notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const removalDate = addDays(insertionDate, RING_IN_DAYS);
  const nextInsertDate = addDays(insertionDate, CYCLE_LENGTH);
  const now = new Date();

  // ─── RETRAIT notifications ───

  // J-7 avant retrait
  const removal7 = new Date(removalDate);
  removal7.setDate(removal7.getDate() - 7);
  removal7.setHours(reminderHour, reminderMinute, 0, 0);
  if (removal7 > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⭕ Orring — Dans 7 jours',
        body: "Pense à retirer ton anneau dans 7 jours.",
        sound: true,
      },
      trigger: { date: removal7, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }

  // J-1 avant retrait
  const removal1 = new Date(removalDate);
  removal1.setDate(removal1.getDate() - 1);
  removal1.setHours(reminderHour, reminderMinute, 0, 0);
  if (removal1 > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '♻️ Orring — Demain !',
        body: "C'est demain qu'il faut retirer ton anneau.",
        sound: true,
      },
      trigger: { date: removal1, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }

  // Jour J retrait
  const removalDay = new Date(removalDate);
  removalDay.setHours(reminderHour, reminderMinute, 0, 0);
  if (removalDay > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "♻️ Orring — C'est aujourd'hui !",
        body: "C'est le jour de retirer ton anneau.",
        sound: true,
      },
      trigger: { date: removalDay, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }

  // ─── INSERTION notifications (prochain cycle) ───

  // J-7 avant insertion
  const insert7 = new Date(nextInsertDate);
  insert7.setDate(insert7.getDate() - 7);
  insert7.setHours(reminderHour, reminderMinute, 0, 0);
  if (insert7 > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⭕ Orring — Dans 7 jours',
        body: "Pense à remettre ton anneau dans 7 jours.",
        sound: true,
      },
      trigger: { date: insert7, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }

  // J-1 avant insertion
  const insert1 = new Date(nextInsertDate);
  insert1.setDate(insert1.getDate() - 1);
  insert1.setHours(reminderHour, reminderMinute, 0, 0);
  if (insert1 > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⭕ Orring — Demain !",
        body: "C'est demain qu'il faut remettre ton anneau.",
        sound: true,
      },
      trigger: { date: insert1, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }

  // Jour J insertion
  const insertDay = new Date(nextInsertDate);
  insertDay.setHours(reminderHour, reminderMinute, 0, 0);
  if (insertDay > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⭕ Orring — C'est aujourd'hui !",
        body: "C'est le jour de remettre ton anneau !",
        sound: true,
      },
      trigger: { date: insertDay, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  }
}

// ─── Cancel all ───

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Temporary removal timer (3h) ───

const TEMP_REMOVAL_NOTIF_ID = 'orring-temp-removal';

export async function scheduleTempRemovalNotif(removedAt: Date): Promise<void> {
  // Cancel any existing one first
  await cancelTempRemovalNotif();

  const triggerDate = new Date(removedAt.getTime() + 3 * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: TEMP_REMOVAL_NOTIF_ID,
    content: {
      title: '⏰ Orring — Il est temps de remettre',
      body: "Ton anneau est retiré depuis 3h. Pense à le remettre pour ne pas perdre l'efficacité !",
      sound: true,
    },
    trigger: { date: triggerDate, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
}

export async function cancelTempRemovalNotif(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TEMP_REMOVAL_NOTIF_ID);
  } catch {
    /* ignore if not found */
  }
}

// ─── Debug: list scheduled ───

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
