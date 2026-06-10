import { StyleSheet } from 'react-native';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';

// ─── Styles ───
export const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Intro
  introWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  introLogoWrap: {
    marginBottom: spacing.lg,
  },
  introLogo: {
    width: 140, height: 140, borderRadius: 70,
  },
  introTitle: {
    fontSize: 56, fontWeight: '900', color: '#7F6EBA', letterSpacing: -1.5,
  },
  introTagline: {
    fontSize: 28, marginTop: spacing.sm,
  },

  // Common step
  stepWrap: {
    flex: 1, padding: spacing.xl, paddingBottom: spacing.xl + 24, alignItems: 'center',
  },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.black, textAlign: 'center', letterSpacing: -0.5, marginTop: spacing.xl,
  },
  stepSub: {
    fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },

  // Language
  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md,
  },
  langCard: {
    width: 100, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center',
    borderWidth: 2, gap: 4, position: 'relative',
  },
  langFlag: { fontSize: 30 },
  langLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  langCheck: {
    position: 'absolute', top: 4, right: 8, fontSize: 12, fontWeight: '900',
  },

  // Date choices
  dateQuickWrap: {
    width: '100%', gap: spacing.md, marginTop: spacing.md,
  },
  bigChoice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    paddingVertical: 20, borderRadius: borderRadius.xl,
  },
  bigChoiceEmoji: { fontSize: 28 },
  bigChoiceLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  // Calendar
  calWrap: { width: '100%', alignItems: 'center' },
  calNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%',
    marginBottom: spacing.sm,
  },
  calNavBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  calNavText: { fontSize: 24, fontWeight: '800', marginTop: -3 },
  calMonth: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textTransform: 'capitalize' },
  calWeekdays: {
    flexDirection: 'row', width: '100%', marginBottom: 6,
  },
  calWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: fontWeight.bold },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  calDayBubble: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: fontSize.md + 4,
  },
  calBackBtn: { paddingVertical: spacing.md, marginTop: spacing.sm },
  calBackText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  // Time
  timeDisplay: {
    marginTop: spacing.md, marginBottom: spacing.lg,
  },
  timeBig: {
    fontSize: 56, fontWeight: '900', letterSpacing: -2,
  },

  // Name
  nameInput: {
    width: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, borderRadius: borderRadius.lg, borderWidth: 1.5,
    textAlign: 'center', fontWeight: '600',
  },
  skipRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  skipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },

  // Welcome
  welcomeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  welcomeBird: { width: 150, height: 150, marginBottom: spacing.lg },
  welcomeEmoji: { fontSize: 80, marginBottom: spacing.lg },
  welcomeText: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.black, textAlign: 'center', letterSpacing: -0.5,
  },

  // Pulse button
  pulseBtnWrap: {
    width: '100%', marginTop: 'auto', elevation: 0,
  },
  pulseBtn: {
    paddingVertical: 18, borderRadius: borderRadius.full, alignItems: 'center', width: '100%',
  },
  pulseBtnText: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 0.3,
  },
});
