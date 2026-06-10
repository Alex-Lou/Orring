import React, { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/theme';
import { CycleHistoryCard } from '../src/components/CycleHistoryCard';
import { generateCycleHistory, formatDateFr } from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
import { useConfirm } from '../src/components/ConfirmProvider';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { firstInsertDate, cycleLogs, periodLogs, clearHistory, deleteCycleLogsBetween, setRingStatus } = useCycleStore();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [previsionsOpen, setPrevisionsOpen] = useState(false);
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const confirm = useConfirm();

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
        <View style={[styles.headerBox, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
            <Image
              source={require('../assets/OrringBluePetNoBgSalute.png')}
              style={[styles.titlePet, isRTL && { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>{t('history')}</Text>
          </View>
        </View>
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
          <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
            <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
              <Image
              source={require('../assets/OrringBluePetNoBgSalute.png')}
              style={[styles.titlePet, isRTL && { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
              <Text style={[styles.title, { color: theme.text }]}>{t('history')}</Text>
            </View>
            {cycleLogs.length > 0 && (
              <Pressable
                onPress={async () => {
                  if (await confirm({
                    title: t('deleteAllTitle'),
                    body: t('deleteAllConfirm'),
                    confirmLabel: t('clearAction'),
                    destructive: true,
                    emoji: '🗑',
                  })) clearHistory();
                }}
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
            <Pressable onPress={() => setHistoryOpen(!historyOpen)} style={[styles.sectionHeader, isRTL && styles.rtlRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rtlRow]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {historyOpen ? '▼' : (isRTL ? '◀' : '▶')}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={theme.text}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('history')}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{t('cycleCount', { count: past.length })}</Text>
            </Pressable>
            {historyOpen && past.map((entry, index) => (
              <Animated.View key={entry.cycleNumber} entering={FadeInUp.delay(index * 50).duration(300)}>
                <CycleHistoryCard
                  entry={entry}
                  index={index}
                  onDelete={async () => {
                    const startDay = new Date(entry.theoreticalInsertDate);
                    startDay.setHours(0, 0, 0, 0);
                    const endDay = new Date(entry.theoreticalPauseEnd);
                    endDay.setHours(23, 59, 59, 999);

                    if (entry.status === 'current') {
                      if (await confirm({
                        title: t('deleteCurrentCycleTitle'),
                        body: t('deleteCurrentCycleMessage'),
                        confirmLabel: t('confirm'),
                        destructive: true,
                        emoji: '🗑',
                      })) {
                        deleteCycleLogsBetween(startDay.getTime(), endDay.getTime());
                        setRingStatus('out');
                      }
                      return;
                    }

                    if (await confirm({
                      title: t('deleteCycle'),
                      body: t('deleteCycleRange', { start: formatDateFr(entry.theoreticalInsertDate, 'dd MMM'), end: formatDateFr(entry.theoreticalPauseEnd, 'dd MMM') }),
                      confirmLabel: t('delete'),
                      destructive: true,
                      emoji: '🗑',
                    })) {
                      deleteCycleLogsBetween(startDay.getTime(), endDay.getTime());
                    }
                  }}
                />
              </Animated.View>
            ))}
          </>
        )}

        {/* Prévisions section — collapsible */}
        {future.length > 0 && (
          <>
            <Pressable onPress={() => setPrevisionsOpen(!previsionsOpen)} style={[styles.sectionHeader, isRTL && styles.rtlRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rtlRow]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {previsionsOpen ? '▼' : (isRTL ? '◀' : '▶')}
                </Text>
                <Ionicons
                  name="sparkles-outline"
                  size={22}
                  color={theme.text}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('predictions')}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{t('cycleCount', { count: future.length })}</Text>
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
  // No horizontal padding — inherits from the ScrollView's listContent padding
  // to keep the title flush with the rest of the list content.
  headerBox: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rtlRow: { flexDirection: 'row-reverse' },
  titlePet: { width: 42, height: 42 },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.full, backgroundColor: '#FDE8E8' },
  clearText: { fontSize: fontSize.xs, color: '#C62828', fontWeight: fontWeight.semibold },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  // Inline icon between the disclosure caret and the section label.
  // 26 px keeps the row height the same as the legacy emoji line so
  // collapsing/expanding doesn't cause layout shift.
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { width: 26, height: 26 },
  sectionCount: { fontSize: fontSize.sm, color: colors.textSecondary },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});
