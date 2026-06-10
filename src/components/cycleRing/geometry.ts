// Pure geometry helpers for CycleRing. Relocated verbatim from the component —
// the math is byte-for-byte identical, only moved out of the file.

// Static wave — extra wide so the horizontal slide never exposes an edge,
// extra deep so the fill always reaches the pool floor. Built once per
// innerR value via useMemo inside the component.
export function buildStaticWave(waveWidth: number, waveDepth: number): string {
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

// Deux Path pour les ticks — une passe unique sur `totalDays`, on trie
// chaque segment dans `passed` (i < dayInPhase : jour franchi) ou
// `unpassed` (jour à venir). Chaque chaîne alimente un <Path> dédié,
// ce qui garde deux draw calls au total quel que soit `totalDays`.
export function buildTickPaths(
  radius: number,
  strokeWidth: number,
  cx: number,
  cy: number,
  totalDays: number,
  dayInPhase: number,
): { passed: string; unpassed: string } {
  const tickInner = radius - strokeWidth / 2 - 4;
  const tickOuter = radius - strokeWidth / 2 + 4;
  let passed = '';
  let unpassed = '';
  for (let i = 0; i < totalDays; i++) {
    const angle = (i / totalDays) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * tickInner;
    const y1 = cy + Math.sin(angle) * tickInner;
    const x2 = cx + Math.cos(angle) * tickOuter;
    const y2 = cy + Math.sin(angle) * tickOuter;
    const seg = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' ';
    if (i < dayInPhase) passed += seg;
    else unpassed += seg;
  }
  return { passed, unpassed };
}
