import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';
import { CycleHistoryCard } from '../src/components/CycleHistoryCard';
import { generateCycleHistory, CycleHistoryEntry, formatDateFr } from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen() {
  const { firstInsertDate, cycleLogs, periodLogs, clearHistory, deleteCycleLogsBetween, setRingStatus } = useCycleStore();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [previsionsOpen, setPrevisionsOpen] = useState(false);
  const { t } = useTranslation();
  const theme = useTheme();

  const { past, future } = useMemo(() => {
    if (!firstInsertDate) return { past: [], future: [] };
    const all = generateCycleHistory(new Date(firstInsertDate), cycleLogs, periodLogs, 12);
    return {
      past: all.filter(c => c.status === 'past' || c.status === 'current'),
      future: all.filter(c => c.status === 'future'),
    };
  }, [firstInsertDate, cycleLogs, periodLogs]);

  if (!firstInsertDate) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.headerBox}><Text style={[styles.title, { color: theme.text }]}>{t('history')}</Text></View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('configureStartHistory')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.headerBox}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>{t('history')}</Text>
            {cycleLogs.length > 0 && (
              <Pressable
                onPress={() => Alert.alert(t('deleteAllTitle'), t('deleteAllConfirm'), [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('clearAction'), style: 'destructive', onPress: clearHistory },
                ])}
                style={styles.clearBtn}
              >
                <Text style={styles.clearText}>🗑 {t('clearAll')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Historique section — collapsible */}
        {past.length > 0 && (
          <>
            <Pressable onPress={() => setHistoryOpen(!historyOpen)} style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {historyOpen ? '▼' : '▶'} 📖 {t('history')}
              </Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{past.length} cycle{past.length > 1 ? 's' : ''}</Text>
            </Pressable>
            {historyOpen && past.map((entry, index) => (
              <Animated.View key={entry.cycleNumber} entering={FadeInUp.delay(index * 50).duration(300)}>
                <CycleHistoryCard
                  entry={entry}
                  index={index}
                  onDelete={() => {
                    const startDay = new Date(entry.theoreticalInsertDate);
                    startDay.setHours(0, 0, 0, 0);
                    const endDay = new Date(entry.theoreticalPauseEnd);
                    endDay.setHours(23, 59, 59, 999);

                    if (entry.status === 'current') {
                      Alert.alert(
                        t('deleteCurrentCycleTitle'),
                        t('deleteCurrentCycleMessage'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('confirm'), style: 'destructive', onPress: () => {
                            deleteCycleLogsBetween(startDay.getTime(), endDay.getTime());
                            setRingStatus('out');
                          }},
                        ]
                      );
                      return;
                    }

                    Alert.alert(
                      t('deleteCycle'),
                      t('deleteCycleRange', { start: formatDateFr(entry.theoreticalInsertDate, 'dd MMM'), end: formatDateFr(entry.theoreticalPauseEnd, 'dd MMM') }),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('delete'), style: 'destructive', onPress: () => {
                          deleteCycleLogsBetween(startDay.getTime(), endDay.getTime());
                        }},
                      ]
                    );
                  }}
                />
              </Animated.View>
            ))}
          </>
        )}

        {/* Prévisions section — collapsible */}
        {future.length > 0 && (
          <>
            <Pressable onPress={() => setPrevisionsOpen(!previsionsOpen)} style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {previsionsOpen ? '▼' : '▶'} 🔮 {t('predictions')}
              </Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{future.length} cycle{future.length > 1 ? 's' : ''}</Text>
            </Pressable>
            {previsionsOpen && future.map((entry, index) => (
              <Animated.View key={entry.cycleNumber} entering={FadeInUp.delay(index * 50).duration(300)}>
                <CycleHistoryCard entry={entry} index={index} />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.full, backgroundColor: '#FDE8E8' },
  clearText: { fontSize: fontSize.xs, color: '#C62828', fontWeight: fontWeight.semibold },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  sectionCount: { fontSize: fontSize.sm, color: colors.textSecondary },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
