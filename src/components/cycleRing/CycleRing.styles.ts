import { StyleSheet } from 'react-native';
import { fontWeight } from '../../theme';

export const styles = StyleSheet.create({
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
