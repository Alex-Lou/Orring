/**
 * Date-seeded picker for the rotating phrases used on the home
 * screen — wraps "today's date" and "ring inserted on X" in warm
 * sentences that vary across days without ever changing within
 * the same day (so the user doesn't see the wording flicker on
 * re-render or navigation).
 *
 * The phrases themselves live in `src/i18n/translations.ts` under
 * the `todayPhrases` and `insertionPhrases` keys (arrays). i18next
 * resolves `t('todayPhrases.{i}', {date})` to the i-th entry of the
 * active locale, falling back to `en` when the locale is missing
 * an entry — the count constants below MUST stay in sync with the
 * smallest-translated array.
 */

/** Length of the `todayPhrases.*` array in every locale. */
export const TODAY_PHRASE_COUNT = 20;

/** Length of the `insertionPhrases.*` array in every locale. */
export const INSERTION_PHRASE_COUNT = 3;

// Compact yyyymmdd integer — stable for the day, monotonic-ish
// across days so neighbouring days don't repeat the same phrase
// modulo the array length when the count divides cleanly.
function dateSeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * Returns an index in `[0, TODAY_PHRASE_COUNT)` derived from the
 * given calendar day. Same day → same index (UI doesn't flicker).
 * Adjacent days → different indices unless rare collisions.
 */
export function pickTodayPhraseIndex(today: Date): number {
  return dateSeed(today) % TODAY_PHRASE_COUNT;
}

/**
 * Same as `pickTodayPhraseIndex` but indexed against the smaller
 * insertion-phrase pool. We deliberately seed off the insertion
 * date (not today) so the phrase stays consistent for the whole
 * 28-day cycle the user looks at this same date.
 */
export function pickInsertionPhraseIndex(insertDate: Date): number {
  return dateSeed(insertDate) % INSERTION_PHRASE_COUNT;
}
