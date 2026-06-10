import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
import { colors } from '../src/theme';
import { CycleRing } from '../src/components/CycleRing';
// Period tracking moved to its dedicated drawer tab "Mes périodes"
// in v2.6.1 — those components are no longer consumed from the home
// screen. Kept under src/components/ since the dedicated tab uses them.
import { ActionButton } from '../src/components/ActionButton';
import { ConfirmActionModal } from '../src/components/ConfirmActionModal';
import { useConfirm } from '../src/components/ConfirmProvider';
import { Ionicons } from '@expo/vector-icons';
import { Onboarding } from '../src/components/Onboarding';
import { TempRemovalCountdown } from '../src/components/TempRemovalCountdown';
import { WithdrawalGauge } from '../src/components/WithdrawalGauge';
import {
  getCycleInfoFromLogs, formatDateTimeFr,
  RING_IN_DAYS, RING_OUT_DAYS,
} from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
// Greeting header (pet bird + greeting text + time-of-day icon + date phrase)
// and its module-scope time-of-day helpers were extracted out of this file.
import { GreetingHeader } from '../src/components/home/GreetingHeader';
import { styles } from './index.styles';

export default function MyCycleScreen() {
  const {
    firstInsertDate, ringStatus, cycleLogs,
    insertRing, removeRing, resetAll, userName, darkMode, startTempRemoval,
    // (the greeting-icon debug override was removed in v2.6.5)
  } = useCycleStore();
  const { width } = useWindowDimensions();
  const [confirmAction, setConfirmAction] = useState<'insert' | 'remove' | null>(null);
  // (selectedPeriodDate state removed alongside pauseDays grid in v2.6.1)
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const confirm = useConfirm();

  const info = useMemo(
    () => firstInsertDate
      ? getCycleInfoFromLogs(new Date(firstInsertDate), cycleLogs, ringStatus)
      : null,
    [firstInsertDate, cycleLogs, ringStatus]
  );

  const isRingIn = ringStatus === 'in';

  // The "awaiting re-insertion" state — the 7-day pause is OVER but the
  // user hasn't yet logged a new insert. We render a scaffold (inactive)
  // 21-day ring instead of the rose-overdue full ring, so the upcoming
  // cycle is visibly present but inert until the user confirms insertion.
  // Activation is simply: pressing "J'ai mis l'anneau" → insertRing() →
  // new insert log → cycleStart resets → currentDay flips to 1 → the
  // same component re-renders fully animated on the next frame.
  const isAwaitingReinsertion = !!info && info.isOverdue && info.nextAction === 'insert' && !isRingIn;

  // Phase key on the ring's wrapper so each transition (ring-in → pause →
  // awaiting → new ring-in) remounts the Animated.View, replaying its
  // FadeIn entering animation. That gives the user the "a new gauge has
  // appeared" feel they asked for, instead of the same circle silently
  // morphing colors in place.
  const ringPhaseKey = isAwaitingReinsertion
    ? 'awaiting'
    : isRingIn
      ? 'ring-in'
      : 'ring-out';

  // Period tracking moved to the dedicated "Mes périodes" drawer tab
  // in v2.6.1 — pauseDays / selectedPeriodInfo / handlePeriodSelect /
  // handlePeriodRemove / setSelectedPeriodDate were all removed
  // alongside the home-screen "Suivi des règles" grid.

  // Show onboarding if no insert date (covers new users + reset users)
  if (!firstInsertDate || !info) {
    return <Onboarding onComplete={() => { /* state will re-render from store */ }} />;
  }

  const ringSize = Math.min(width - 60, 300);
  const nextActionLabel = info.nextAction === 'remove' ? t('removalAction') : t('insertionAction');

  const handleConfirmAction = (date: Date, options?: { temporary?: boolean; notify?: boolean }) => {
    if (confirmAction === 'insert') {
      insertRing(date.toISOString());
    } else if (confirmAction === 'remove') {
      if (options?.temporary) {
        startTempRemoval(options.notify ?? true);
      } else {
        removeRing(date.toISOString());
      }
    }
    setConfirmAction(null);
  };

  // handlePeriodSelect / handlePeriodRemove removed in v2.6.1 — see
  // "Mes périodes" drawer tab for the new guided flow.

  const handleReset = async () => {
    if (await confirm({
      title: t('resetTitle'),
      body: t('resetMessage'),
      confirmLabel: t('restart'),
      destructive: true,
      emoji: '🔄',
    })) {
      resetAll();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <GreetingHeader info={info} userName={userName} isRTL={isRTL} theme={theme} t={t} />
            </View>
            <TempRemovalCountdown />
          </View>
        </Animated.View>

        {/* Big cycle ring.
            `key` swap triggers a fresh FadeIn each time the phase flips,
            so the user reads "a new gauge appears" rather than "the same
            ring changed colors". When awaiting re-insertion (post-pause,
            no new insert log yet) we preview the upcoming 21-day cycle
            in INACTIVE mode — visible scaffold, no fill, dim center
            label inviting the user to press "J'ai mis l'anneau". */}
        <Animated.View
          key={ringPhaseKey}
          entering={FadeIn.delay(isAwaitingReinsertion ? 0 : 300).duration(900)}
          style={styles.ringWrapper}
        >
          <CycleRing
            currentDay={info.currentDay}
            size={ringSize}
            isRingIn={isAwaitingReinsertion ? true : isRingIn}
            phaseLabel={isRingIn ? t('ringInPlace') : t('pause')}
            daysLeft={info.daysUntilChange}
            nextAction={nextActionLabel}
            inactive={isAwaitingReinsertion}
          />
        </Animated.View>

        {/* Status pills */}
        <Animated.View entering={SlideInRight.delay(500).duration(500).springify()} style={[styles.pillsRow, isRTL && styles.rtlRow]}>
          <View style={[
            styles.pill,
            isRingIn
              ? { backgroundColor: darkMode ? 'rgba(158,198,164,0.18)' : colors.ringInLight }
              : { backgroundColor: darkMode ? 'rgba(181,165,226,0.18)' : colors.ringOutLight },
          ]}>
            <Text style={[
              styles.pillText,
              { color: isRingIn
                  ? (darkMode ? '#9EC6A4' : '#4A6A4E')
                  : (darkMode ? '#C9BCEC' : '#8E5A77') },
            ]}>
              {isRingIn ? `⭕ ${t('ringInPlace')}` : `✋ ${t('ringRemoved')}`}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: darkMode ? 'rgba(181,165,226,0.22)' : theme.primaryLight }]}>
            <Text style={[styles.pillText, { color: theme.primaryDark }]}>
              📅 {t('dayXOf28', { day: info.currentDay })}
            </Text>
          </View>
        </Animated.View>

        {/* Withdrawal-period gauge — affichée UNIQUEMENT pendant la pause (ring-out).
            Contextualise visuellement les 7 jours d'attente avant la prochaine
            insertion (marqueur glissant, countdown, pulse).
            Masquée en awaiting-reinsertion : la pause est techniquement
            terminée et la grosse jauge inactive 21 j prend le relais comme
            seul rappel à l'écran. */}
        {!isRingIn && !isAwaitingReinsertion && (
          <Animated.View entering={FadeInUp.delay(550).duration(500).springify()}>
            <WithdrawalGauge
              dayInPause={Math.max(1, info.currentDay - RING_IN_DAYS)}
              totalPauseDays={RING_OUT_DAYS}
              daysUntilInsertion={info.daysUntilChange}
            />
          </Animated.View>
        )}

        {/* Action button — main interaction */}
        <Animated.View entering={FadeInUp.delay(600).duration(600).springify()}>
          <View style={styles.actionRow}>
            {/* v2.6.5: replaced PNG / emoji with Ionicons vector
                glyphs — clean line-art that matches the drawer set
                and adapts to dark/light via the `color` prop. */}
            {isRingIn ? (
              <ActionButton
                icon={
                  <Ionicons
                    name="remove-circle-outline"
                    size={42}
                    color={darkMode ? theme.primary : theme.primaryDark}
                  />
                }
                label={t('removedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={() => setConfirmAction('remove')}
              />
            ) : (
              <ActionButton
                icon={
                  <Ionicons
                    name="add-circle-outline"
                    size={42}
                    color={darkMode ? theme.primary : theme.primaryDark}
                  />
                }
                label={t('insertedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={() => setConfirmAction('insert')}
              />
            )}
          </View>
        </Animated.View>

        {/* Explanation + key dates */}
        <Animated.View entering={FadeInUp.delay(800).duration(600).springify()} style={[styles.explainCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.explainTitle, { color: theme.text }, isRTL && styles.rtlText]}>
            {isRingIn ? t('ringInPlaceExplain') : t('pauseExplain')}
          </Text>
          <Text style={[styles.explainBody, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
            {isRingIn
              ? t('ringInExplainBody', { day: info.currentDay, days: info.daysUntilChange })
              : t('pauseInProgressBody', { days: info.daysUntilChange })
            }
          </Text>
          {info.insertionDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }, isRTL && styles.rtlText]}>
              ⭕ {t('insertedOn', { date: formatDateTimeFr(info.insertionDateTime) })}
            </Text>
          )}
          {info.removalDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }, isRTL && styles.rtlText]}>
              ♻️ {`${t('removalShort')} : ${formatDateTimeFr(info.removalDateTime)}`}
            </Text>
          )}
          {info.nextInsertionDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }, isRTL && styles.rtlText]}>
              🔄 {`${t('nextCycle')} : ${formatDateTimeFr(info.nextInsertionDateTime)}`}
            </Text>
          )}
        </Animated.View>

        {/* "Suivi des règles" supprimé en v2.6.1 — l'onglet "Mes périodes"
            (drawer) couvre maintenant le suivi de manière complète et
            intuitive : calendrier dédié, prédiction, rappels, intensité
            par jour. Garder la grille 7-jours ici doublonnait l'UX et
            posait un problème de cohérence (logs créés ici étaient des
            single-day, ceux de la nouvelle section sont des périodes
            multi-jours guidées). */}

        {/* Reset link */}
        <Animated.View entering={FadeIn.delay(1200).duration(400)}>
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: theme.textLight }]}>
              🔄 {t('restartFromBeginning')}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <ConfirmActionModal
        visible={!!confirmAction}
        action={confirmAction || 'insert'}
        isEarly={confirmAction === 'remove' && info.currentDay < 22}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />

    </SafeAreaView>
  );
}

// LegendDot helper removed in v2.6.1 — only consumer was the home-screen
// "Suivi des règles" section, itself removed. The "Mes périodes" tab has
// its own LegendDot inside app/periods.tsx.

// Styles moved to ./index.styles (imported above as `styles`).
