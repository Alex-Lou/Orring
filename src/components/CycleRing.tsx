import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { useCycleStore } from '../store/cycleStore';
import { useTranslation } from 'react-i18next';
import { styles } from './cycleRing/CycleRing.styles';
import { resolveRingColors } from './cycleRing/colors';
import { buildStaticWave, buildTickPaths } from './cycleRing/geometry';
import { RingCenter } from './cycleRing/RingCenter';
import { RingCanvas } from './cycleRing/RingCanvas';

interface CycleRingProps {
  currentDay: number;
  size?: number;
  isRingIn: boolean;
  phaseLabel: string;
  daysLeft: number;
  nextAction: string;
  /**
   * When true, renders a "scaffold" version of the ring: just the dim
   * background outline and dial ticks, with no liquid, no progress arc
   * fill, no sparkles, no today-pulse and a faded centered label.
   *
   * Used as the post-pause "awaiting re-insertion" placeholder — the
   * upcoming 21-day cycle is visually present but visibly INERT, which
   * prompts the user to press "I inserted the ring" to activate it.
   * Once they confirm, ringStatus flips and the same component renders
   * fully animated again on the next frame.
   */
  inactive?: boolean;
}

export function CycleRing({
  currentDay,
  size = 280,
  isRingIn,
  phaseLabel,
  daysLeft,
  nextAction,
  inactive = false,
}: CycleRingProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const darkMode = useCycleStore(s => s.darkMode);

  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = radius - strokeWidth - 4;

  // Phase- + mode-aware palette (progress arc, background tint, liquid
  // gradient stops, today-pulse glow/core). Pure relocation — see
  // cycleRing/colors.ts for the per-value rationale comments.
  const {
    progressColor,
    bgColor,
    liquidTopColor,
    liquidBottomColor,
    todayGlowColor,
    todayCoreColor,
  } = resolveRingColors(darkMode, isRingIn);

  const tickColor = darkMode ? theme.textLight : theme.textSecondary;

  const totalDays = isRingIn ? 21 : 7;
  const dayInPhase = isRingIn ? currentDay : Math.max(0, currentDay - 21);
  const progress = Math.min(dayInPhase / totalDays, 1);
  // Jour J = retrait/réinsertion prévus aujourd'hui. Tous les pulses du
  // today-dot sont alors amplifiés et on ajoute une couronne externe
  // pour que l'événement saute aux yeux dès le coup d'œil.
  const isDDay = daysLeft === 0;
  // On cache normalement le today-dot quand la jauge est pleine, mais on
  // garde une exception pour le jour J : c'est justement là qu'on veut
  // le plus le voir (dot amplifié + couronne externe).
  const showToday = progress > 0.002 && (progress < 1.0 || isDDay);

  // Deux Path pour les ticks — voir cycleRing/geometry.ts (buildTickPaths) :
  // une passe unique sur `totalDays`, segment trié dans `passed`/`unpassed`,
  // deux draw calls au total quel que soit `totalDays`.
  const ticksPaths = useMemo(
    () => buildTickPaths(radius, strokeWidth, cx, cy, totalDays, dayInPhase),
    [radius, strokeWidth, cx, cy, totalDays, dayInPhase],
  );

  const clipId = useMemo(() => `liquidClip-${Math.round(size)}`, [size]);
  const gradientId = useMemo(() => `liquidGrad-${Math.round(size)}`, [size]);

  const waveWidth = 4 * innerR;
  const waveDepth = 4 * innerR;
  const waveD = useMemo(
    () => buildStaticWave(waveWidth, waveDepth),
    [waveWidth, waveDepth],
  );

  // ── UI-thread animation via Reanimated ───────────────────────────────────
  // A handful of shared values, each looping at a fixed period. They run on
  // the UI thread, so they cause NO JS re-renders, bridge calls or React
  // reconciliations; the derived transforms / radii / paths are computed in
  // useAnimatedProps (also UI-thread) and pushed straight to the native view.
  // This is the key fix for the perceived lag of the previous setInterval +
  // setState approach: after mount, the JS thread is idle.
  const slidePhase = useSharedValue(0);
  const bobPhase = useSharedValue(0);
  const pulsePhase = useSharedValue(0);
  // Two bubble progress values, each a linear 0 → 1 loop. Driving them on
  // the UI thread means the bubbles cost effectively nothing on the JS side
  // — they're just two more native-driven shared values.
  const bubble1Phase = useSharedValue(0);
  const bubble2Phase = useSharedValue(0);
  // Single shared value that all sparkles read; each applies its own phase
  // offset inside useAnimatedProps so they twinkle out of sync.
  const sparklePhase = useSharedValue(0);

  useEffect(() => {
    slidePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 6200, easing: Easing.linear }),
      -1,
      false,
    );
    bobPhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    );
    pulsePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    bubble1Phase.value = withRepeat(
      withTiming(1, { duration: 5500, easing: Easing.linear }),
      -1,
      false,
    );
    // Offset bubble 2 by starting from a mid-cycle value so the two
    // bubbles never rise in sync.
    bubble2Phase.value = 0.45;
    bubble2Phase.value = withRepeat(
      withTiming(1, { duration: 7200, easing: Easing.linear }),
      -1,
      false,
    );
    // Sparkle master phase — a single linear 0 → 2π loop. Every static
    // sparkle reads from this value + its own index-based phase offset,
    // producing a soft wave of brightness that ripples along the row
    // instead of a synchronized all-on/all-off pulse. 4 s period keeps the
    // shimmer gentle (calling it "scintillant" not "clignotant").
    sparklePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [
    slidePhase, bobPhase, pulsePhase, bubble1Phase, bubble2Phase, sparklePhase,
  ]);

  // Static level — the pool sits at `progress` from the very first frame.
  const surfaceY = cy + innerR - 2 * innerR * progress;
  const slideAmp = (waveWidth - 2 * innerR) / 2;

  const waveAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const tx = -waveWidth / 2 + slideAmp * Math.sin(slidePhase.value);
    // Vertical bob has a primary slow roll + a subtle faster wobble so the
    // surface never looks like a perfectly periodic sine.
    const bob =
      Math.sin(bobPhase.value) * 2.2 +
      Math.sin(bobPhase.value * 2.3 + 0.7) * 0.7;
    return {
      transform: [
        { translateX: cx + tx },
        { translateY: surfaceY + bob },
      ],
    } as any;
  });

  const todayAngle = -Math.PI / 2 + progress * 2 * Math.PI;
  const todayX = cx + radius * Math.cos(todayAngle);
  const todayY = cy + radius * Math.sin(todayAngle);

  const todayGlowAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const pulse = 0.5 + 0.5 * Math.sin(pulsePhase.value);
    if (isDDay) {
      return {
        r: strokeWidth * 1.1 + pulse * 5.5,
        opacity: 0.55 + 0.40 * pulse,
      } as any;
    }
    return {
      r: strokeWidth * 0.75 + pulse * 3.0,
      opacity: 0.45 + 0.35 * pulse,
    } as any;
  });

  const todayCoreAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const pulse = 0.5 + 0.5 * Math.sin(pulsePhase.value);
    if (isDDay) {
      return {
        r: strokeWidth * 0.52 + pulse * 1.8,
      } as any;
    }
    return {
      r: strokeWidth * 0.36 + pulse * 1.2,
    } as any;
  });

  // Couronne externe du jour J — second anneau plus large et plus lent
  // (cos → déphasé d'un quart par rapport au pulse principal) pour créer
  // une respiration entrelacée qui attire l'œil sans clignoter.
  const dDayHaloAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const halo = 0.5 + 0.5 * Math.cos(pulsePhase.value);
    return {
      r: strokeWidth * 1.4 + halo * 10.0,
      opacity: 0.12 + 0.28 * halo,
    } as any;
  });

  // Bubbles — cy rises from the pool floor toward just below the surface,
  // opacity fades in and out via sin(πt) so the reset at t=1 → 0 is
  // invisible. Static cx per bubble (cheaper, and the small pool doesn't
  // need horizontal drift to read as lively).
  const poolBottom = cy + innerR;
  const bubble1X = cx - innerR * 0.28;
  const bubble2X = cx + innerR * 0.24;
  const showBubbles = progress > 0.05;

  const bubble1AnimatedProps = useAnimatedProps(() => {
    'worklet';
    const t = bubble1Phase.value;
    const startY = poolBottom - 2;
    const endY = surfaceY + 3;
    return {
      cy: startY + (endY - startY) * t,
      opacity: Math.sin(t * Math.PI) * 0.82,
    } as any;
  });

  const bubble2AnimatedProps = useAnimatedProps(() => {
    'worklet';
    const t = bubble2Phase.value;
    const startY = poolBottom - 2;
    const endY = surfaceY + 3;
    return {
      cy: startY + (endY - startY) * t,
      opacity: Math.sin(t * Math.PI) * 0.82,
    } as any;
  });

  const bubbleColor = darkMode
    ? 'rgba(225, 245, 230, 0.75)'
    : 'rgba(252, 252, 255, 0.90)';

  // ── XP-bar shimmer over the filled progress arc (theme-aware) ───────────
  // Two layers survive: L3 "grain" (one cyan sparkle per reached day tick,
  // pseudo-random phase offsets) + passed-ticks (reached barres breathe in
  // cyan in sync). Two earlier layers were removed — L2 "sweep" (tangential
  // band, distracting even at near-zero alpha) and L1 "breath" (a second
  // pulsing stroke that read as a liquid halo bleeding around the cadran).
  const showSparkles = progress > 0.03;

  // Shared cyan palette for all shimmer layers. Dark mode gets saturated
  // neon; light mode stays cooler so nothing burns out over periwinkle.
  const coreColor = darkMode
    ? 'rgba(170, 244, 255, 0.98)' // bright neon cyan
    : 'rgba(110, 210, 225, 0.92)'; // softer teal
  const haloColor = darkMode
    ? 'rgba(126, 228, 255, 0.32)' // cyan bloom on dark
    : 'rgba(95, 195, 215, 0.30)'; // teal bloom on light

  // L3 grain count: ONE sparkle per REACHED day (i ∈ [0, dayInPhase)),
  // placed at the same angle formula as `buildTickPaths` so each passed
  // day's barre carries its own glint; future ticks stay sober grey.
  const sparkleCount = dayInPhase;

  const corePathProps = useAnimatedProps(() => {
    'worklet';
    let d = '';
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / totalDays) * 2 * Math.PI - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      // Per-sparkle deterministic phase offset — each tick glints on
      // its own rhythm so the row doesn't feel like a synchronized
      // marquee. Pure hash, no RNG state.
      const hash = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const phi = (hash - Math.floor(hash)) * 2 * Math.PI;
      const shimmer = 0.5 + 0.5 * Math.sin(sparklePhase.value + phi);
      const r = 0.8 + shimmer * 1.0; // 0.8 → 1.8 px
      d += 'M' + (x + r).toFixed(2) + ' ' + y.toFixed(2) +
           ' A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' +
           (x - r).toFixed(2) + ' ' + y.toFixed(2) +
           ' A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' +
           (x + r).toFixed(2) + ' ' + y.toFixed(2) + ' Z ';
    }
    return { d } as any;
  });

  const haloPathProps = useAnimatedProps(() => {
    'worklet';
    let d = '';
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / totalDays) * 2 * Math.PI - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      const hash = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const phi = (hash - Math.floor(hash)) * 2 * Math.PI;
      const shimmer = 0.4 + 0.6 * Math.sin(sparklePhase.value + phi);
      const r = 1.8 + shimmer * 2.2; // 1.8 → 4.0 px halo
      d += 'M' + (x + r).toFixed(2) + ' ' + y.toFixed(2) +
           ' A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' +
           (x - r).toFixed(2) + ' ' + y.toFixed(2) +
           ' A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 1 0 ' +
           (x + r).toFixed(2) + ' ' + y.toFixed(2) + ' Z ';
    }
    return { d } as any;
  });

  // Ticks « passés » — respiration cyan douce synchronisée avec les
  // paillettes. L'opacité oscille dans une plage haute (0.75 → 1.0) pour
  // que chaque barre de jour franchi reste franchement lisible tout en
  // ayant un léger pouls vivant.
  const passedTicksAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const shimmer = 0.875 + 0.125 * Math.sin(sparklePhase.value);
    return { opacity: shimmer } as any;
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <RingCanvas
        size={size}
        cx={cx}
        cy={cy}
        radius={radius}
        innerR={innerR}
        strokeWidth={strokeWidth}
        circumference={circumference}
        clipId={clipId}
        gradientId={gradientId}
        inactive={inactive}
        darkMode={darkMode}
        bgColor={bgColor}
        progressColor={progressColor}
        progress={progress}
        liquidTopColor={liquidTopColor}
        liquidBottomColor={liquidBottomColor}
        waveD={waveD}
        showBubbles={showBubbles}
        bubble1X={bubble1X}
        bubble2X={bubble2X}
        bubbleColor={bubbleColor}
        showSparkles={showSparkles}
        haloColor={haloColor}
        coreColor={coreColor}
        tickColor={tickColor}
        ticksPaths={ticksPaths}
        showToday={showToday}
        isDDay={isDDay}
        todayX={todayX}
        todayY={todayY}
        todayGlowColor={todayGlowColor}
        todayCoreColor={todayCoreColor}
        waveAnimatedProps={waveAnimatedProps}
        bubble1AnimatedProps={bubble1AnimatedProps}
        bubble2AnimatedProps={bubble2AnimatedProps}
        haloPathProps={haloPathProps}
        corePathProps={corePathProps}
        passedTicksAnimatedProps={passedTicksAnimatedProps}
        dDayHaloAnimatedProps={dDayHaloAnimatedProps}
        todayGlowAnimatedProps={todayGlowAnimatedProps}
        todayCoreAnimatedProps={todayCoreAnimatedProps}
      />
      <RingCenter
        currentDay={currentDay}
        phaseLabel={phaseLabel}
        daysLeft={daysLeft}
        nextAction={nextAction}
        inactive={inactive}
        progressColor={progressColor}
        size={size}
        theme={theme}
        t={t}
      />
    </View>
  );
}
