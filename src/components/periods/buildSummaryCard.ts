/**
 * Summary-card state machine for the "Mes périodes" screen
 * (app/periods.tsx).
 *
 * Extracted verbatim from the inline IIFE — pure relocation. The body is
 * the SAME branch-by-branch logic that ran inside periods.tsx; only the
 * surrounding `(() => { ... })()` wrapper was turned into a named pure
 * function taking the values it used to close over (stats/today/locale/t/
 * theme). It returns the identical `SummaryCard` descriptor object.
 *
 * No behavior, copy, emoji, color, or condition changed.
 */
import { differenceInDays, format, startOfDay } from 'date-fns';
import type { useTheme } from '../../theme/useTheme';
import type { PeriodStats } from '../../utils/periods';
import type { useTranslation } from 'react-i18next';

// The card at the top of the screen has 5 mutually-exclusive variants
// depending on the user's current situation. Computing them in one
// place makes the JSX trivial (one Animated.View, content driven by
// `summaryCard`) and ensures the visual + copy + emoji always stay
// in sync — no mismatch between "title says today, body says J-3".
export type SummaryVariant =
  | 'empty'
  | 'firstLog'
  | 'inProgress'
  | 'predFuture'
  | 'predToday'
  | 'predLate';
export type SummaryCard = {
  variant: SummaryVariant;
  bg: string;
  textColor: string;
  emoji: string;
  label: string;        // small uppercase eyebrow
  title: string;        // big headline
  body: string;         // sub line under the title
  hint?: string;        // optional 3rd-line "based on N cycles" footnote
};

type T = ReturnType<typeof useTranslation>['t'];
type Theme = ReturnType<typeof useTheme>;

export function buildSummaryCard(
  stats: PeriodStats,
  today: Date,
  // `getDateFnsLocale` returns `any`, mirror that here so callers pass it
  // straight through without a cast (preserves prior behavior exactly).
  locale: any,
  t: T,
  theme: Theme,
): SummaryCard {
  // 1. No logs at all — invite to start.
  if (!stats.last) {
    return {
      variant: 'empty',
      // theme.primarySoft is a calm pervenche tint that harmonizes
      // with the page bg in BOTH modes (#EBE3F3 light / #2E2746 dark)
      // — using `theme.surface` made the card read as a stark white
      // block in light mode against the page's pervenche bg.
      bg: theme.primarySoft,
      textColor: theme.primaryDark,
      emoji: '🌸',
      label: t('periodsCardEmptyLabel', { defaultValue: 'Bienvenue' }),
      title: t('periodsEmptyTitle', { defaultValue: 'Commence ton suivi' }),
      body: t('periodsEmptyBody', {
        defaultValue:
          'Tape un jour dans le calendrier ci-dessous pour enregistrer le premier jour de tes règles.',
      }),
    };
  }
  // 2. Last period is still being logged — no prediction yet, the
  //    user is in the middle of her cycle.
  if (stats.latestIsOpen) {
    const dayInPeriod =
      differenceInDays(startOfDay(today), startOfDay(new Date(stats.last.startDate))) + 1;
    return {
      variant: 'inProgress',
      bg: theme.primarySoft,
      textColor: theme.primaryDark,
      emoji: '🩸',
      label: t('periodsCardInProgressLabel', { defaultValue: 'En cours' }),
      title: t('periodsInProgressTitle', {
        day: dayInPeriod,
        defaultValue: `Jour ${dayInPeriod} de cette période`,
      }),
      body: t('periodsInProgressBody', {
        defaultValue:
          "Tape le jour suivant pour continuer le suivi, ou marque ce jour comme dernier si c'est terminé.",
      }),
    };
  }
  // 3. Closed but only one cycle logged — can't predict yet.
  if (stats.nextStart === null) {
    return {
      variant: 'firstLog',
      // Same soft pervenche treatment as the empty state — the user
      // is effectively in the same "we need more data" mood, just one
      // step further. Keeps light + dark mode visually harmonious.
      bg: theme.primarySoft,
      textColor: theme.primaryDark,
      emoji: '✨',
      label: t('periodsCardFirstLogLabel', { defaultValue: 'Bientôt' }),
      title: t('periodsFirstLogTitle', {
        defaultValue: "Plus qu'un cycle pour activer les prédictions",
      }),
      body: t('periodsFirstLogBody', {
        defaultValue:
          "Loggue ton prochain début de règles : l'app calculera ta moyenne automatiquement et te préviendra avant la suivante.",
      }),
    };
  }
  // 4-6. We have a prediction. Branch by daysUntilNext.
  const d = stats.daysUntilNext!;
  const dateStr = format(stats.nextStart, 'EEEE dd MMMM', { locale });
  const niceDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const hint = t('periodsCycleHint', {
    avg: stats.avgCycleDays!,
    cycles: stats.observedCycleCount,
    defaultValue: `D'après ta moyenne de ${stats.avgCycleDays} j sur ${stats.observedCycleCount} cycle${stats.observedCycleCount > 1 ? 's' : ''} observé${stats.observedCycleCount > 1 ? 's' : ''}.`,
  });
  if (d === 0) {
    return {
      variant: 'predToday',
      bg: '#FFD6C2',
      textColor: '#A14524',
      emoji: '🩸',
      label: t('periodsCardTodayLabel', { defaultValue: 'Aujourd\'hui' }),
      title: t('periodsTodayTitle', { defaultValue: "C'est probablement aujourd'hui" }),
      body: niceDate,
      hint,
    };
  }
  if (d > 0) {
    return {
      variant: 'predFuture',
      bg: theme.primarySoft,
      textColor: theme.primaryDark,
      emoji: '🌙',
      label: t('periodsCardNextLabel', { defaultValue: 'Prochaines règles' }),
      title:
        d === 1
          ? t('periodsNextTomorrow', { defaultValue: 'Demain' })
          : t('periodsNextInDays', {
              days: d,
              defaultValue: `Dans ${d} jours`,
            }),
      body: niceDate,
      hint,
    };
  }
  // d < 0 → late
  const late = -d;
  return {
    variant: 'predLate',
    bg: '#F8C4CC',
    textColor: '#8B1F2D',
    emoji: '🌙',
    label: t('periodsCardLateLabel', { defaultValue: 'En attente' }),
    title: t('periodsLateTitle', {
      days: late,
      defaultValue: late === 1 ? '1 jour de retard' : `${late} jours de retard`,
    }),
    body: t('periodsLateBody', {
      date: niceDate,
      defaultValue: `Prévu le ${niceDate}. Tape ton premier jour dès qu'elles arrivent.`,
    }),
    hint,
  };
}
