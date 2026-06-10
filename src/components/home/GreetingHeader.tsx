import React from 'react';
import { View, Text, Image } from 'react-native';
import type { TFunction } from 'i18next';
import type { useTheme } from '../../theme/useTheme';
import type { CycleInfo } from '../../utils/cycle';
import { formatDateFr } from '../../utils/cycle';
import { pickTodayPhraseIndex, pickInsertionPhraseIndex } from '../../utils/greetings';
import { styles } from '../../../app/index.styles';
import {
  getGreetingKey,
  getGreetingIconKey,
  getPetState,
  GREETING_ICON_SRCS,
  type GreetingIconKey,
} from './greetingHelpers';

type Theme = ReturnType<typeof useTheme>;

interface GreetingHeaderProps {
  info: CycleInfo;
  userName: string | null;
  isRTL: boolean;
  theme: Theme;
  t: TFunction;
}

/**
 * Greeting header of the Home / "Mon Cycle" screen. Relocated verbatim from
 * app/index.tsx (move-only): the pet-bird block, the greeting text, the
 * time-of-day greeting-icon block, and the date-phrase block — including all
 * their per-variant style fixes (sizeFix, nightAlignFix, rtlNightFlip, …).
 * Conditional rendering, RTL/flip logic and values are unchanged.
 */
export function GreetingHeader({ info, userName, isRTL, theme, t }: GreetingHeaderProps) {
  return (
    <>
      <View
        style={[
          styles.greetingRow,
          isRTL && styles.rtlRow,
          // Slight pull toward the screen edge so the greeting text
          // visually aligns with the date line below it, instead of
          // being pushed right by the full width of the bird. The
          // bird still sits inside the safe padding of the ScrollView.
          isRTL ? { marginRight: -8 } : { marginLeft: -8 },
        ]}
      >
        {(() => {
          // Pet state straight from the real clock — the
          // dev-time override picker was removed in v2.6.5.
          const petState = getPetState();
          if (petState === 'none') return null;
          const isAwake = petState === 'awake';
          // ZZZ is shown ONLY in the night slot (21h–5h). During the
          // evening slot (18h–21h) the bird already sleeps but stays
          // "quiet" — no Z's yet — matching the user's mental model
          // of "dodo profond seulement la nuit".
          const isNight = petState === 'night';
          // Natural artwork faces right. In LTR the awake bird sits
          // on the LEFT of the greeting and already points at the
          // text (no flip). The sleeping bird is mirrored for
          // aesthetic reasons (user preference). In RTL, row-reverse
          // swaps the bird to the RIGHT of the text, so each of the
          // two flip decisions inverts — keeping the bird always
          // facing the greeting in the awake state, and always
          // facing away in the sleeping state, regardless of
          // language direction.
          const flipBird = isAwake ? isRTL : !isRTL;
          return (
            <View style={styles.petWrap}>
              <Image
                source={
                  isAwake
                    ? require('../../../assets/OrringBluePetNoBgSalute.png')
                    : require('../../../assets/OrringBluePetSleepingNoBg.png')
                }
                style={[
                  styles.petBird,
                  flipBird && { transform: [{ scaleX: -1 }] },
                ]}
                resizeMode="contain"
              />
              {/* ZZZ affiché UNIQUEMENT la nuit (21h-5h), pas le soir.
                  Position : juste à CÔTÉ (pas au-dessus) de la tête du
                  piaf — à droite en LTR, à gauche en arabe. Le PNG
                  ZZZNoBg.png est déjà orienté lisible donc aucun
                  transform n'est appliqué. */}
              {isNight && (
                <Image
                  source={require('../../../assets/ZZZNoBg.png')}
                  style={[
                    styles.petZzz,
                    // Arabe (RTL) : miroir horizontal de la position
                    // LTR — ZZZ côté gauche du wrapper, toujours sans
                    // flip pour garder les Z lisibles.
                    isRTL
                      ? { left: -18, right: undefined }
                      : null,
                  ]}
                  resizeMode="contain"
                />
              )}
            </View>
          );
        })()}
        <Text
          // Keep everything on a single line so the grouping
          // [bird][text][icon] never wraps and the time-of-day icon
          // stays right next to the text. In languages where the
          // greeting + name is long (notably Arabic: "مساء الخير,
          // Alex"), instead of truncating with "…" we let the text
          // auto-shrink down to 60% of its size. That way the whole
          // name is always readable and the icon still sits snug
          // against the text.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[
            styles.greeting,
            { color: theme.primaryDark },
            // In RTL the row is reversed, so the bird lives on the
            // right visually. Right-aligning the text keeps it hugging
            // the bird instead of drifting to the far-left edge and
            // crowding the TempRemovalCountdown on the right.
            isRTL && { textAlign: 'right' },
          ]}
        >
          {t(getGreetingKey())}{userName ? `, ${userName}` : ''}
        </Text>
        {(() => {
          // Unified icon set — all four time-of-day glyphs now share
          // the same square framing & roughly equal weight.
          //   Matin / ApresMidi / Soir / Nuit
          // A debug override (set from the drawer header on this
          // screen) lets us preview any slot without waiting for the
          // clock. When the override is `null` we fall back to the
          // time-based resolver. The PNG registry lives at module
          // scope (GREETING_ICON_SRCS) so Metro always statically
          // resolves each asset.
          const resolved: GreetingIconKey = getGreetingIconKey();
          const src = GREETING_ICON_SRCS[resolved];
          // The latest Nuit.png is tightly framed (moon + night sky
          // reach every edge of the canvas, ~100% fill) — the other
          // three PNGs only fill ~85% of their canvas. So at an equal
          // bounding box, Nuit would render VISUALLY LARGER than its
          // siblings. Shrink it slightly so every greeting icon looks
          // the same visible size.
          const isNight = resolved === 'night';
          const sizeFix = isNight ? { width: 38, height: 38 } : null;
          // Nuit.png glyph sits a hair higher than the other greeting
          // icons (tighter top-crop). A small marginTop drops it a few
          // pixels into visual alignment with the text baseline.
          const nightAlignFix = isNight ? { marginTop: 4 } : null;
          // In Arabic the "ZZZ" puff on Nuit.png reads in the wrong
          // direction relative to the RTL script flow. Mirror it on
          // the X axis so the Z's drift outward like in LTR.
          const rtlNightFlip =
            isNight && isRTL ? { transform: [{ scaleX: -1 as const }] } : null;
          // Nuit.png has a slightly tighter left-crop than the other
          // three glyphs, so even at marginLeft: 0 it still reads as
          // glued to the greeting text. A 3px nudge restores the
          // visual breathing room in LTR only (RTL stays untouched).
          const nightExtraGapLTR =
            isNight && !isRTL ? { marginLeft: 3 } : null;
          return (
            <Image
              source={src}
              style={[
                styles.greetingIconImg,
                sizeFix,
                // Icon spacing relative to the greeting text.
                // • RTL: keep the tight tuck (-10) — Arabic glyph
                //   metrics leave plenty of natural air on the row.
                // • LTR: push the icon ~10px to the right of the
                //   text so it doesn't feel glued to the name.
                isRTL ? { marginRight: -10 } : { marginLeft: 0 },
                nightExtraGapLTR,
                nightAlignFix,
                rtlNightFlip,
              ]}
              resizeMode="contain"
            />
          );
        })()}
      </View>
      {(() => {
        // ── Today's date wrapped in a warm rotating phrase
        // (date-seeded, stable per day, ~20 variants per
        // locale — see src/utils/greetings.ts for picker).
        const now = new Date();
        const todayStr = formatDateFr(now, 'EEEE dd MMMM');
        const todayIdx = pickTodayPhraseIndex(now);
        const todayPhrase = t(`todayPhrases.${todayIdx}`, {
          date: todayStr,
          defaultValue: todayStr,
        });
        // ── Ring-insertion date wrapped likewise (3 variants).
        const insertStr = formatDateFr(info.ringInsertDate, 'EEEE dd MMMM');
        const insertIdx = pickInsertionPhraseIndex(info.ringInsertDate);
        const insertPhrase = t(`insertionPhrases.${insertIdx}`, {
          date: insertStr,
          defaultValue: t('since', { date: formatDateFr(info.ringInsertDate, 'dd MMMM') }),
        });
        return (
          <>
            <Text
              style={[styles.date, { color: theme.textSecondary }, isRTL && styles.rtlText]}
              // Single line + auto-shrink down to 75% — the
              // wrapped phrases vary in length (20 variants
              // per locale, some quite long e.g. AR), so
              // adaptive scaling keeps them on one line.
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {todayPhrase}
            </Text>
            <Text style={[styles.since, { color: theme.textLight }, isRTL && styles.rtlText]}>
              {insertPhrase}
            </Text>
          </>
        );
      })()}
    </>
  );
}
