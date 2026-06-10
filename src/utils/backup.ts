/**
 * Backup parachute — JSON export / import for Orring.
 *
 * Why this exists: the store lives in AsyncStorage which is wiped
 * when the user "Clears app data" (or factory-resets the device).
 * Without a backup path, years of cycle history would vanish in one
 * tap. This module produces a single self-contained JSON string the
 * user can copy elsewhere (Drive, email, notes, password manager…)
 * and feed back later.
 *
 * Why JSON-as-string (vs file): keeps the implementation native-dep
 * free. The text is shareable through the built-in `Share` API of
 * React Native, which forwards to whatever the user picked at the
 * Android share sheet — Drive, Telegram, Keep, Bluetooth, anything.
 * Import is a TextInput paste, validated by `parseBackup`. Once a
 * file-based persistence path exists (`expo-file-system`), the
 * `serialize` / `parseBackup` halves stay reusable.
 */
import type { CycleLog, DayNote, PeriodLog, RingStatus } from '../store/cycleStore';

const SCHEMA = 'orring-backup-v1';

export interface BackupPayload {
  /** Subset of the store that's worth preserving across reinstalls. */
  firstInsertDate: string | null;
  ringStatus: RingStatus;
  cycleLogs: CycleLog[];
  periodLogs: PeriodLog[];
  dayNotes: DayNote[];
  notificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  darkMode: boolean;
  language: string;
  userName: string | null;
  hasOnboarded: boolean;
  tempRemovalStart: string | null;
  tempRemovalNotify: boolean;
}

interface BackupEnvelope {
  schema: string;
  exportedAt: string; // ISO timestamp
  appVersion?: string;
  data: BackupPayload;
}

/**
 * Serialize the given snapshot into a single JSON string. The
 * envelope carries a `schema` field so future format changes can be
 * detected and migrated by `parseBackup`.
 */
export function serializeBackup(payload: BackupPayload, appVersion?: string): string {
  const envelope: BackupEnvelope = {
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    ...(appVersion ? { appVersion } : {}),
    data: payload,
  };
  // 2-space indent so a human pasting the string into a note app
  // can still read / sanity-check it before re-importing.
  return JSON.stringify(envelope, null, 2);
}

export type ParseResult =
  | { ok: true; payload: BackupPayload; exportedAt: string; appVersion?: string }
  | { ok: false; error: string };

/**
 * Parse + validate a backup string. Returns either the payload (so
 * the caller can hydrate the store) or a human-readable error.
 *
 * Validation is shallow on purpose: we check the schema tag and
 * presence of the required top-level fields. Field-level integrity
 * (e.g. cycleLogs[i].date being parseable) is left to the consumers
 * — most code paths already tolerate malformed entries gracefully.
 */
export function parseBackup(input: string): ParseResult {
  let envelope: unknown;
  try {
    envelope = JSON.parse(input);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  if (!envelope || typeof envelope !== 'object') {
    return { ok: false, error: 'invalid_envelope' };
  }
  const env = envelope as Partial<BackupEnvelope>;
  if (env.schema !== SCHEMA) {
    return { ok: false, error: 'unknown_schema' };
  }
  if (!env.data || typeof env.data !== 'object') {
    return { ok: false, error: 'missing_data' };
  }
  const d = env.data as Partial<BackupPayload>;
  // Required-shape sanity check. Loose typing — don't fail an entire
  // restore over a single missing optional field.
  if (
    typeof d.ringStatus !== 'string' ||
    !Array.isArray(d.cycleLogs) ||
    !Array.isArray(d.periodLogs)
  ) {
    return { ok: false, error: 'malformed_data' };
  }
  return {
    ok: true,
    payload: d as BackupPayload,
    exportedAt: env.exportedAt ?? '',
    appVersion: env.appVersion,
  };
}
