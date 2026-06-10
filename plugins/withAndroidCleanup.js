const { withAndroidManifest } = require('expo/config-plugins');

// Permissions Orring never uses but that get auto-injected by React Native
// (SYSTEM_ALERT_WINDOW for the dev overlay) or by older Expo storage modules
// (READ/WRITE_EXTERNAL_STORAGE). Google scrutinises permissions hard on
// sensitive-data (health) apps, so we strip them from the shipped manifest.
const PERMISSIONS_TO_REMOVE = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

/**
 * Keeps a future `expo prebuild` in sync with the hand-edited native
 * manifest: re-strips the unused permissions every time the Android
 * project is regenerated, so they can't silently creep back in.
 * (allowBackup=false is handled via app.json `android.allowBackup`.)
 */
module.exports = function withAndroidCleanup(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (perm) => !PERMISSIONS_TO_REMOVE.includes(perm?.$?.['android:name'])
      );
    }
    return cfg;
  });
};
