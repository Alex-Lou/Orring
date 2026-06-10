import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  titlePet: { width: 42, height: 42 },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },

  sectionTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  cardDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },

  // Date picker
  setDateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm,
  },
  setDateIcon: { fontSize: 20 },
  setDateText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text, textTransform: 'capitalize' },
  setDateArrow: { fontSize: 24, color: colors.primaryDark },

  // Ring status
  ringStatusRow: { flexDirection: 'row', gap: spacing.md },
  statusBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.border, gap: spacing.xs,
  },
  statusEmoji: { fontSize: 24 },
  statusLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },

  // Settings rows
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flex: 1, marginRight: spacing.md },
  settingLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  settingDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  timeRow: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  timeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  timeBtn: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  timeBtnActive: { backgroundColor: colors.primary },
  timeBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  timeBtnTextActive: { color: colors.textOnPrimary, fontWeight: fontWeight.bold },

  aboutCycle: { fontSize: fontSize.sm, color: colors.text, lineHeight: 24, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: borderRadius.lg },

  resetBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, alignItems: 'center' },
  resetText: { fontSize: fontSize.sm, color: '#E74C3C', fontWeight: fontWeight.medium },
  version: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.lg },

  // Backup card rows + separator (matches the rest of the settings
  // card aesthetic: card padding, a hairline divider between rows).
  row: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  rowSub: { fontSize: fontSize.xs, marginTop: 2 },
  cardSep: { height: 1, marginHorizontal: spacing.lg },

  // Restore modal — themed sheet with a multiline TextInput.
  restoreOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  restoreCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  restoreTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', letterSpacing: -0.3 },
  restoreBody: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.lg },
  restoreInput: {
    minHeight: 120,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  restoreErrorText: { color: '#C62828', fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center' },
  restoreActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  restoreBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.full, alignItems: 'center' },
  restoreBtnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  restoreBtnLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
