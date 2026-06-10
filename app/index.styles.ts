import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md },

  header: { marginBottom: spacing.sm },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, letterSpacing: -0.5, flexShrink: 1 },
  // No flexWrap — when the greeting is too long (e.g. "مساء الخير, Alex 🌇")
  // we'd rather let flexShrink trim it than have a wrapped second line appear
  // at the far left and collide with the TempRemovalCountdown on the right.
  // gap 0 — we use explicit negative margins on the icon instead, and we want
  // the greeting text to sit right next to the bird in LTR (user preference).
  // overflow:'visible' is critical — the ZZZ image inside petWrap sits at
  // right:-30 (beside the bird's head, past the 46px wrapper's right edge).
  // Android clips overflow by default even when the child has
  // overflow:'visible', so we also mark the containing row visible to keep
  // the absolutely-positioned ZZZ from being cut off.
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 0, overflow: 'visible' },
  // Applied on top of greetingRow / titleRow when the active language is RTL
  // so that bird + emoji land on the mirrored side of the greeting.
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  petWrap: {
    width: 46,
    height: 46,
    position: 'relative',
    overflow: 'visible',
  },
  petBird: {
    width: 44,
    height: 44,
  },
  petZzz: {
    position: 'absolute',
    // Placed BESIDE the bird's head, not above it. After flipBird in LTR
    // sleeping mode the head sits on the right half of the 46×46 wrapper,
    // so we push the ZZZ well past the right edge (right:-30) and only
    // slightly up (top:-8) — that puts the ZZZ level with the head, just
    // to its right. Size kept at 44 (down from 56) so it doesn't sprawl
    // over the greeting text next to the bird.
    top: -14,
    right: -18,
    width: 44,
    height: 44,
    // Raise above the sibling <Text> that paints the greeting line.
    // On Android the Text can cover absolutely-positioned siblings that
    // overflow into its area; elevation forces the ZZZ on top in the
    // native z-order. zIndex alone isn't always enough on Android.
    zIndex: 20,
    elevation: 20,
  },
  // Matches the visual weight of the adjacent emoji in the other time-of-day
  // variants. Rendered as a sibling of the greeting <Text>, not inline.
  // Shared by all four greeting icons (Matin / ApresMidi / Soir / Nuit).
  // Bumped from 32 → 44 now that every PNG is tightly framed and equal-size —
  // "a touch bigger so we can clearly see them, but not so large they steal
  // focus from the greeting text".
  greetingIconImg: { width: 44, height: 44 },
  // Slightly smaller than fontSize.md and no capitalize — the wrap
  // phrases already include their own capitalization and case logic.
  date: { fontSize: 13, marginTop: 2 },
  since: { fontSize: fontSize.sm, marginTop: 2, textTransform: 'capitalize' },

  ringWrapper: { marginVertical: spacing.lg, alignItems: 'center' },

  pillsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: borderRadius.full, gap: 6,
  },
  pillEmoji: { fontSize: 16 },
  pillIcon: { marginRight: 2 },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },

  explainCard: {
    borderRadius: borderRadius.xl, padding: spacing.lg,
    ...shadows.medium, marginBottom: spacing.lg,
  },
  explainTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 6 },
  explainBody: { fontSize: fontSize.md, lineHeight: 24 },
  dateDetail: { fontSize: fontSize.sm, textTransform: 'capitalize', flexShrink: 1 },
  dateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },

  // periodCard / periodGrid / periodLegend / legendItem / legendDot /
  // legendText / sectionTitle / sectionSub all removed in v2.6.1 — they
  // belonged to the home-screen "Suivi des règles" section that's now
  // gone. The "Mes périodes" tab has its own dedicated styles.

  resetBtn: { alignItems: 'center', paddingVertical: spacing.md },
  resetText: { fontSize: fontSize.sm },
});
