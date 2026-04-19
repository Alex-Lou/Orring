import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, ClipPath, Path, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fontWeight } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useCycleStore } from '../store/cycleStore';
import { useTranslation } from 'react-i18next';

// Animated wrappers over the raw SVG primitives. Creating these at module
// scope (rather than inside the component) is important — otherwise every
// render creates a new component type and Reanimated tears down + rebuilds
// the animated attachments each time.
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface CycleRingProps {
  currentDay: number;
  size?: number;
  isRingIn: boolean;
  phaseLabel: string;
  daysLeft: number;
  nextAction: string;
}

// Static wave — extra wide so the horizontal slide never exposes an edge,
// extra deep so the fill always reaches the pool floor. Built once per
// innerR value via useMemo inside the component.
function buildStaticWave(waveWidth: number, waveDepth: number): string {
  // Slightly more pronounced wave now that Reanimated proved the UI-thread
  // animation doesn't break a sweat — two superimposed sines give the
  // surface an organic "breathing" feel instead of a single flat ripple.
  const samples = 28;
  const amp1 = 4.5;
  const amp2 = 1.6;
  const freq1 = 2.2;
  const freq2 = 4.7;
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * waveWidth;
    const y =
      Math.sin(t * freq1 * 2 * Math.PI) * amp1 +
      Math.sin(t * freq2 * 2 * Math.PI + 1.3) * amp2;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  d += 'L' + waveWidth.toFixed(1) + ' ' + waveDepth.toFixed(1) + ' ';
  d += 'L 0 ' + waveDepth.toFixed(1) + ' Z';
  return d;
}

export function CycleRing({
  currentDay,
  size = 280,
  isRingIn,
  phaseLabel,
  daysLeft,
  nextAction,
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

  // Progress arc color. In DARK mode, ring-in stays green (that reads well
  // on a near-black surface). In LIGHT mode we invert: ring-in is PERVENCHE
  // (periwinkle), so the liquid + arc are periwinkle-dominant and the UX
  // feels like a day/night mirror of the dark theme.
  const progressColor = darkMode
    ? (isRingIn ? '#6FA876' : '#9A86C9')
    : (isRingIn ? '#7B7FCD' : '#8B6FB8');

  const bgColor = darkMode
    ? (isRingIn ? 'rgba(158,198,164,0.2)' : 'rgba(181,165,226,0.22)')
    : (isRingIn ? colors.ringInLight : colors.ringOutLight);

  const tickColor = darkMode ? theme.textLight : theme.textSecondary;

  // Liquid gradient — MIRRORED between modes:
  //   DARK : top = purple crest,  body = green    → green-dominant
  //   LIGHT: top = light green,   body = pervenche → periwinkle-dominant
  // Both variants put the "accent" as a thin top strip and the dominant
  // color as the deep body (gradient stop at 0.22 in the Defs keeps it thin).
  const liquidTopColor = darkMode
    ? 'rgba(170, 150, 225, 0.88)'      // dark: purple crest
    : 'rgba(170, 215, 180, 0.78)';     // light: soft green accent
  const liquidBottomColor = darkMode
    ? 'rgba(95, 160, 110, 0.92)'       // dark: deep forest green
    : 'rgba(145, 140, 215, 0.85)';     // light: pervenche body

  const todayGlowColor = darkMode
    ? (isRingIn ? 'rgba(158, 228, 172, 0.55)' : 'rgba(210, 190, 245, 0.55)')
    : (isRingIn ? 'rgba(160, 155, 225, 0.60)' : 'rgba(180, 150, 215, 0.60)');
  const todayCoreColor = darkMode
    ? (isRingIn ? '#CFEFD6' : '#E5DBF6')
    : (isRingIn ? '#DBD8F3' : '#EADFF6');

  const totalDays = isRingIn ? 21 : 7;
  const dayInPhase = isRingIn ? currentDay : Math.max(0, currentDay - 21);
  const progress = Math.min(dayInPhase / totalDays, 1);
  const showToday = progress > 0.002 && progress < 1.0;

  // Single Path holding all tick segments — one native draw call regardless
  // of totalDays, uniform color, never recomputed after mount.
  const ticksD = useMemo(() => {
    const tickInner = radius - strokeWidth / 2 - 4;
    const tickOuter = radius - strokeWidth / 2 + 4;
    let d = '';
    for (let i = 0; i < totalDays; i++) {
      const angle = (i / totalDays) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * tickInner;
      const y1 = cy + Math.sin(angle) * tickInner;
      const x2 = cx + Math.cos(angle) * tickOuter;
      const y2 = cy + Math.sin(angle) * tickOuter;
      d += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' ';
    }
    return d;
  }, [radius, strokeWidth, cx, cy, totalDays]);

  const clipId = useMemo(() => `liquidClip-${Math.round(size)}`, [size]);
  const gradientId = useMemo(() => `liquidGrad-${Math.round(size)}`, [size]);

  const waveWidth = 4 * innerR;
  const waveDepth = 4 * innerR;
  const waveD = useMemo(
    () => buildStaticWave(waveWidth, waveDepth),
    [waveWidth, waveDepth],
  );

  // ── UI-thread animation via Reanimated ───────────────────────────────────
  // A handful of shared values, each looping at a fixed period. Because they
  // run on the UI thread under Reanimated, they do NOT cause any JS
  // re-renders, bridge calls, or React reconciliations. The derived
  // transforms / radii / paths are computed in useAnimatedProps which also
  // runs on the UI thread and pushes the result straight to the native view.
  //
  // This is the key fix for the perceived lag: the previous setInterval +
  // setState approach had the JS thread churning ~10 times per second, and
  // every tick shipped a transform update across the bridge. Here, after
  // mount, the JS thread is idle.
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
  // ── XP-bar shimmer layers ──────────────────────────────────────────────
  // L1 breath       — progress arc "breathes" in its own colour
  // L3 grain        — reads sparklePhase declared above (35 glints)
  // L4 escape sparks — 5 particles that emerge from the arc and drift out
  //
  // An earlier iteration had an L2 "sweep" — a bright band sliding along the
  // filled arc. Even at near-zero opacity it read as a distraction, so it
  // was removed. All remaining layers are either stationary or radial
  // (outward drift), never tangential motion along the bar.
  const arcBreathPhase = useSharedValue(0);
  const spark1Phase = useSharedValue(0);
  const spark2Phase = useSharedValue(0);
  const spark3Phase = useSharedValue(0);
  const spark4Phase = useSharedValue(0);
  const spark5Phase = useSharedValue(0);

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
    // Arc breath — slower, pulses the bar glow opacity & stroke width.
    arcBreathPhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }),
      -1,
      false,
    );
    // Five escape-sparks, each on its own period and phase offset so they
    // emit completely out of sync. Periods spread across 700 → 1350 ms.
    spark1Phase.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    spark2Phase.value = 0.33;
    spark2Phase.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
    spark3Phase.value = 0.66;
    spark3Phase.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.linear }),
      -1,
      false,
    );
    spark4Phase.value = 0.18;
    spark4Phase.value = withRepeat(
      withTiming(1, { duration: 1050, easing: Easing.linear }),
      -1,
      false,
    );
    spark5Phase.value = 0.52;
    spark5Phase.value = withRepeat(
      withTiming(1, { duration: 1350, easing: Easing.linear }),
      -1,
      false,
    );
  }, [
    slidePhase, bobPhase, pulsePhase, bubble1Phase, bubble2Phase, sparklePhase,
    arcBreathPhase, spark1Phase, spark2Phase, spark3Phase, spark4Phase, spark5Phase,
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
    return {
      r: strokeWidth * 0.75 + pulse * 3.0,
      opacity: 0.45 + 0.35 * pulse,
    } as any;
  });

  const todayCoreAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const pulse = 0.5 + 0.5 * Math.sin(pulsePhase.value);
    return {
      r: strokeWidth * 0.36 + pulse * 1.2,
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

  // ── XP-bar shimmer over the filled progress arc ─────────────────────────
  // Three composable layers:
  //   L1 "breath"  — the progress arc itself breathes in its own colour
  //                  (opacity + stroke width softly pulse)
  //   L3 "grain"   — 35 small cyan sparkles distributed with pseudo-random
  //                  phase offsets, producing a continuous glitter-grain
  //   L4 "escape"  — 5 particles that emerge from the arc, drift outward
  //                  by a few pixels and fade — the "magical overflow"
  //
  // An earlier iteration had an L2 "sweep" (bright band sliding along the
  // filled arc). Removed: the tangential motion read as distracting even
  // at very low alpha. Layer numbering preserved for readability.
  //
  // All remaining layers are theme-aware and strictly confined to the
  // filled arc.
  const showSparkles = progress > 0.03;

  // Shared cyan palette for all shimmer layers. Dark mode gets saturated
  // neon; light mode stays cooler so nothing burns out over periwinkle.
  const coreColor = darkMode
    ? 'rgba(170, 244, 255, 0.98)' // bright neon cyan
    : 'rgba(110, 210, 225, 0.92)'; // softer teal
  const haloColor = darkMode
    ? 'rgba(126, 228, 255, 0.32)' // cyan bloom on dark
    : 'rgba(95, 195, 215, 0.30)'; // teal bloom on light

  // L1 — arc breath. Rendered as a second stroke over the progress arc,
  // slightly wider and at variable opacity. Uses progressColor so the
  // glow matches the bar's own tint instead of looking like a tacked-on
  // blue halo.
  const arcBreathAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const p = 0.5 + 0.5 * Math.sin(arcBreathPhase.value);
    return {
      opacity: 0.22 + 0.32 * p,         // 0.22 → 0.54
      strokeWidth: strokeWidth + 3 + p * 4, // breathes +3 → +7 px
    } as any;
  });

  // L3 — grain. 35 small cyan glints with pseudo-random phase offsets
  // (hash-derived so positions & brightness look randomized without
  // needing a seeded RNG). Denser than before for a richer glitter.
  const SPARKLE_COUNT = 35;
  const ARC_START = 0.04;
  const ARC_END = 0.96;

  const corePathProps = useAnimatedProps(() => {
    'worklet';
    let d = '';
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const frac = ARC_START + (i / (SPARKLE_COUNT - 1)) * (ARC_END - ARC_START);
      const angle = -Math.PI / 2 + progress * frac * 2 * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      // Pseudo-random phase offset derived from index hash — breaks the
      // obvious wave pattern so glints twinkle independently.
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
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const frac = ARC_START + (i / (SPARKLE_COUNT - 1)) * (ARC_END - ARC_START);
      const angle = -Math.PI / 2 + progress * frac * 2 * Math.PI;
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

  // L4 — escape sparks. 5 animated circles that emerge from a fixed
  // arc fraction, drift outward ~5.5 px and fade in+out via a sin curve.
  // Each has its own period so the five particles never pulse together.
  // useAnimatedProps is called at the top level for each, keeping hook
  // order stable across renders.
  const SPARK1_ARC = 0.15;
  const SPARK2_ARC = 0.38;
  const SPARK3_ARC = 0.58;
  const SPARK4_ARC = 0.74;
  const SPARK5_ARC = 0.90;

  const spark1Props = useAnimatedProps(() => {
    'worklet';
    const t = spark1Phase.value;
    const angle = -Math.PI / 2 + progress * SPARK1_ARC * 2 * Math.PI;
    const outward = t * 5.5;
    return {
      cx: cx + (radius + outward) * Math.cos(angle),
      cy: cy + (radius + outward) * Math.sin(angle),
      opacity: Math.sin(t * Math.PI) * 0.9,
    } as any;
  });
  const spark2Props = useAnimatedProps(() => {
    'worklet';
    const t = spark2Phase.value;
    const angle = -Math.PI / 2 + progress * SPARK2_ARC * 2 * Math.PI;
    const outward = t * 5.5;
    return {
      cx: cx + (radius + outward) * Math.cos(angle),
      cy: cy + (radius + outward) * Math.sin(angle),
      opacity: Math.sin(t * Math.PI) * 0.9,
    } as any;
  });
  const spark3Props = useAnimatedProps(() => {
    'worklet';
    const t = spark3Phase.value;
    const angle = -Math.PI / 2 + progress * SPARK3_ARC * 2 * Math.PI;
    const outward = t * 5.5;
    return {
      cx: cx + (radius + outward) * Math.cos(angle),
      cy: cy + (radius + outward) * Math.sin(angle),
      opacity: Math.sin(t * Math.PI) * 0.9,
    } as any;
  });
  const spark4Props = useAnimatedProps(() => {
    'worklet';
    const t = spark4Phase.value;
    const angle = -Math.PI / 2 + progress * SPARK4_ARC * 2 * Math.PI;
    const outward = t * 5.5;
    return {
      cx: cx + (radius + outward) * Math.cos(angle),
      cy: cy + (radius + outward) * Math.sin(angle),
      opacity: Math.sin(t * Math.PI) * 0.9,
    } as any;
  });
  const spark5Props = useAnimatedProps(() => {
    'worklet';
    const t = spark5Phase.value;
    const angle = -Math.PI / 2 + progress * SPARK5_ARC * 2 * Math.PI;
    const outward = t * 5.5;
    return {
      cx: cx + (radius + outward) * Math.cos(angle),
      cy: cy + (radius + outward) * Math.sin(angle),
      opacity: Math.sin(t * Math.PI) * 0.9,
    } as any;
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={cx} cy={cy} r={innerR} />
          </ClipPath>
          <LinearGradient
            id={gradientId}
            x1={cx}
            y1={cy - innerR}
            x2={cx}
            y2={cy + innerR}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={liquidTopColor} />
            <Stop offset="0.22" stopColor={liquidBottomColor} />
            <Stop offset="1" stopColor={liquidBottomColor} />
          </LinearGradient>
        </Defs>

        {/* Background circle — static */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated liquid — translate driven by Reanimated on the UI thread.
            Bubbles live in the same clip group so they can't escape the
            inner circle. Their cy / opacity are also UI-thread driven. */}
        <G clipPath={`url(#${clipId})`}>
          <AnimatedG animatedProps={waveAnimatedProps}>
            <Path d={waveD} fill={`url(#${gradientId})`} />
          </AnimatedG>
          {showBubbles && (
            <>
              <AnimatedCircle
                cx={bubble1X}
                r={3.2}
                fill={bubbleColor}
                animatedProps={bubble1AnimatedProps}
              />
              <AnimatedCircle
                cx={bubble2X}
                r={3.6}
                fill={bubbleColor}
                animatedProps={bubble2AnimatedProps}
              />
            </>
          )}
        </G>

        {/* Progress arc — static */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* L1 — arc breath. Second stroke over the filled arc with animated
            opacity + stroke width. Uses progressColor so the glow matches
            the bar's own tint. Rendered AFTER the solid arc so its softness
            overlays the base; strokeLinecap=round keeps the end smooth. */}
        {showSparkles && (
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={progressColor}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            animatedProps={arcBreathAnimatedProps}
          />
        )}

        {/* L3 — grain. 35 small cyan glints with pseudo-random phase offsets.
            Halo first (low alpha bloom) then cores on top. Two draw calls. */}
        {showSparkles && (
          <>
            <AnimatedPath
              animatedProps={haloPathProps}
              fill={haloColor}
              stroke="none"
            />
            <AnimatedPath
              animatedProps={corePathProps}
              fill={coreColor}
              stroke="none"
            />
          </>
        )}

        {/* L4 — escape sparks. Five particles drifting outward from the arc. */}
        {showSparkles && (
          <>
            <AnimatedCircle r={1.6} fill={coreColor} animatedProps={spark1Props} />
            <AnimatedCircle r={1.6} fill={coreColor} animatedProps={spark2Props} />
            <AnimatedCircle r={1.6} fill={coreColor} animatedProps={spark3Props} />
            <AnimatedCircle r={1.6} fill={coreColor} animatedProps={spark4Props} />
            <AnimatedCircle r={1.6} fill={coreColor} animatedProps={spark5Props} />
          </>
        )}

        {/* Tick marks — single static path */}
        <Path
          d={ticksD}
          stroke={tickColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.5}
          fill="none"
        />

        {/* Today pulse — UI-thread animated r/opacity */}
        {showToday && (
          <G>
            <AnimatedCircle
              cx={todayX}
              cy={todayY}
              fill={todayGlowColor}
              animatedProps={todayGlowAnimatedProps}
            />
            <AnimatedCircle
              cx={todayX}
              cy={todayY}
              fill={todayCoreColor}
              opacity={0.9}
              animatedProps={todayCoreAnimatedProps}
            />
          </G>
        )}
      </Svg>
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.dayNumber, { color: theme.text }]}>J{currentDay}</Text>
        <Text style={[styles.phaseText, { color: theme.textSecondary }]}>{phaseLabel}</Text>
        <View style={[styles.divider, { backgroundColor: progressColor }]} />
        <Text style={[styles.countdownNumber, { color: theme.primaryDark }]}>{daysLeft}</Text>
        <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
          {t('daysBeforeActionLabel', { action: nextAction })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 42,
    fontWeight: fontWeight.black,
    letterSpacing: -1,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 2.5,
    borderRadius: 2,
    marginVertical: 8,
    opacity: 0.6,
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
  },
  countdownLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: fontWeight.medium,
  },
});
