import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays } from 'date-fns';
import { RING_IN_DAYS, RING_OUT_DAYS, CYCLE_LENGTH } from './cycle';
import type { RingStatus } from '../store/cycleStore.types';
import i18n from '../i18n';
import { getNotifCopy } from '../i18n/notificationStrings';

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
    name: getNotifCopy(i18n.language).channelName,
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

// Identifier prefixes — used to cancel only OUR notifs without nuking
// the ones from the other scheduler. Before the prefixed model we used
// `cancelAllScheduledNotificationsAsync()` which made it impossible to
// run ring + period reminders side-by-side.
const RING_PREFIX = 'orring-ring-';
const PERIOD_PREFIX = 'orring-period-';
const TEMP_REMOVAL_NOTIF_ID = 'orring-temp-removal';

async function cancelByPrefix(prefix: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith(prefix)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}

async function scheduleAt(
  date: Date,
  title: string,
  body: string,
  identifier?: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    ...(identifier ? { identifier } : {}),
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

/**
 * Phase-aware ring reminders. Only the CURRENT phase is scheduled, so a
 * reminder — including the new overdue nudges — can never fire for an action
 * already done:
 *   • ring IN  → reminders to REMOVE (J-7 / J-1 / J0) + overdue (J+1 / J+3),
 *                anchored on insertion + 21.
 *   • ring OUT → reminders to RE-INSERT (J-7 / J-1 / J0) + overdue (J+1 / J+3),
 *                anchored on the ACTUAL removal + 7 (more accurate than the
 *                old insertion+28 guess for early/late removals; falls back to
 *                insertion + 28 only if the removal date is unknown).
 *
 * Removing / re-inserting reschedules into the other phase, and `cancelByPrefix`
 * drops the previous phase's queue — so the J+1/J+3 "en retard" reminders fire
 * ONLY while you're genuinely overdue, never after you've acted.
 */
export async function scheduleRingNotifications(
  insertionDate: Date,
  ringStatus: RingStatus,
  lastRemovalDate: Date | null = null,
  reminderHour: number = 9,
  reminderMinute: number = 0,
): Promise<void> {
  await ensureAndroidChannel();
  // Cancel ONLY the ring notifs — don't touch period or temp-removal IDs.
  await cancelByPrefix(RING_PREFIX);

  const now = new Date();
  const c = getNotifCopy(i18n.language);
  const at = (base: Date, offsetDays: number) => atHour(base, reminderHour, reminderMinute, offsetDays);
  const events: Array<{ date: Date; title: string; body: string; suffix: string }> = [];

  if (ringStatus === 'in') {
    // ─── Waiting to REMOVE (around insertion + 21) ───
    const removalDate = addDays(insertionDate, RING_IN_DAYS);
    events.push(
      { date: at(removalDate, -7), title: c.removeJ7.title, body: c.removeJ7.body, suffix: 'remove-j7' },
      { date: at(removalDate, -1), title: c.removeJ1.title, body: c.removeJ1.body, suffix: 'remove-j1' },
      { date: at(removalDate, 0), title: c.removeJ0.title, body: c.removeJ0.body, suffix: 'remove-j0' },
      { date: at(removalDate, 1), title: c.removeOverdue1.title, body: c.removeOverdue1.body, suffix: 'remove-late1' },
      { date: at(removalDate, 3), title: c.removeOverdue3.title, body: c.removeOverdue3.body, suffix: 'remove-late3' },
    );
  } else {
    // ─── Waiting to RE-INSERT (actual removal + 7-day pause) ───
    const reInsertDate = lastRemovalDate
      ? addDays(lastRemovalDate, RING_OUT_DAYS)
      : addDays(insertionDate, CYCLE_LENGTH);
    events.push(
      { date: at(reInsertDate, -7), title: c.insertJ7.title, body: c.insertJ7.body, suffix: 'insert-j7' },
      { date: at(reInsertDate, -1), title: c.insertJ1.title, body: c.insertJ1.body, suffix: 'insert-j1' },
      { date: at(reInsertDate, 0), title: c.insertJ0.title, body: c.insertJ0.body, suffix: 'insert-j0' },
      { date: at(reInsertDate, 1), title: c.insertOverdue1.title, body: c.insertOverdue1.body, suffix: 'insert-late1' },
      { date: at(reInsertDate, 3), title: c.insertOverdue3.title, body: c.insertOverdue3.body, suffix: 'insert-late3' },
    );
  }

  for (const ev of events) {
    if (ev.date > now) {
      await scheduleAt(ev.date, ev.title, ev.body, RING_PREFIX + ev.suffix);
    }
  }
}

// ─── Cancel all ───

/**
 * Nukes every scheduled Orring notification — used by `setNotificationsEnabled(false)`
 * and `resetAll`. Also cancels notifications from other apps technically, but the
 * Expo API only sees its own queue so it's safe.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Period reminders ───

/**
 * Schedule the 3 period-prediction reminders around an expected start date:
 *   J-2 : "Tes règles arrivent dans 2 jours — pense à te préparer"
 *   J-0 : "Aujourd'hui c'est la date prévue — quelque chose à signaler ?"
 *   J+3 : "3 jours de retard — tout va bien ?"
 *
 * Each fires at `reminderHour:reminderMinute` to align with the user's
 * preferred reminder time (same setting as the ring reminders). All three
 * share the PERIOD_PREFIX so we can cancel/rebuild without affecting ring
 * notifications.
 *
 * No-op if `predictedStart` is `null` (not enough history yet) or already
 * far enough in the past that all 3 reminders would be skipped.
 */
// Sub-IDs for the prediction trio so we can cancel ONLY them without
// touching the sibling open-stale reminder that lives under the same
// PERIOD_PREFIX umbrella.
const PERIOD_PRED_IDS = [
  PERIOD_PREFIX + 'pred-j2',
  PERIOD_PREFIX + 'pred-j0',
  PERIOD_PREFIX + 'pred-j+3',
];

export async function schedulePeriodNotifications(
  predictedStart: Date | null,
  reminderHour: number = 9,
  reminderMinute: number = 0,
): Promise<void> {
  await ensureAndroidChannel();
  // Cancel JUST the three prediction notifs — leave the open-stale
  // reminder in place so we don't have to re-schedule it on every
  // mutation that touches the prediction date.
  for (const id of PERIOD_PRED_IDS) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  if (!predictedStart) return;

  const now = new Date();
  // Period reminders: warm + supportive copy, never alarming. The
  // emoji choices mirror the "Mes périodes" card states (🌸 ahead,
  // 🩸 day-of, 🌙 late) so the lockscreen visual matches what the
  // user sees in the app.
  const c = getNotifCopy(i18n.language);
  const events: Array<{ date: Date; title: string; body: string; suffix: string }> = [
    {
      date: atHour(predictedStart, reminderHour, reminderMinute, -2),
      title: c.periodJ2.title,
      body: c.periodJ2.body,
      suffix: 'pred-j2',
    },
    {
      date: atHour(predictedStart, reminderHour, reminderMinute, 0),
      title: c.periodJ0.title,
      body: c.periodJ0.body,
      suffix: 'pred-j0',
    },
    {
      date: atHour(predictedStart, reminderHour, reminderMinute, 3),
      title: c.periodLate.title,
      body: c.periodLate.body,
      suffix: 'pred-j+3',
    },
  ];

  for (const ev of events) {
    if (ev.date > now) {
      await scheduleAt(ev.date, ev.title, ev.body, PERIOD_PREFIX + ev.suffix);
    }
  }
}

export async function cancelPeriodNotifications(): Promise<void> {
  await cancelByPrefix(PERIOD_PREFIX);
}

/**
 * Stale-open-period reminder. When the user has logged a period but
 * left it open (no endDate) and hasn't touched it for 2+ days, fire
 * a single gentle reminder at `reminderHour` on `lastCoveredDay + 2`.
 *
 * Cancels any prior stale reminder first so a fresh log update pushes
 * the reminder back. No-op when `lastCoveredDay` is null (no open
 * period) or when the reminder time is already in the past.
 */
export async function scheduleOpenPeriodReminder(
  lastCoveredDay: Date | null,
  reminderHour: number = 9,
  reminderMinute: number = 0,
): Promise<void> {
  await ensureAndroidChannel();
  // Use a sub-prefix so this reminder is independent from the
  // prediction trio (J-2 / J0 / J+3) which lives under PERIOD_PREFIX
  // too — but we only want to cancel/reschedule THIS specific notif
  // here, not blow away the prediction queue.
  const id = PERIOD_PREFIX + 'open-stale';
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  if (!lastCoveredDay) return;

  const trigger = atHour(lastCoveredDay, reminderHour, reminderMinute, 2);
  if (trigger <= new Date()) return;

  const c = getNotifCopy(i18n.language);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: c.periodOpen.title,
      body: c.periodOpen.body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: { date: trigger, type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
}

// ─── Temporary removal timer (3h) ───

export async function scheduleTempRemovalNotif(removedAt: Date): Promise<void> {
  await ensureAndroidChannel();
  // Cancel any existing one first
  await cancelTempRemovalNotif();

  const triggerDate = new Date(removedAt.getTime() + 3 * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return;

  const c = getNotifCopy(i18n.language);
  await Notifications.scheduleNotificationAsync({
    identifier: TEMP_REMOVAL_NOTIF_ID,
    content: {
      title: c.tempRemoval.title,
      body: c.tempRemoval.body,
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
