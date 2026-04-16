import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays } from 'date-fns';
import { RING_IN_DAYS, CYCLE_LENGTH } from './cycle';

// ─── Setup ───

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android requires a notification channel for sound + importance.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orring-reminders', {
    name: 'Rappels Orring',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F8B4C8',
  });
}

// ─── Permissions ───

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule notifications for a cycle ───

const CHANNEL_ID = 'orring-reminders';

async function scheduleAt(date: Date, title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: { date, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
}

function atHour(date: Date, hour: number, minute: number, offsetDays: number = 0): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function scheduleRingNotifications(
  insertionDate: Date,
  reminderHour: number = 9,
  reminderMinute: number = 0
): Promise<void> {
  await ensureAndroidChannel();
  // Cancel all existing cycle notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const removalDate = addDays(insertionDate, RING_IN_DAYS);
  const nextInsertDate = addDays(insertionDate, CYCLE_LENGTH);
  const now = new Date();

  const events: Array<{ date: Date; title: string; body: string }> = [
    // ─── RETRAIT ───
    { date: atHour(removalDate, reminderHour, reminderMinute, -7), title: '⭕ Orring — Dans 7 jours', body: "Pense à retirer ton anneau dans 7 jours." },
    { date: atHour(removalDate, reminderHour, reminderMinute, -1), title: '♻️ Orring — Demain !', body: "C'est demain qu'il faut retirer ton anneau." },
    { date: atHour(removalDate, reminderHour, reminderMinute, 0), title: "♻️ Orring — C'est aujourd'hui !", body: "C'est le jour de retirer ton anneau." },
    // ─── INSERTION prochain cycle ───
    { date: atHour(nextInsertDate, reminderHour, reminderMinute, -7), title: '⭕ Orring — Dans 7 jours', body: "Pense à remettre ton anneau dans 7 jours." },
    { date: atHour(nextInsertDate, reminderHour, reminderMinute, -1), title: "⭕ Orring — Demain !", body: "C'est demain qu'il faut remettre ton anneau." },
    { date: atHour(nextInsertDate, reminderHour, reminderMinute, 0), title: "⭕ Orring — C'est aujourd'hui !", body: "C'est le jour de remettre ton anneau !" },
  ];

  for (const ev of events) {
    if (ev.date > now) {
      await scheduleAt(ev.date, ev.title, ev.body);
    }
  }
}

// ─── Cancel all ───

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Temporary removal timer (3h) ───

const TEMP_REMOVAL_NOTIF_ID = 'orring-temp-removal';

export async function scheduleTempRemovalNotif(removedAt: Date): Promise<void> {
  await ensureAndroidChannel();
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
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
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
