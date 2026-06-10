import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Switch, TextInput } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/theme';
import { useCycleStore } from '../src/store/cycleStore';
import { formatDateTimeFr } from '../src/utils/cycle';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
import { useConfirm } from '../src/components/ConfirmProvider';
import { GoodbyeFarewell } from '../src/components/GoodbyeFarewell';
import { RestoreBackupModal } from '../src/components/RestoreBackupModal';
import { serializeBackup } from '../src/utils/backup';
import { dateKey } from '../src/utils/dateKey';
import { styles } from './settings.styles';

export default function SettingsScreen() {
  const {
    firstInsertDate,
    ringStatus,
    setRingStatus,
    notificationsEnabled,
    setNotificationsEnabled,
    reminderHour,
    setReminderTime,
    resetAll,
    exportData,
    importData,
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
  const isRTL = useIsRTL();
  const confirm = useConfirm();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName || '');
  // GoodbyeFarewell visibility — gated by the destructive confirm
  // dialog above. The reset itself only runs after the user picks
  // "Tout effacer et partir" inside the farewell screen.
  const [farewellOpen, setFarewellOpen] = useState(false);
  // Restore-from-paste UI state. The parent only owns the open/close
  // flag; the paste text + validation live inside RestoreBackupModal.
  const [restoreOpen, setRestoreOpen] = useState(false);

  // Two-step reset flow:
  //   1. ConfirmModal — sanity check ("Tu es sûre ?")
  //   2. GoodbyeFarewell — soft farewell with last chance to backup
  // The actual store wipe only runs when the user confirms inside
  // the farewell screen via `handleFarewellConfirm` below.
  const handleReset = async () => {
    if (await confirm({
      title: t('settingsResetTitle'),
      body: t('settingsResetMessage'),
      confirmLabel: t('settingsResetLabel'),
      destructive: true,
      emoji: '🔄',
    })) {
      setFarewellOpen(true);
    }
  };

  // v2.7.0: write the backup to a real .json file in the cache
  // directory and open the system share sheet on it. The user picks
  // the destination (Files app → "Téléchargements", Drive, email,
  // WhatsApp…). The file is named with today's date so the user has
  // a clear "orring-backup-2026-05-04.json" instead of a JSON blob
  // of mystery text.
  //
  // Writing to `Paths.cache` instead of `Paths.document` is
  // deliberate — the system can clean it later, but the user has
  // already moved it elsewhere via the share sheet by then. No
  // unbounded growth of internal storage.
  const handleSaveData = async () => {
    try {
      const snapshot = exportData();
      const json = serializeBackup(snapshot, '2.7.0');
      // YYYY-MM-DD filename — sortable, locale-independent.
      const stamp = dateKey(new Date());
      const filename = `orring-backup-${stamp}.json`;
      const file = new File(Paths.cache, filename);
      // create({ overwrite: true }) is idempotent — if the user
      // exports twice the same day the previous file is replaced
      // cleanly instead of throwing.
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: t('settingsBackupShareTitle', { defaultValue: 'Sauvegarde Orring' }),
          UTI: 'public.json',
        });
      }
    } catch {
      // User dismissed the share sheet OR a transient FS error —
      // silent no-op matches platform conventions.
    }
  };

  const handleFarewellConfirm = () => {
    setFarewellOpen(false);
    resetAll();
    setTimeout(() => router.replace('/'), 100);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
            <Image
              source={require('../assets/OrringBluePetNoBgSalute.png')}
              style={[styles.titlePet, isRTL && { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('configureTracking')}</Text>
        </Animated.View>

        {/* Nom de l'utilisatrice */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('userNameLabel')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
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
                style={[styles.setDateBtn, isRTL && styles.rtlRow, { backgroundColor: theme.primarySoft }]}
              >
                <Text style={styles.setDateIcon}>👤</Text>
                <Text style={[styles.setDateText, { color: theme.text }, isRTL && styles.rtlText]}>
                  {userName || t('userNameNone')}
                </Text>
                <Text style={{ color: theme.primaryDark, fontSize: fontSize.sm, fontWeight: '700' }}>{t('edit')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Date de début */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('referenceDate')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
              {t('referenceDateDescFull')}
            </Text>
            <View style={[styles.setDateBtn, isRTL && styles.rtlRow, { backgroundColor: theme.primarySoft }]}>
              <Text style={styles.setDateIcon}>📅</Text>
              <Text style={[styles.setDateText, { color: theme.text }, isRTL && styles.rtlText]}>
                {firstInsertDate ? formatDateTimeFr(new Date(firstInsertDate)) : t('notConfigured')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Statut anneau */}
        <Animated.View entering={FadeInUp.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('ringStatus')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
              {t('ringStatusDescFull')}
            </Text>
            <View style={[styles.ringStatusRow, isRTL && styles.rtlRow]}>
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
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('notifications')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={[styles.settingRow, isRTL && styles.rtlRow]}>
              <View style={[styles.settingInfo, isRTL && { marginRight: 0, marginLeft: spacing.md }]}>
                <Text style={[styles.settingLabel, { color: theme.text }, isRTL && styles.rtlText]}>{t('remindersEnabled')}</Text>
                <Text style={[styles.settingDesc, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('remindersDescFull')}</Text>
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
                <Text style={[styles.settingLabel, { color: theme.text }, isRTL && styles.rtlText]}>{t('reminderHour')}</Text>
                <View style={[styles.timeButtons, isRTL && styles.rtlRow]}>
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
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>{t('about')}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.aboutCycle, { color: theme.text, backgroundColor: theme.primarySoft }, isRTL && styles.rtlText]}>
              {t('aboutText')}
            </Text>
          </View>
        </Animated.View>

        {/* Backup parachute — surfaces "save my data" + "restore"
            actions independently of the destructive reset flow. */}
        <View style={[styles.card, { backgroundColor: theme.surface, marginBottom: spacing.md }]}>
          <Pressable
            onPress={handleSaveData}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              💾 {t('settingsBackupSave', { defaultValue: 'Sauvegarder mes données' })}
            </Text>
            <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
              {t('settingsBackupSaveHint', {
                defaultValue: 'Exporte tes données vers Drive, email, notes…',
              })}
            </Text>
          </Pressable>
          <View style={[styles.cardSep, { backgroundColor: theme.border }]} />
          <Pressable
            onPress={() => setRestoreOpen(true)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              📥 {t('settingsBackupRestore', { defaultValue: 'Restaurer depuis une sauvegarde' })}
            </Text>
            <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
              {t('settingsBackupRestoreHint', {
                defaultValue: 'Colle le texte d\'une sauvegarde précédente.',
              })}
            </Text>
          </Pressable>
        </View>

        {/* Reset */}
        <Pressable style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.8 }]} onPress={handleReset}>
          <Text style={styles.resetText}>{t('settingsResetButton')}</Text>
        </Pressable>

        <Text style={[styles.version, { color: theme.textLight }]}>Version {Constants.expoConfig?.version ?? '2.7.0'}</Text>
      </ScrollView>

      <GoodbyeFarewell
        visible={farewellOpen}
        onSaveData={handleSaveData}
        onConfirmReset={handleFarewellConfirm}
        onCancel={() => setFarewellOpen(false)}
      />

      {/* Restore-from-paste modal — owns its paste text + validation
          internally; the parent only controls visibility and passes
          importData. */}
      <RestoreBackupModal
        visible={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onImport={importData}
        theme={theme}
        t={t}
      />
    </SafeAreaView>
  );
}
