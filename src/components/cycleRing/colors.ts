import { colors } from '../../theme';

/**
 * Resolved palette for a single CycleRing render, derived purely from
 * `darkMode` and `isRingIn`. Pure relocation of the inline ternary block that
 * used to live at the top of CycleRing — every value is byte-for-byte
 * identical, only moved here.
 *
 * NOTE: `tickColor` is intentionally NOT part of this palette: it depends on
 * the resolved `theme` object (`theme.textLight` / `theme.textSecondary`),
 * not on `darkMode`/`isRingIn` alone, so it stays inline in the component.
 */
export interface RingColors {
  progressColor: string;
  bgColor: string;
  liquidTopColor: string;
  liquidBottomColor: string;
  todayGlowColor: string;
  todayCoreColor: string;
}

export function resolveRingColors(darkMode: boolean, isRingIn: boolean): RingColors {
  // Progress arc color. In DARK mode, ring-in stays green (that reads well
  // on a near-black surface). In LIGHT mode we invert: ring-in is PERVENCHE
  // (periwinkle), so the liquid + arc are periwinkle-dominant and the UX
  // feels like a day/night mirror of the dark theme.
  // Progress arc colour. Ring-IN keeps green (dark) / pervenche (light),
  // Ring-OUT now matches the new cranberry liquid: a saturated rose-red
  // arc on dark, deep cranberry on light.
  const progressColor = darkMode
    ? (isRingIn ? '#6FA876' : '#D8556B')
    : (isRingIn ? '#7B7FCD' : '#A8324A');

  // Background ring tint — kept very desaturated so the arc and liquid
  // dominate. Ring-OUT goes pinkish-red wash on both modes to harmonize
  // with the cranberry liquid without competing for attention.
  const bgColor = darkMode
    ? (isRingIn ? 'rgba(158,198,164,0.2)' : 'rgba(220,90,110,0.22)')
    : (isRingIn ? colors.ringInLight : 'rgba(220,90,110,0.18)');

  // Liquid gradient — MIRRORED between modes AND phase-aware:
  //   RING-IN  (21 j pré-retrait) : palette cool (vert ↔ pervenche)
  //   RING-OUT (7 j de pause)     : palette warm (blush ↔ rose/corail)
  //
  //   DARK  : top = crête d'accent,  body = teinte profonde   → body-dominant
  //   LIGHT : top = teinte douce,    body = teinte affirmée   → body-dominant
  // Le stop gradient à 0.22 dans les Defs garde la crête fine pour que le
  // corps domine visuellement.
  // Ring-OUT (7 j de pause) is now a CRANBERRY palette — saturated red,
  // thematic for the menstrual phase that often coincides with the pause.
  // Lighter at the top crest, deeper at the body, mirrored between dark
  // (warm coral crest → wine body) and light (rose-red crest → cranberry
  // body) just like the ring-in green/pervenche pair.
  const liquidTopColor = darkMode
    ? (isRingIn
        ? 'rgba(170, 150, 225, 0.88)'    // dark ring-in : purple crest
        : 'rgba(245, 130, 130, 0.88)')   // dark ring-out: warm coral-red crest
    : (isRingIn
        ? 'rgba(170, 215, 180, 0.78)'    // light ring-in : soft green accent
        : 'rgba(235, 130, 145, 0.80)');  // light ring-out: rose-red accent
  const liquidBottomColor = darkMode
    ? (isRingIn
        ? 'rgba(95, 160, 110, 0.92)'     // dark ring-in : deep forest green
        : 'rgba(170, 60, 75, 0.92)')     // dark ring-out: wine cranberry body
    : (isRingIn
        ? 'rgba(145, 140, 215, 0.85)'    // light ring-in : pervenche body
        : 'rgba(195, 70, 90, 0.88)');    // light ring-out: deep cranberry body

  // Today-pulse glow + core. Ring-OUT switches to a soft pink-red glow /
  // light-rose core to match the cranberry palette while staying readable
  // against the deep liquid body.
  const todayGlowColor = darkMode
    ? (isRingIn ? 'rgba(158, 228, 172, 0.55)' : 'rgba(255, 170, 180, 0.60)')
    : (isRingIn ? 'rgba(160, 155, 225, 0.60)' : 'rgba(230, 120, 140, 0.60)');
  const todayCoreColor = darkMode
    ? (isRingIn ? '#CFEFD6' : '#FFE2E5')
    : (isRingIn ? '#DBD8F3' : '#FFD7DD');

  return {
    progressColor,
    bgColor,
    liquidTopColor,
    liquidBottomColor,
    todayGlowColor,
    todayCoreColor,
  };
}
