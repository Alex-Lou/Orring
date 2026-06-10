import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { requestNotificationPermissions } from '../src/utils/notifications';
import { useExpoUpdates } from '../src/hooks/useExpoUpdates';
import { SplashScreen } from '../src/components/SplashScreen';
import { UpdateIndicator } from '../src/components/UpdateIndicator';
import { ConfirmProvider } from '../src/components/ConfirmProvider';
import { useCycleStore } from '../src/store/cycleStore';
import { LANGUAGES } from '../src/i18n/translations';
import '../src/i18n';
import i18n from '../src/i18n';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';

const LIGHT = {
  // Drawer panel + top header bar held in a soft lavande (NOT near-white):
  // the previous #F6F2FB / #EFE8F7 read as a harsh white slab at night / in
  // the evening / for sensitive eyes. Kept in step with the main background
  // (#E7DDF0) so nothing glares.
  bg: '#E7DDF0', headerBg: '#DFD4EE', tint: '#7F6EBA',
  text: '#2D2A3A', textSec: '#8B8696', activeBg: '#D6C9EC',
  // Hairline / soft-edge color — used for the rounded drawer right
  // edge and any other subtle separator. Kept just barely visible.
  border: 'rgba(45,42,58,0.10)',
};
const DARK = {
  bg: '#1C1829', headerBg: '#2A2440', tint: '#C9BCEC',
  text: '#EEE8F8', textSec: '#BDB4D2', activeBg: 'rgba(181,165,226,0.22)',
  border: 'rgba(238,232,248,0.10)',
};

// v2.6.5: drawer entirely switches from PNG illustrations to Ionicons
// vector glyphs — sober line-art, automatically theme-aware via the
// `color` prop (no per-mode export needed), pixel-perfect at any size.
// The set was picked for visual coherence: all "outline" variants for
// consistent stroke weight + readable shape across light/dark mode.
const ROUTE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; titleKey: string }> = {
  index: { icon: 'sync-outline', titleKey: 'myCycleDrawer' },
  calendar: { icon: 'calendar-outline', titleKey: 'calendarDrawer' },
  periods: { icon: 'water-outline', titleKey: 'periodsDrawer' },
  history: { icon: 'time-outline', titleKey: 'historyDrawer' },
  explanations: { icon: 'book-outline', titleKey: 'explanationsDrawer' },
  settings: { icon: 'settings-outline', titleKey: 'settingsDrawer' },
};

// DrawerMetierIcon + DRAWER_ICON_PNGS removed in v2.6.5. The renderer
// in `getScreenOptions` now goes straight to the Ionicons glyph from
// ROUTE_CONFIG — vector, theme-aware, looks crisp at any density.


// GreetingIconDebugPicker + its ICON_SRCS / debugStyles were removed in
// v2.6.5 — the dev-time time-of-day override is no longer surfaced. The
// store's `debugIconOverride` field stays available as a future hook
// (e.g. an admin / QA mode) but is never read by the UI.


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
  // Landscape: the drawer header eats too much of the short vertical axis,
  // so we shrink it (smaller bar height + title) to give the screen content
  // back its room. Portrait keeps the comfortable default.
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;

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
        ? ({ color }: { color: string }) => (
            <Ionicons name={config.icon} size={22} color={color} />
          )
        : undefined,
      // Landscape: we ONLY trim the title font — never the bar height or the
      // status-bar inset. Shrinking those pushed the hamburger up under
      // Android's system UI / display cutout, making it untouchable. Touch
      // reachability of the burger beats a few saved pixels, so the safe-area
      // inset is always preserved and the header keeps its default height.
      headerStyle: { backgroundColor: theme.headerBg, elevation: 0, shadowOpacity: 0 },
      headerTintColor: theme.tint,
      headerTitleStyle: { fontWeight: '700' as const, fontSize: isLandscape ? 16 : 18, color: theme.text },
      // Debug: on the "Mon Cycle" screen, expose a dropdown in the header to
      // force any of the four greeting icons without waiting for the clock.
      //
      // The drawer library renders the hamburger button on whichever side
      // GreetingIconDebugPicker removed in v2.6.5 — was a dev-time
      // dropdown for forcing a specific time-of-day greeting icon
      // without waiting for the real clock. The component definition
      // + store field are kept (debugIconOverride) for any future
      // re-introduction, but the UI hook is gone.
      drawerActiveTintColor: theme.tint,
      drawerInactiveTintColor: theme.textSec,
      drawerActiveBackgroundColor: theme.activeBg,
      drawerLabelStyle: { fontSize: 15, fontWeight: '600' as const, marginLeft: -8 },
      // v2.7.0 design pass: soften the drawer's exposed edge so it
      // reads as a friendly card sliding in instead of a hard
      // rectangular sheet. Only the trailing edge (the one facing the
      // main content while the drawer is open) gets rounded — in LTR
      // that's the right side, in RTL it's the left. The other edge
      // is offscreen so rounding it would do nothing.
      // A subtle hairline + drop shadow on the trailing edge gives
      // depth without being loud.
      drawerStyle: {
        backgroundColor: theme.bg,
        width: 272,
        borderTopRightRadius: isRTL ? 0 : 22,
        borderBottomRightRadius: isRTL ? 0 : 22,
        borderTopLeftRadius: isRTL ? 22 : 0,
        borderBottomLeftRadius: isRTL ? 22 : 0,
        // RN drawer's outer container drops a subtle shadow already
        // on Android's elevation; we layer a soft side-shadow via a
        // light hairline border on the trailing edge for the rounding
        // to read crisply against the page.
        borderRightWidth: isRTL ? 0 : StyleSheet.hairlineWidth,
        borderLeftWidth: isRTL ? StyleSheet.hairlineWidth : 0,
        borderColor: theme.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: isRTL ? -2 : 2, height: 0 },
        overflow: 'hidden' as const,
      },
      drawerItemStyle: { borderRadius: 14, marginVertical: 2, paddingVertical: 2 },
      // In RTL languages (Arabic) the drawer & burger live on the right —
      // this is the native RTL pattern (vs. flipping the whole UI with
      // scaleX:-1, which would also mirror text and icons).
      drawerPosition: (isRTL ? 'right' : 'left') as 'left' | 'right',
      sceneStyle: { backgroundColor: theme.bg },
    };
  }, [t, theme, language, isRTL, isLandscape]);

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
      {/* ConfirmProvider sits above the Drawer so every screen can call
          `useConfirm()` to surface a themed dialog instead of the
          native `Alert.alert` (which renders as a stark white sheet
          that breaks the app's palette). One mount, app-wide. */}
      <ConfirmProvider>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={getScreenOptions}
        >
          <Drawer.Screen name="index" />
          <Drawer.Screen name="calendar" />
          <Drawer.Screen name="periods" />
          <Drawer.Screen name="history" />
          <Drawer.Screen name="explanations" />
          <Drawer.Screen name="settings" />
        </Drawer>
        <UpdateIndicator status={updateStatus} onApply={applyUpdate} />
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}

// ─── App-wide render-error net ───
// Expo Router renders this instead of a blank white screen if any route
// subtree throws during render. Kept dependency-light (fixed light palette,
// no store/hook reads) so it still paints even when the crash originated in
// state or theming. The user's persisted data is never touched here.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[boundaryStyles.root, { backgroundColor: LIGHT.bg }]}>
        <Text style={boundaryStyles.emoji}>🌸</Text>
        <Text style={[boundaryStyles.title, { color: LIGHT.text }]}>
          {i18n.t('errorTitle', { defaultValue: 'Oups, un petit souci' })}
        </Text>
        <Text style={[boundaryStyles.body, { color: LIGHT.textSec }]}>
          {i18n.t('errorBody', {
            defaultValue: "Tes données sont en sécurité. Réessaie pour revenir à l'application.",
          })}
        </Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [
            boundaryStyles.btn,
            { backgroundColor: LIGHT.tint },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={boundaryStyles.btnText}>
            {i18n.t('errorRetry', { defaultValue: 'Réessayer' })}
          </Text>
        </Pressable>
        {__DEV__ && error?.message ? (
          <Text style={boundaryStyles.debug}>{error.message}</Text>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const boundaryStyles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  debug: { marginTop: 20, fontSize: 11, color: '#B00', textAlign: 'center', opacity: 0.7 },
});

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
