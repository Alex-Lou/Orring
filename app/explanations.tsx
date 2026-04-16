import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';

interface Section {
  emoji: string;
  titleKey: string;
  bodyKey: string;
}

const SECTIONS: Section[] = [
  { emoji: '🌙', titleKey: 'expSection1', bodyKey: 'expSection1Body' },
  { emoji: '💠', titleKey: 'expSection4', bodyKey: 'expSection4Body' },
  { emoji: '🌸', titleKey: 'expSection2', bodyKey: 'expSection2Body' },
  { emoji: '💡', titleKey: 'expSection3', bodyKey: 'expSection3Body' },
];

const SITE_URL = 'https://alex-lou.github.io/OrringLanding/';

export default function ExplanationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openSite = () => {
    Linking.openURL(SITE_URL).catch(() => { /* ignore */ });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={[styles.title, { color: theme.text }]}>{t('explanationsTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('explanationsSub')}</Text>
        </Animated.View>

        {SECTIONS.map((section, i) => {
          const isOpen = openIndex === i;
          return (
            <Animated.View
              key={i}
              entering={FadeInUp.delay(150 + i * 80).duration(500)}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isOpen && { borderColor: theme.primary },
              ]}
            >
              <Pressable
                onPress={() => setOpenIndex(isOpen ? null : i)}
                style={styles.header}
              >
                <View style={styles.headerLeft}>
                  <Text style={styles.emoji}>{section.emoji}</Text>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {t(section.titleKey)}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.primaryDark }]}>
                  {isOpen ? '▼' : '▶'}
                </Text>
              </Pressable>

              {isOpen && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.body}>
                  <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                    {t(section.bodyKey)}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        {/* Contact card */}
        <Animated.View
          entering={FadeInUp.delay(150 + SECTIONS.length * 80).duration(500)}
          style={[styles.contactCard, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
        >
          <Text style={[styles.contactTitle, { color: theme.text }]}>
            💌 {t('explanationsContactTitle')}
          </Text>
          <Pressable
            onPress={openSite}
            style={({ pressed }) => [
              styles.contactLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.contactLinkText, { color: theme.primaryDark }]}>
              → {t('explanationsContactText')}
            </Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.md, marginTop: 4, marginBottom: spacing.lg, lineHeight: 22 },

  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  emoji: { fontSize: 26 },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: spacing.sm,
  },

  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 4,
  },
  bodyText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
  },

  contactCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  contactLink: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  contactLinkText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textDecorationLine: 'underline',
  },
});
