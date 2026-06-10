import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  // Slightly larger + tighter tracking than the legacy title — guided
  // mode is the headline of the screen interaction so it deserves more
  // weight. Sub-text below softens it back to a regular body line.
  titleGuided: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subGuided: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  endAtDayBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  endAtDayLabel: {
    // Slightly smaller than the legacy fontSize.sm — "Marquer ce jour
    // comme dernier" is the longest label in the modal and was wrapping
    // / cramping against the rounded pill borders.
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  date: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textTransform: 'capitalize',
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: colors.primaryDark,
  },
  optionEmoji: {
    fontSize: 16,
    width: 40,
  },
  optionLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  check: {
    fontSize: fontSize.lg,
    color: colors.primaryDark,
    fontWeight: fontWeight.bold,
  },
  durationCard: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  durationValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  durationSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  durationButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  durationBtnDisabled: {
    opacity: 0.35,
  },
  durationBtnLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  durationLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: 4,
  },
  durationLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  removeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  removeText: {
    fontSize: fontSize.sm,
    color: '#E74C3C',
    fontWeight: fontWeight.medium,
  },
  closeBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  closeText: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
