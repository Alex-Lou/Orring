import React from 'react';
import Svg, { Circle, G, Defs, ClipPath, Path, LinearGradient, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';

// Animated wrappers over the raw SVG primitives. Creating these at module
// scope (rather than inside the component) is important — otherwise every
// render creates a new component type and Reanimated tears down + rebuilds
// the animated attachments each time.
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Presentational SVG subtree for CycleRing. Pure relocation of the JSX that
// used to live inline — every scalar, condition, color, transform and the
// animatedProps objects (produced by the parent's useAnimatedProps worklets)
// are passed straight through. No hooks, no shared values, no worklets here:
// the animation wiring stays entirely in CycleRing. animatedProps are plain
// objects passed as props, exactly as the previous inline JSX consumed them.
interface RingCanvasProps {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  innerR: number;
  strokeWidth: number;
  circumference: number;
  clipId: string;
  gradientId: string;
  inactive: boolean;
  darkMode: boolean;
  bgColor: string;
  progressColor: string;
  progress: number;
  liquidTopColor: string;
  liquidBottomColor: string;
  waveD: string;
  showBubbles: boolean;
  bubble1X: number;
  bubble2X: number;
  bubbleColor: string;
  showSparkles: boolean;
  haloColor: string;
  coreColor: string;
  tickColor: string;
  ticksPaths: { passed: string; unpassed: string };
  showToday: boolean;
  isDDay: boolean;
  todayX: number;
  todayY: number;
  todayGlowColor: string;
  todayCoreColor: string;
  // animatedProps objects from the parent's useAnimatedProps worklets.
  waveAnimatedProps: any;
  bubble1AnimatedProps: any;
  bubble2AnimatedProps: any;
  haloPathProps: any;
  corePathProps: any;
  passedTicksAnimatedProps: any;
  dDayHaloAnimatedProps: any;
  todayGlowAnimatedProps: any;
  todayCoreAnimatedProps: any;
}

export function RingCanvas({
  size,
  cx,
  cy,
  radius,
  innerR,
  strokeWidth,
  circumference,
  clipId,
  gradientId,
  inactive,
  darkMode,
  bgColor,
  progressColor,
  progress,
  liquidTopColor,
  liquidBottomColor,
  waveD,
  showBubbles,
  bubble1X,
  bubble2X,
  bubbleColor,
  showSparkles,
  haloColor,
  coreColor,
  tickColor,
  ticksPaths,
  showToday,
  isDDay,
  todayX,
  todayY,
  todayGlowColor,
  todayCoreColor,
  waveAnimatedProps,
  bubble1AnimatedProps,
  bubble2AnimatedProps,
  haloPathProps,
  corePathProps,
  passedTicksAnimatedProps,
  dDayHaloAnimatedProps,
  todayGlowAnimatedProps,
  todayCoreAnimatedProps,
}: RingCanvasProps) {
  return (
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

      {/* Background circle — static. In inactive mode we render a flat
          theme-grey ring (no phase tint) so it reads as "empty scaffold". */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={inactive ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,80,0.10)') : bgColor}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Animated liquid — translate driven by Reanimated on the UI thread.
          Bubbles live in the same clip group so they can't escape the
          inner circle. Their cy / opacity are also UI-thread driven.
          Skipped entirely in inactive mode — the ring should look empty
          and inert until the user confirms re-insertion. */}
      {!inactive && (
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
      )}

      {/* Progress arc — static. Hidden in inactive mode (offset = full
          circumference so the dasharray fully retracts). */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={inactive ? circumference : circumference * (1 - progress)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />

      {/* L3 — grain. One cyan glint per reached day with pseudo-random
          phase offsets. Halo first (low alpha bloom) then cores on top.
          Two draw calls. Disabled in inactive mode — no progress means
          nothing to sparkle. */}
      {showSparkles && !inactive && (
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

      {/* Ticks à venir — gris, statiques */}
      {ticksPaths.unpassed !== '' && (
        <Path
          d={ticksPaths.unpassed}
          stroke={tickColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.5}
          fill="none"
        />
      )}
      {/* Ticks franchis — cyan, pouls UI-thread (dayInPhase barres).
          En mode inactif il n'y a rien de franchi, on les masque. */}
      {ticksPaths.passed !== '' && !inactive && (
        <AnimatedPath
          d={ticksPaths.passed}
          stroke={coreColor}
          strokeWidth={2.8}
          strokeLinecap="round"
          fill="none"
          animatedProps={passedTicksAnimatedProps}
        />
      )}

      {/* Today pulse — UI-thread animated r/opacity.
          Au jour J, une couronne externe (pulse lent, déphasé) vient
          s'ajouter au glow + core pour marquer clairement l'événement.
          Caché en mode inactif (pas de "today" tant que le cycle n'est
          pas activé par l'user). */}
      {showToday && !inactive && (
        <G>
          {isDDay && (
            <AnimatedCircle
              cx={todayX}
              cy={todayY}
              fill={todayGlowColor}
              animatedProps={dDayHaloAnimatedProps}
            />
          )}
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
  );
}
