import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Image } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { requestNotificationPermissions } from '../src/utils/notifications';
import { useExpoUpdates } from '../src/hooks/useExpoUpdates';
import { SplashScreen } from '../src/components/SplashScreen';
import { UpdateIndicator } from '../src/components/UpdateIndicator';
import { useCycleStore } from '../src/store/cycleStore';
import { LANGUAGES } from '../src/i18n/translations';
import '../src/i18n';
import i18n from '../src/i18n';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';

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


// ─── Greeting-icon debug picker (drawer header, index screen only) ───
//
// A tiny dropdown parked next to the "Mon Cycle" title lets us force any of
// the four time-of-day icons (Matin / ApresMidi / Soir / Nuit) without having
// to wait for the real clock or rebuild. Selecting "Auto" resets to the
// time-based logic. State lives in the zustand store (non-persisted), so it
// naturally resets on every app boot.
//
// Icon PNG sources stay at module scope (cheap `require` de-duplication),
// but the label list is built inside the component so we can pull localized
// strings from `t()` — crucial for languages like Arabic where hardcoded
// French labels would look out of place.
const ICON_SRCS = {
  morning: require('../assets/icones/Matin.png'),
  sun: require('../assets/icones/ApresMidi.png'),
  sunset: require('../assets/icones/Soir.png'),
  night: require('../assets/icones/Nuit.png'),
};

function GreetingIconDebugPicker() {
  const { debugIconOverride, setDebugIconOverride, darkMode } = useCycleStore();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const [open, setOpen] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  // Rebuilt on every render so language changes take effect immediately —
  // the work is trivial (5 small objects) so memoizing wouldn't win
  // anything meaningful.
  const ICON_OPTIONS: Array<{
    key: 'morning' | 'sun' | 'sunset' | 'night' | null;
    label: string;
    src: any;
  }> = [
    { key: null, label: 'Auto', src: null },
    { key: 'morning', label: t('greetingMorning'), src: ICON_SRCS.morning },
    { key: 'sun', label: t('greetingAfternoon'), src: ICON_SRCS.sun },
    { key: 'sunset', label: t('greetingEvening'), src: ICON_SRCS.sunset },
    { key: 'night', label: t('greetingNight'), src: ICON_SRCS.night },
  ];
  const current = ICON_OPTIONS.find(o => o.key === debugIconOverride) ?? ICON_OPTIONS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          debugStyles.trigger,
          // Margin anchors the trigger to the edge it sits against: 12px
          // inside the right edge in LTR (header-right slot), or 12px inside
          // the left edge in RTL (header-left slot beside the RTL burger).
          isRTL ? { marginLeft: 12 } : { marginRight: 12 },
          { backgroundColor: theme.activeBg, opacity: pressed ? 0.7 : 1 },
        ]}
        hitSlop={8}
      >
        {current.src ? (
          <Image
            source={current.src}
            style={[
              debugStyles.triggerIcon,
              // Nuit.png is 100%-framed while the others are ~85% — shrink
              // it a touch so every icon looks the same visible size.
              current.key === 'night' && { width: 19, height: 19 },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Text style={[debugStyles.triggerAuto, { color: theme.text }]}>🕒</Text>
        )}
        <Text style={[debugStyles.triggerLabel, { color: theme.text }]}>{current.label}</Text>
        <Text style={{ color: theme.textSec, fontSize: 10 }}>▾</Text>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={debugStyles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              debugStyles.menu,
              // The picker trigger lives on the RIGHT in LTR and the LEFT in
              // RTL — pop the dropdown out from the matching side so it
              // visually anchors to the button that opened it.
              isRTL ? { left: 12 } : { right: 12 },
              { backgroundColor: theme.headerBg, borderColor: darkMode ? '#4A3068' : '#E0D8E8' },
            ]}
          >
            {ICON_OPTIONS.map((opt) => {
              const active = debugIconOverride === opt.key;
              return (
                <Pressable
                  key={opt.key ?? 'auto'}
                  onPress={() => { setDebugIconOverride(opt.key); setOpen(false); }}
                  style={({ pressed }) => [
                    debugStyles.menuItem,
                    active && { backgroundColor: theme.activeBg },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {opt.src ? (
                    <Image
                      source={opt.src}
                      style={[
                        debugStyles.menuItemIcon,
                        opt.key === 'night' && { width: 22, height: 22 },
                      ]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={debugStyles.menuItemEmoji}>🕒</Text>
                  )}
                  <Text
                    style={[
                      debugStyles.menuItemLabel,
                      { color: active ? theme.tint : theme.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const debugStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    // Horizontal margin is applied inline (RTL-aware) to anchor the trigger
    // against whichever edge it lives next to.
  },
  triggerIcon: { width: 22, height: 22 },
  triggerAuto: { fontSize: 16 },
  triggerLabel: { fontSize: 12, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menu: {
    position: 'absolute',
    top: 56,
    // `left` / `right` are applied inline (RTL-aware) — not here.
    minWidth: 160,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemIcon: { width: 26, height: 26 },
  menuItemEmoji: { fontSize: 20 },
  menuItemLabel: { fontSize: 14, fontWeight: '600' },
});

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

      {/* Language selector — dropdown.
          Flag and label are split into SEPARATE <Text> nodes because on some
          Android devices the French flag emoji (🇫🇷, composed of regional-
          indicator pair F+R) renders wider than expected and visually eats
          the following label when they share a Text. Two Text nodes with an
          explicit gap give each its own bounding box — the label always
          shows regardless of how the flag glyph decides to render. */}
      <Pressable onPress={() => setLangOpen(!langOpen)} style={styles.drawerOption}>
        <View style={styles.drawerLangRow}>
          <Text style={styles.drawerLangFlag}>{currentLang.flag}</Text>
          <Text style={[styles.drawerLangLabel, { color: theme.text }]}>
            {currentLang.label}
          </Text>
        </View>
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
  const { darkMode, language, _hasHydrated, rescheduleNotifications } = useCycleStore();
  const { t } = useTranslation();
  const theme = darkMode ? DARK : LIGHT;
  const isRTL = useIsRTL();

  // Silent OTA check at boot — user can apply a ready update via the
  // floating UpdateIndicator without force-closing the app manually.
  const { status: updateStatus, isSettled: updateSettled, applyUpdate } = useExpoUpdates();

  // Permission prompt at boot (once).
  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  // Re-hydrate the OS notification queue on every cold boot.
  //
  // Android & iOS can silently drop scheduled notifications (force-stop,
  // OEM battery savers, reboot without BOOT_COMPLETED, user revokes then
  // re-grants POST_NOTIFICATIONS, etc.). Without this, a user who grants
  // permission AFTER installation would never see J-7/J-1/J reminders —
  // they'd only start getting them on the next insert/remove. Running
  // reschedule once per boot (gated on hydration so the store is ready)
  // closes every gap. It's a no-op if notifications are disabled or if
  // no insert has ever been logged.
  useEffect(() => {
    if (_hasHydrated) rescheduleNotifications();
  }, [_hasHydrated, rescheduleNotifications]);

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
      // Debug: on the "Mon Cycle" screen, expose a dropdown in the header to
      // force any of the four greeting icons without waiting for the clock.
      //
      // The drawer library renders the hamburger button on whichever side
      // `drawerPosition` points to (left by default, right in RTL). Since we
      // set a custom header element on the SAME side, we'd displace the
      // burger entirely. So we mount the debug picker OPPOSITE the burger:
      //   LTR : burger left  → picker right
      //   RTL : burger right → picker left
      headerRight:
        route.name === 'index' && !isRTL
          ? () => <GreetingIconDebugPicker />
          : undefined,
      headerLeft:
        route.name === 'index' && isRTL
          ? () => <GreetingIconDebugPicker />
          : undefined,
      drawerActiveTintColor: theme.tint,
      drawerInactiveTintColor: theme.textSec,
      drawerActiveBackgroundColor: theme.activeBg,
      drawerLabelStyle: { fontSize: 15, fontWeight: '600' as const, marginLeft: -8 },
      drawerStyle: { backgroundColor: theme.bg, width: 270 },
      drawerItemStyle: { borderRadius: 14, marginVertical: 2, paddingVertical: 2 },
      // In RTL languages (Arabic) the drawer & burger live on the right —
      // this is the native RTL pattern (vs. flipping the whole UI with
      // scaleX:-1, which would also mirror text and icons).
      drawerPosition: (isRTL ? 'right' : 'left') as 'left' | 'right',
      sceneStyle: { backgroundColor: theme.bg },
    };
  }, [t, theme, language, isRTL]);

  // Boot progress mapping (0 → 1). The numbers are deliberately coarse
  // because we don't get real download progress from expo-updates; they
  // just convey "something is happening" with 4 meaningful checkpoints.
  const hydrationFloor = 0.18;
  const checkedFloor = 0.55;
  const downloadFloor = 0.82;
  const finishedFloor = 1;
  let progress = 0.05;
  if (_hasHydrated) progress = hydrationFloor;
  if (updateStatus === 'checking') progress = 0.35;
  if (updateStatus === 'downloading') progress = downloadFloor;
  if (_hasHydrated && updateSettled) progress = finishedFloor;
  else if (_hasHydrated && (updateStatus === 'checking' || updateStatus === 'downloading')) progress = Math.max(progress, checkedFloor);

  // Custom splash-screen gating.
  // The native Android splash (configured via app.json) shows LandingIcon
  // while the JS bundle loads, then disappears on first React render. At
  // that point our custom SplashScreen (animated logo + boot progress bar)
  // takes over until we're "ready".
  //
  // Without a minimum display time the custom splash can flash for < 100 ms
  // on fast devices with OTA disabled + quick hydration, making the boot
  // feel like it's missing a splash entirely. A 1000 ms floor guarantees
  // the branded splash is always perceptible without feeling sluggish —
  // dev-build boot was measured < 1.2 s end-to-end including this floor.
  const MIN_SPLASH_MS = 1000;
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const splashStartRef = useRef<number>(Date.now());
  useEffect(() => {
    const remaining = MIN_SPLASH_MS - (Date.now() - splashStartRef.current);
    if (remaining <= 0) {
      setMinSplashElapsed(true);
      return;
    }
    const id = setTimeout(() => setMinSplashElapsed(true), remaining);
    return () => clearTimeout(id);
  }, []);

  const ready = _hasHydrated && updateSettled && minSplashElapsed;

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
        <SplashScreen progress={progress} updateStatus={updateStatus} />
      </GestureHandlerRootView>
    );
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
      <UpdateIndicator status={updateStatus} onApply={applyUpdate} />
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

  drawerLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLangFlag: { fontSize: 20 },
  drawerLangLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
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
