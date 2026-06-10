/**
 * Styles for the "Mes périodes" screen (app/periods.tsx).
 *
 * Extracted verbatim from periods.tsx — pure relocation, no value changes.
 * Theme tokens (spacing/fontSize/fontWeight/borderRadius/shadows) are
 * imported here so the StyleSheet keeps resolving exactly as before.
 */
import { StyleSheet } from 'react-native';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },

  title: { fontSize: 26, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  // Bird sits beside the title at the same vertical center; same
  // pattern as the History screen.
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titlePet: { width: 42, height: 42 },
  rtlRow: { flexDirection: 'row-reverse' },
  subtitle: { fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  // Independence card — soft pervenche, sits right under the
  // title/subtitle. Compact (3 lines max) so it doesn't push the
  // summary card too far down.
  independenceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  independenceLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  independenceBody: { fontSize: fontSize.sm, lineHeight: 20 },
  // Tappable header used by the two collapsible cards (independence
  // + how-it-works). The caret on the right swaps between ▾ open
  // and ▸ closed; the row itself uses standard flex space-between.
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleCaret: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    marginLeft: spacing.sm,
  },

  summaryCard: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  summaryBody: {
    fontSize: fontSize.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  summaryHint: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  summaryEmoji: { fontSize: 38, marginLeft: spacing.md },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  statLabel: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 20, fontWeight: fontWeight.black, marginTop: 4 },
  statHint: { fontSize: 11, marginTop: 2 },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  monthBtnLabel: { fontSize: 28, fontWeight: fontWeight.black, lineHeight: 30 },
  monthTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textTransform: 'capitalize' },

  gridCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadows.soft,
    marginBottom: spacing.md,
  },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekLabel: { fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  row: { flexDirection: 'row', marginVertical: 1 },
  cellWrapper: { flex: 1, aspectRatio: 1, padding: 2 },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  cellToday: { borderWidth: 2 },
  cellPredicted: {
    borderWidth: 1.5,
    borderColor: '#E87070',
    borderStyle: 'dashed',
  },
  // Soft cranberry fill that breathes under the day digit. Sits flush
  // inside the cell's borderRadius so it doesn't bleed into neighbors.
  cellPredictedPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8AAB6',
    borderRadius: borderRadius.md,
  },
  // Same dashed-accent treatment as the prediction marker but in the
  // primary cranberry hue so it reads as "this is the period you're
  // moving" rather than "this is the next predicted day".
  cellMoving: {
    borderWidth: 2,
    borderColor: '#A8324A',
    borderStyle: 'dashed',
  },
  cellText: { fontSize: fontSize.sm },
  cellDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2 },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    rowGap: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: fontWeight.medium },

  tipCard: { borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.soft },
  tipTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  tipLead: { fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  tipStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tipStepEmoji: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    width: 28,
    textAlign: 'center',
    lineHeight: 26,
  },
  tipStepTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 2 },
  tipStepBody: { fontSize: fontSize.sm, lineHeight: 19 },

  // Bottom reset section — sits below the "Comment ça marche" card,
  // both buttons full-width with a 12px gap. Secondary button is a
  // soft underline-feeling neutral, danger button is a red-tinted
  // chip — visually distinct so the user reads gravity at a glance.
  resetSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  resetBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  resetBtnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
  },
  resetBtnSecondaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  resetBtnDanger: {
    backgroundColor: '#FDE8E8',
  },
  resetBtnDangerLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#C62828',
  },

  moveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  moveBannerLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flex: 1 },
  moveBannerCancel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginLeft: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
});
