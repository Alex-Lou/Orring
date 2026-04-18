import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/theme';
import { useCycleStore } from '../src/store/cycleStore';
import { formatDateFr, formatDateTimeFr, getCycleInfoFromLogs } from '../src/utils/cycle';
import { addDays, subDays } from 'date-fns';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
  const {
    firstInsertDate,
    setFirstInsertDate,
    ringStatus,
    setRingStatus,
    notificationsEnabled,
    setNotificationsEnabled,
    reminderHour,
    setReminderTime,
    resetAll,
    userName,
    setUserName,
    darkMode,
  } = useCycleStore();

  // Couleurs "en place / retiré" adaptées au mode
  const activeInBg = darkMode ? 'rgba(158,198,164,0.18)' : '#E5F0E7';
  const activeInBorder = darkMode ? 'rgba(158,198,164,0.55)' : '#9EC6A4';
  const activeOutBg = darkMode ? 'rgba(212,165,197,0.18)' : '#F3E8EF';
  const activeOutBorder = darkMode ? 'rgba(212,165,197,0.55)' : '#D4A5C5';

  const theme = useTheme();
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    firstInsertDate ? new Date(firstInsertDate) : new Date()
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName || '');

  const handleDateConfirm = () => {
    setFirstInsertDate(tempDate.toISOString());
    setShowDatePicker(false);
  };

  const handleReset = () => {
    Alert.alert(
      t('settingsResetTitle'),
      t('settingsResetMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('settingsResetLabel'),
          style: 'destructive',
          onPress: () => {
            resetAll();
            // Navigate back to home which will show the onboarding flow fresh
            setTimeout(() => router.replace('/'), 100);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.titleRow}>
            <Image source={require('../assets/OrringBluePetNoBgSalute.png')} style={styles.titlePet} resizeMode="contain" />
            <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('configureTracking')}</Text>
        </Animated.View>

        {/* Nom de l'utilisatrice */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('userNameLabel')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {t('userNameDesc')}
            </Text>
            {editingName ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder={t('onbNamePlaceholder')}
                  placeholderTextColor={theme.textLight}
                  style={{
                    flex: 1, paddingHorizontal: spacing.md, paddingVertical: 10,
                    fontSize: fontSize.md, borderRadius: borderRadius.lg,
                    borderWidth: 1.5, borderColor: theme.primary, color: theme.text,
                    backgroundColor: theme.background,
                  }}
                  maxLength={24}
                  autoFocus
                />
                <Pressable
                  onPress={() => { setUserName(nameDraft.trim() || null); setEditingName(false); }}
                  style={{ backgroundColor: theme.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.full }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: fontSize.sm }}>{t('save')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { setNameDraft(userName || ''); setEditingName(true); }}
                style={[styles.setDateBtn, { backgroundColor: theme.primarySoft }]}
              >
                <Text style={styles.setDateIcon}>👤</Text>
                <Text style={[styles.setDateText, { color: theme.text }]}>
                  {userName || t('userNameNone')}
                </Text>
                <Text style={{ color: theme.primaryDark, fontSize: fontSize.sm, fontWeight: '700' }}>{t('edit')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Date de début */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('referenceDate')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {t('referenceDateDescFull')}
            </Text>
            <View style={[styles.setDateBtn, { backgroundColor: theme.primarySoft }]}>
              <Text style={styles.setDateIcon}>📅</Text>
              <Text style={[styles.setDateText, { color: theme.text }]}>
                {firstInsertDate ? formatDateTimeFr(new Date(firstInsertDate)) : t('notConfigured')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Statut anneau */}
        <Animated.View entering={FadeInUp.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('ringStatus')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {t('ringStatusDescFull')}
            </Text>
            <View style={styles.ringStatusRow}>
              <Pressable
                style={[
                  styles.statusBtn,
                  { borderColor: theme.border },
                  ringStatus === 'in' && { borderColor: activeInBorder, backgroundColor: activeInBg },
                ]}
                onPress={() => setRingStatus('in')}
              >
                <Text style={styles.statusEmoji}>⭕</Text>
                <Text style={[styles.statusLabel, { color: theme.textSecondary }, ringStatus === 'in' && { color: theme.text, fontWeight: fontWeight.bold }]}>{t('inPlace')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.statusBtn,
                  { borderColor: theme.border },
                  ringStatus === 'out' && { borderColor: activeOutBorder, backgroundColor: activeOutBg },
                ]}
                onPress={() => setRingStatus('out')}
              >
                <Text style={styles.statusEmoji}>✋</Text>
                <Text style={[styles.statusLabel, { color: theme.textSecondary }, ringStatus === 'out' && { color: theme.text, fontWeight: fontWeight.bold }]}>{t('removed')}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('notifications')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('remindersEnabled')}</Text>
                <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>{t('remindersDescFull')}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notificationsEnabled ? colors.primary : colors.textLight}
              />
            </View>
            {notificationsEnabled && (
              <View style={[styles.timeRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('reminderHour')}</Text>
                <View style={styles.timeButtons}>
                  {[7, 8, 9, 10, 20, 21].map((hour) => (
                    <Pressable
                      key={hour}
                      style={[styles.timeBtn, reminderHour === hour && styles.timeBtnActive]}
                      onPress={() => setReminderTime(hour, 0)}
                    >
                      <Text style={[styles.timeBtnText, reminderHour === hour && styles.timeBtnTextActive]}>
                        {hour}h
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('about')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.aboutCycle, { color: theme.text, backgroundColor: theme.primarySoft }]}>
              {t('aboutText')}
            </Text>
          </View>
        </Animated.View>

        {/* Reset */}
        <Pressable style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.8 }]} onPress={handleReset}>
          <Text style={styles.resetText}>{t('settingsResetButton')}</Text>
        </Pressable>

        <Text style={[styles.version, { color: theme.textLight }]}>Version 2.1.456</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    borderRadius: borderRadius.lg, padding: spacing.md,
  },
  setDateIcon: { fontSize: 20, marginRight: spacing.sm },
  setDateText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text, textTransform: 'capitalize' },
  setDateArrow: { fontSize: 24, color: colors.primaryDark },

  datePicker: { alignItems: 'center' },
  dateDisplay: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md, textAlign: 'center', textTransform: 'capitalize' },
  dateButtons: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dateBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  dateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primaryDark },
  todayBtn: { backgroundColor: colors.primary },
  todayBtnText: { color: colors.textOnPrimary },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  confirmBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  confirmBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },

  // Ring status
  ringStatusRow: { flexDirection: 'row', gap: spacing.md },
  statusBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.border, gap: spacing.xs,
  },
  statusBtnActiveGreen: { borderColor: colors.ringIn, backgroundColor: colors.ringInLight },
  statusBtnActiveRed: { borderColor: colors.ringOut, backgroundColor: colors.ringOutLight },
  statusEmoji: { fontSize: 24 },
  statusLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  statusLabelActive: { color: colors.text, fontWeight: fontWeight.bold },

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
});
