import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useConfirm } from './ConfirmProvider';
import { parseBackup, type BackupPayload } from '../utils/backup';
import { useTheme } from '../theme/useTheme';
import { styles } from '../styles/settings.styles';

interface RestoreBackupModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (payload: BackupPayload) => void;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>['t'];
}

/**
 * Restore modal — themed, mirrors the ConfirmModal aesthetic.
 * Pasting expects the JSON the user got from "Sauvegarder
 * mes données" (Drive, email, notes, etc.). Errors surface
 * inline so the user can fix and retry without losing the
 * current paste.
 *
 * Owns its own paste/error state. The parent keeps the `visible`
 * boolean that controls the modal and passes `onImport` (importData).
 */
export function RestoreBackupModal({ visible, onClose, onImport, theme, t }: RestoreBackupModalProps) {
  const confirm = useConfirm();
  // Restore-from-paste UI state. The user pastes a previously-shared
  // JSON string (Drive / email / notes) — we validate via parseBackup
  // and call importData on success.
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Each open starts from a clean slate — matches the original
  // behaviour where the opening button reset text+error on every tap.
  useEffect(() => {
    if (visible) {
      setRestoreText('');
      setRestoreError(null);
    }
  }, [visible]);

  // Restore flow — user pastes a previously-shared JSON, we validate
  // and replay it into the store. parseBackup gives a structured
  // error so we can surface a meaningful message rather than a stack.
  const handleRestoreSubmit = async () => {
    const result = parseBackup(restoreText);
    if (!result.ok) {
      setRestoreError(
        result.error === 'invalid_json'
          ? t('settingsRestoreErrorInvalid', { defaultValue: 'Le texte collé n\'est pas un JSON valide.' })
          : t('settingsRestoreErrorSchema', { defaultValue: 'Cette sauvegarde n\'est pas reconnue (mauvais format).' })
      );
      return;
    }
    if (!await confirm({
      title: t('settingsRestoreConfirmTitle', { defaultValue: 'Restaurer cette sauvegarde ?' }),
      body: t('settingsRestoreConfirmBody', {
        defaultValue: 'Toutes les données actuelles seront remplacées par celles de la sauvegarde.',
      }),
      confirmLabel: t('settingsRestoreConfirmCta', { defaultValue: 'Restaurer' }),
      destructive: true,
      emoji: '📥',
    })) return;
    onImport(result.payload);
    onClose();
    setRestoreText('');
    setRestoreError(null);
    setTimeout(() => router.replace('/'), 100);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.restoreOverlay} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[styles.restoreCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[styles.restoreTitle, { color: theme.text }]}>
            📥 {t('settingsRestoreTitle', { defaultValue: 'Restaurer mes données' })}
          </Text>
          <Text style={[styles.restoreBody, { color: theme.textSecondary }]}>
            {t('settingsRestoreBody', {
              defaultValue:
                'Colle ici le texte d\'une sauvegarde Orring obtenue précédemment via "Sauvegarder mes données".',
            })}
          </Text>
          <TextInput
            style={[styles.restoreInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            value={restoreText}
            onChangeText={txt => { setRestoreText(txt); setRestoreError(null); }}
            placeholder={t('settingsRestorePlaceholder', { defaultValue: 'Colle ton JSON de sauvegarde ici…' })}
            placeholderTextColor={theme.textLight}
            multiline
            numberOfLines={6}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {restoreError && (
            <Text style={styles.restoreErrorText}>{restoreError}</Text>
          )}
          <View style={styles.restoreActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.restoreBtn,
                styles.restoreBtnGhost,
                { borderColor: theme.border },
                pressed && { opacity: 0.55 },
              ]}
            >
              <Text style={[styles.restoreBtnLabel, { color: theme.textSecondary }]}>
                {t('cancel', { defaultValue: 'Annuler' })}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRestoreSubmit}
              disabled={!restoreText.trim()}
              style={({ pressed }) => [
                styles.restoreBtn,
                { backgroundColor: theme.primary },
                !restoreText.trim() && { opacity: 0.4 },
                pressed && restoreText.trim() && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.restoreBtnLabel, { color: '#FFFFFF' }]}>
                {t('settingsRestoreCta', { defaultValue: 'Restaurer' })}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
