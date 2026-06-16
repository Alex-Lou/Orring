import React, { useState, useMemo, useEffect } from 'react';
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
import { router } from 'expo-router';
import { Onboarding } from '../src/components/Onboarding';
import { TempRemovalCountdown } from '../src/components/TempRemovalCountdown';
import { WithdrawalGauge } from '../src/components/WithdrawalGauge';
import {
  getCycleInfoFromLogs, computeRingCountdown, formatDateTimeFr,
  RING_IN_DAYS, RING_OUT_DAYS,
} from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
// Greeting header (pet bird + greeting text + time-of-day icon + date phrase)
// and its module-scope time-of-day helpers were extracted out of this file.
import { GreetingHeader } from '../src/components/home/GreetingHeader';
import { styles } from '../src/styles/index.styles';

export default function MyCycleScreen() {
  const {
    firstInsertDate, ringStatus, cycleLogs,
    insertRing, removeRing, clearHistory, hasOnboarded, userName, darkMode, startTempRemoval,
    tempRemovalStart, cancelTempRemoval,
    // (the greeting-icon debug override was removed in v2.6.5)
  } = useCycleStore();
  const { width } = useWindowDimensions();
  const [confirmAction, setConfirmAction] = useState<'insert' | 'remove' | null>(null);
  // (selectedPeriodDate state removed alongside pauseDays grid in v2.6.1)
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const confirm = useConfirm();

  // Live clock — drives the whole home screen's real-time refresh. Hooks live
  // ABOVE the onboarding early-return so the hook order is identical every
  // render (Rules of Hooks — a hook after the return crashed the app the
  // moment onboarding completed and `info` flipped from null to present).
  // 30s cadence keeps the minute display accurate.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // `info` recomputes on every tick → currentDay / daysUntilChange / isOverdue
  // / phase all stay live without relaunching the app (the "temps réel" ask),
  // and the whole screen flips together at the day boundary.
  const info = useMemo(
    () => firstInsertDate
      ? getCycleInfoFromLogs(new Date(firstInsertDate), cycleLogs, ringStatus, new Date(now))
      : null,
    [firstInsertDate, cycleLogs, ringStatus, now]
  );

  const isRingIn = ringStatus === 'in';

  // During a TEMPORARY removal the ring is physically out (the cycle clock
  // keeps ticking), so the gauge / pill / greeting must NOT read "Anneau en
  // place" — that contradicts the "J'ai remis l'anneau" action.
  const isTempRemoved = !!tempRemovalStart;

  // Ring-center countdown override (pure, unit-tested helper): null above 24h,
  // exact "Xh Ym" under 24h, and "de retard" ONLY once info.isOverdue flips —
  // the SAME day-grained basis as the pill / greeting, so they never disagree
  // within a calendar day.
  const nextActionAt = info ? (isRingIn ? info.removalDateTime : info.nextInsertionDateTime) : null;
  const countdown = useMemo(
    () => (isTempRemoved || !info ? null : computeRingCountdown(nextActionAt, info.isOverdue, now)),
    [isTempRemoved, info, nextActionAt, now],
  );

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

  // Brand-new / factory-reset user (no name/language yet) → full first-run
  // flow (splash → language → name). It no longer forces a ring.
  if (!hasOnboarded) {
    return <Onboarding onComplete={() => { /* state will re-render from store */ }} />;
  }

  const ringSize = Math.min(width - 60, 300);

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

  // ── Empty home — onboarded but NO ring anchored yet ──────────────────────
  // A user who skipped the ring (just exploring / tracking periods) or who
  // tapped "Recommencer mon cycle". The liquid gauge is drawn but EMPTY
  // (inactive); they insert the ring whenever they want, or head to "Mes
  // périodes". `info` is null here, so the cycle home below is never reached.
  if (!firstInsertDate || !info) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.header}>
            <GreetingHeader info={null} userName={userName} isRTL={isRTL} isTempRemoved={false} theme={theme} t={t} />
          </Animated.View>

          {/* Empty (inactive) gauge — drawn, no liquid fill, dim invite center. */}
          <Animated.View key="empty-ring" entering={FadeIn.delay(300).duration(900)} style={styles.ringWrapper}>
            <CycleRing
              currentDay={1}
              size={ringSize}
              isRingIn
              phaseLabel={t('ringInPlace')}
              daysLeft={0}
              nextAction={t('insertionAction')}
              inactive
            />
          </Animated.View>

          {/* Chill, no-pressure intro */}
          <Animated.View entering={FadeInUp.delay(500).duration(600)} style={[styles.explainCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.explainTitle, { color: theme.text }, isRTL && styles.rtlText]}>
              {t('noRingTitle')}
            </Text>
            <Text style={[styles.explainBody, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
              {t('noRingBody')}
            </Text>
          </Animated.View>

          {/* Two equal paths: insert the ring, or just track periods */}
          <Animated.View entering={FadeInUp.delay(650).duration(600)}>
            <View style={styles.actionRow}>
              <ActionButton
                icon={<Ionicons name="add-circle-outline" size={42} color={darkMode ? theme.primary : theme.primaryDark} />}
                label={t('insertedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={() => setConfirmAction('insert')}
              />
            </View>
            <View style={styles.actionRow}>
              <ActionButton
                icon={<Ionicons name="water-outline" size={42} color={darkMode ? '#C9BCEC' : '#8E5A77'} />}
                label={t('noRingPeriodsCta')}
                color={darkMode ? '#C9BCEC' : '#8E5A77'}
                bgColor={darkMode ? 'rgba(181,165,226,0.12)' : colors.ringOutLight}
                onPress={() => router.push('/periods')}
              />
            </View>
          </Animated.View>
        </ScrollView>

        <ConfirmActionModal
          visible={!!confirmAction}
          action={confirmAction || 'insert'}
          isEarly={false}
          insertionDate={null}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmAction(null)}
        />
      </SafeAreaView>
    );
  }

  const nextActionLabel = info.nextAction === 'remove' ? t('removalAction') : t('insertionAction');

  // The big ring number is PHASE-relative: while worn it's the cycle day
  // (J1..J21), but during the pause it must count the pause itself (J1..J7
  // "sans anneau") — so removing on day 3 reads "J1" (pause just started),
  // not "J3". pauseDay = how many days into the 7-day pause we are.
  const pauseDay = Math.min(RING_OUT_DAYS, Math.max(1, RING_OUT_DAYS - info.daysUntilChange + 1));
  const ringDisplayDay = isRingIn ? info.currentDay : pauseDay;

  // Ring/pill label (not a hook — safe after the early return). Temp removal
  // wins over the in/out phase so it never contradicts the action button.
  const ringPhaseLabel = isTempRemoved
    ? t('tempRemovedRing')
    : isRingIn ? t('ringInPlace') : t('pause');

  // Countdown override → display strings (label differs soon vs overdue).
  const countdownOverride = countdown?.value ?? null;
  const countdownLabel = countdown ? t(countdown.labelKey, { action: nextActionLabel }) : null;

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
      // Ring/cycle only — keeps périodes, language, name. firstInsertDate
      // becomes null → the screen shows the ring-only re-entry (date + time).
      // (Full factory reset lives in Settings → "Effacer mes données".)
      clearHistory();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header.
            The temporary-removal timer lives on its OWN row above the
            greeting (right-aligned, left in RTL) so it can never (a) collide
            with a long "Bonsoir, <name>" line, nor (b) steal horizontal
            width from the greeting block and force the date phrase to
            auto-shrink. The greeting + date phrases then always span the
            full width. The row is rendered only while a timer is active. */}
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.header}>
          {tempRemovalStart && (
            <View style={[styles.timerRow, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
              <TempRemovalCountdown />
            </View>
          )}
          <GreetingHeader info={info} userName={userName} isRTL={isRTL} isTempRemoved={isTempRemoved} theme={theme} t={t} />
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
            currentDay={ringDisplayDay}
            size={ringSize}
            isRingIn={isAwaitingReinsertion ? true : isRingIn}
            phaseLabel={ringPhaseLabel}
            daysLeft={info.daysUntilChange}
            countdownOverride={countdownOverride}
            countdownLabel={countdownLabel}
            nextAction={nextActionLabel}
            inactive={isAwaitingReinsertion}
          />
        </Animated.View>

        {/* Status pills */}
        <Animated.View entering={SlideInRight.delay(500).duration(500).springify()} style={[styles.pillsRow, isRTL && styles.rtlRow]}>
          <View style={[
            styles.pill,
            (isRingIn && !isTempRemoved)
              ? { backgroundColor: darkMode ? 'rgba(158,198,164,0.18)' : colors.ringInLight }
              : { backgroundColor: darkMode ? 'rgba(181,165,226,0.18)' : colors.ringOutLight },
          ]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[
                styles.pillText,
                { color: (isRingIn && !isTempRemoved)
                    ? (darkMode ? '#9EC6A4' : '#4A6A4E')
                    : (darkMode ? '#C9BCEC' : '#8E5A77') },
              ]}>
              {isTempRemoved
                ? `⏸️ ${t('tempRemovedRing')}`
                : isRingIn ? `⭕ ${t('ringInPlace')}` : `✋ ${t('ringRemoved')}`}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: darkMode ? 'rgba(181,165,226,0.22)' : theme.primaryLight }]}>
            <Text style={[styles.pillText, { color: theme.primaryDark }]}>
              {/* Phase-consistent with the ring: cycle day while worn,
                  pause day (J1..J7 sans anneau) during the pause — so it
                  never says "J1" in the ring but "3/28" here. */}
              {isRingIn
                ? `📅 ${t('dayXOf28', { day: info.currentDay })}`
                : `✋ ${t('pause')} · J${pauseDay}/${RING_OUT_DAYS}`}
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
              dayInPause={Math.min(RING_OUT_DAYS, Math.max(1, RING_OUT_DAYS - info.daysUntilChange + 1))}
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
                and adapts to dark/light via the `color` prop.
                While a TEMPORARY removal is running the ring is
                physically out (cycle clock keeps ticking), so the
                only sensible action is "I put it back" — offering
                "remove" again here was the breach. Putting it back
                just stops the 3 h timer; it does NOT start a new
                cycle (cancelTempRemoval, not insertRing). */}
            {tempRemovalStart ? (
              <ActionButton
                icon={
                  <Ionicons
                    name="add-circle-outline"
                    size={42}
                    color={darkMode ? theme.primary : theme.primaryDark}
                  />
                }
                label={t('reinsertedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={async () => {
                  // Confirm before stopping the temp-removal timer, so a
                  // stray tap doesn't silently end it with no feedback.
                  if (await confirm({
                    title: t('reinsertConfirmTitle'),
                    body: t('reinsertConfirmBody'),
                    confirmLabel: t('reinsertedRing'),
                    emoji: '⭕',
                  })) {
                    cancelTempRemoval();
                  }
                }}
              />
            ) : isRingIn ? (
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
        insertionDate={info.insertionDateTime}
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
