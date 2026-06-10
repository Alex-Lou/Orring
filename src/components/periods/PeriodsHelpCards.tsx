/**
 * The two collapsible explainer cards for the "Mes périodes" screen
 * (app/periods.tsx): the "✨ À savoir" independence card and the
 * "Comment ça marche" how-it-works card.
 *
 * Extracted verbatim — the JSX, copy, animations, and styles are
 * byte-for-byte the same as when they lived inline in periods.tsx. The
 * only structural change required by the move is that each card now OWNS
 * its own collapsible open-state (`aboutOpen` / `howItWorksOpen`) instead
 * of reading it from the screen. The two states were already independent,
 * so this is a pure relocation with no behavior change.
 *
 * `theme` / `isRTL` / `t` are passed in (same values the screen used) so
 * the components stay presentational and the hook call sites don't change.
 */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import type { useTheme } from '../../theme/useTheme';
import type { useTranslation } from 'react-i18next';
import { styles } from '../../../app/periods.styles';
import { TipStep } from './PeriodParts';

type Theme = ReturnType<typeof useTheme>;
type T = ReturnType<typeof useTranslation>['t'];

/**
 * "Indépendant" explanation — collapsible to free vertical space once
 * the user gets it. Header is tappable, body fades in/out via React's
 * mount/unmount + the Animated.View entering animation.
 *
 * Default CLOSED (v2.6.8) so the screen lands compact — the calendar +
 * summary card are the priority. State stays in component scope so a
 * tap-to-expand persists across re-renders inside the same session.
 */
export function IndependenceCard({ theme, isRTL, t }: { theme: Theme; isRTL: boolean; t: T }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <View style={[styles.independenceCard, { backgroundColor: theme.primarySoft }]}>
      <Pressable
        onPress={() => setAboutOpen(o => !o)}
        style={[styles.collapsibleHeader, isRTL && styles.rtlRow]}
        hitSlop={6}
      >
        <Text style={[styles.independenceLabel, { color: theme.primaryDark, marginBottom: 0 }]}>
          {t('periodsIndependenceLabel', { defaultValue: '✨ À savoir' })}
        </Text>
        <Text style={[styles.collapsibleCaret, { color: theme.primaryDark }]}>
          {aboutOpen ? '▾' : '▸'}
        </Text>
      </Pressable>
      {aboutOpen && (
        <Animated.Text
          entering={FadeIn.duration(200)}
          style={[styles.independenceBody, { color: theme.primaryDark, marginTop: 6 }]}
        >
          {t('periodsIndependenceBody', {
            defaultValue:
              "Ce calendrier est indépendant de celui de l'anneau. Il garde un suivi spécifique de tes périodes, sans rien mélanger avec ton cycle d'insertion / retrait.",
          })}
        </Animated.Text>
      )}
    </View>
  );
}

/**
 * How it works — compact illustrated steps. Each step is a row
 * [emoji · short copy] so the user gets the whole loop in one glance:
 * TAP → CONTINUE → END → AUTOMATIC. The text was kept under 50
 * characters per line on purpose — if it doesn't fit, it isn't simple
 * enough.
 */
export function HowItWorksCard({ theme, isRTL, t }: { theme: Theme; isRTL: boolean; t: T }) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  return (
    <Animated.View
      entering={FadeInUp.delay(550).duration(500)}
      style={[styles.tipCard, { backgroundColor: theme.surface }]}
    >
      <Pressable
        onPress={() => setHowItWorksOpen(o => !o)}
        style={[styles.collapsibleHeader, isRTL && styles.rtlRow]}
        hitSlop={6}
      >
        <Text style={[styles.tipTitle, { color: theme.text }]}>
          {t('periodsTipTitle', { defaultValue: 'Comment ça marche' })}
        </Text>
        <Text style={[styles.collapsibleCaret, { color: theme.text }]}>
          {howItWorksOpen ? '▾' : '▸'}
        </Text>
      </Pressable>
      {howItWorksOpen && (
        <Animated.View entering={FadeIn.duration(220)}>
          <Text style={[styles.tipLead, { color: theme.textSecondary }]}>
            {t('periodsTipLead', {
              defaultValue: 'Trois gestes simples, le reste est automatique.',
            })}
          </Text>

          <TipStep
            theme={theme}
            emoji="①"
            title={t('periodsTipStep1Title', { defaultValue: 'Premier jour' })}
            body={t('periodsTipStep1Body', {
              defaultValue: 'Tape le jour où tes règles commencent et choisis l\'intensité du flux.',
            })}
          />
          <TipStep
            theme={theme}
            emoji="②"
            title={t('periodsTipStep2Title', { defaultValue: 'Chaque jour suivant' })}
            body={t('periodsTipStep2Body', {
              defaultValue: 'Reviens dans l\'app, tape le jour, indique l\'intensité du flux. La période s\'allonge toute seule.',
            })}
          />
          <TipStep
            theme={theme}
            emoji="③"
            title={t('periodsTipStep3Title', { defaultValue: 'Marque la fin' })}
            body={t('periodsTipStep3Body', {
              defaultValue: "Quand c'est terminé, tape ton dernier jour loggué et choisis « Marquer comme dernier ».",
            })}
          />
          <TipStep
            theme={theme}
            emoji="✨"
            title={t('periodsTipAutoTitle', { defaultValue: 'Automatique' })}
            body={t('periodsTipAutoBody', {
              defaultValue: "À partir du 2e cycle, l'app prédit la suivante et envoie 3 rappels (2j avant, le jour prévu, 3j de retard).",
            })}
            highlighted
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
