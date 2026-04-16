import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { requestNotificationPermissions } from '../src/utils/notifications';
import { useCycleStore } from '../src/store/cycleStore';
import { LANGUAGES } from '../src/i18n/translations';
import '../src/i18n';
import i18n from '../src/i18n';
import { useTranslation } from 'react-i18next';

const LIGHT = {
  bg: '#F6F2FB', headerBg: '#EFE8F7', tint: '#7F6EBA',
  text: '#2D2A3A', textSec: '#8B8696', activeBg: '#D9D0EC',
};
const DARK = {
  bg: '#1C1829', headerBg: '#2A2440', tint: '#C9BCEC',
  text: '#EEE8F8', textSec: '#BDB4D2', activeBg: 'rgba(181,165,226,0.22)',
};

const ROUTE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; titleKey: string }> = {
  index: { icon: 'ellipse', titleKey: 'myCycleDrawer' },
  calendar: { icon: 'calendar', titleKey: 'calendarDrawer' },
  history: { icon: 'time', titleKey: 'historyDrawer' },
  explanations: { icon: 'book-outline', titleKey: 'explanationsDrawer' },
  settings: { icon: 'settings-outline', titleKey: 'settingsDrawer' },
};


// ─── Drawer content ───
function CustomDrawerContent(props: any) {
  const { darkMode, toggleDarkMode, language, setLanguage } = useCycleStore();
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const handleLang = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.bg }}>
      <DrawerItemList {...props} />

      <View style={[styles.divider, { backgroundColor: darkMode ? '#4A3068' : '#E0D8E8' }]} />

      {/* Dark mode toggle */}
      <Pressable onPress={toggleDarkMode} style={styles.drawerOption}>
        <Text style={[styles.drawerOptionText, { color: theme.text }]}>
          {darkMode ? `☀️ ${t('lightMode')}` : `🌙 ${t('darkModeToggle')}`}
        </Text>
        <View style={[styles.toggle, darkMode && styles.toggleActive]}>
          <View style={[styles.toggleDot, darkMode && styles.toggleDotActive]} />
        </View>
      </Pressable>

      {/* Language selector — dropdown */}
      <Pressable onPress={() => setLangOpen(!langOpen)} style={styles.drawerOption}>
        <Text style={[styles.drawerOptionText, { color: theme.text }]}>
          {currentLang.flag} {currentLang.label}
        </Text>
        <Text style={{ color: theme.textSec }}>{langOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {langOpen && (
        <View style={[styles.langDropdown, { backgroundColor: theme.bg, borderColor: theme.textSec }]}>
          {LANGUAGES.map(({ code, flag, label }) => (
            <Pressable
              key={code}
              onPress={() => handleLang(code)}
              style={[styles.langItem, language === code && { backgroundColor: theme.activeBg }]}
            >
              <Text style={styles.langFlag}>{flag}</Text>
              <Text style={[styles.langLabel, { color: language === code ? theme.tint : theme.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </DrawerContentScrollView>
  );
}

// ─── Root Layout ───
export default function RootLayout() {
  const { darkMode, language, _hasHydrated } = useCycleStore();
  const { t } = useTranslation();
  const theme = darkMode ? DARK : LIGHT;

  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  useEffect(() => {
    if (language) i18n.changeLanguage(language);
  }, [language]);

  const getScreenOptions = useCallback(({ route }: { route: { name: string } }) => {
    const config = ROUTE_CONFIG[route.name];
    return {
      title: config ? t(config.titleKey) : route.name,
      drawerIcon: config
        ? ({ color }: { color: string }) => <Ionicons name={config.icon} size={22} color={color} />
        : undefined,
      headerStyle: { backgroundColor: theme.headerBg, elevation: 0, shadowOpacity: 0 },
      headerTintColor: theme.tint,
      headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: theme.text },
      drawerActiveTintColor: theme.tint,
      drawerInactiveTintColor: theme.textSec,
      drawerActiveBackgroundColor: theme.activeBg,
      drawerLabelStyle: { fontSize: 15, fontWeight: '600' as const, marginLeft: -8 },
      drawerStyle: { backgroundColor: theme.bg, width: 270 },
      drawerItemStyle: { borderRadius: 14, marginVertical: 2, paddingVertical: 2 },
      sceneStyle: { backgroundColor: theme.bg },
    };
  }, [t, theme, language]);

  // Wait for store hydration (show blank lavender bg)
  if (!_hasHydrated) {
    return <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={getScreenOptions}
      >
        <Drawer.Screen name="index" />
        <Drawer.Screen name="calendar" />
        <Drawer.Screen name="history" />
        <Drawer.Screen name="explanations" />
        <Drawer.Screen name="settings" />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, marginHorizontal: 16, marginVertical: 10 },
  drawerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, marginHorizontal: 8, borderRadius: 14,
  },
  drawerOptionText: { fontSize: 14, fontWeight: '600' },
  toggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: '#E0D8E8',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: '#B080D0' },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  toggleDotActive: { alignSelf: 'flex-end' },

  langDropdown: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 10,
  },
  langItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 14, fontWeight: '600' },
});
