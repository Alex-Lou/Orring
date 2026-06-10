import type { TFunction } from 'i18next';
import type { PeriodFlowState } from '../utils/periods';

/**
 * Header copy for the guided "Mes périodes" flow — extracted from
 * PeriodLogModal so the component stays under the size budget.
 *
 * Keyed off `flowState.kind` so when the state changes (e.g. user picks
 * an intensity in CONTINUING and the modal closes/reopens on the next
 * tap), the FadeInDown re-fires and the new copy slides in.
 *
 * Returns `null` in the legacy (non-guided) path so the caller can fall
 * back to the legacy header.
 */
export function buildHeaderCopy(
  flowState: PeriodFlowState | undefined,
  t: TFunction,
): { title: string; sub: string } | null {
  if (!flowState) return null;
  switch (flowState.kind) {
    case 'STARTING':
      return {
        title: t('periodsFlowStartingTitle', { defaultValue: 'Tu démarres ?' }),
        sub: t('periodsFlowStartingSub', {
          defaultValue: 'Indique l\'intensité du flux pour ce premier jour.',
        }),
      };
    case 'CONTINUING':
      return {
        title: t('periodsFlowContinuingTitle', {
          day: flowState.dayInPeriod,
          defaultValue: `Jour ${flowState.dayInPeriod} de cette période`,
        }),
        sub: t('periodsFlowContinuingSub', {
          defaultValue: 'Comment ça va aujourd\'hui ?',
        }),
      };
    case 'RESTART':
      return {
        title: t('periodsFlowRestartTitle', { defaultValue: 'Nouveau cycle ?' }),
        sub: t('periodsFlowRestartSub', {
          defaultValue:
            'Tu as une période en cours plus ancienne — elle sera fermée automatiquement.',
        }),
      };
    case 'EDITING':
      return {
        title: t('periodsFlowEditingTitle', {
          day: flowState.dayInPeriod,
          defaultValue: `Jour ${flowState.dayInPeriod}`,
        }),
        sub: flowState.isStart
          ? t('periodsFlowEditingStartSub', { defaultValue: 'Premier jour de cette période.' })
          : flowState.isEnd
            ? t('periodsFlowEditingEndSub', { defaultValue: 'Dernier jour enregistré.' })
            : t('periodsFlowEditingMidSub', { defaultValue: 'Modifie l\'intensité ou la fin.' }),
      };
  }
}
