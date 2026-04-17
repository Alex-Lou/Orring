import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error' | 'disabled';

/**
 * Silent OTA check at app start.
 *
 * Behaviour:
 *   - In dev (or when updates are disabled), this hook is a no-op.
 *   - At mount, it asks the update server whether a newer JS bundle is
 *     available for the current runtimeVersion.
 *   - If yes, it downloads the bundle in the background and marks the
 *     status as 'ready'. The new bundle is applied at the NEXT natural
 *     app launch (cold start) — we do NOT force a reload mid-session,
 *     which would be jarring for the user.
 *   - No network? Not ready? We fail silently — the user keeps running
 *     the currently installed bundle, zero friction.
 *
 * If we ever want to surface a small "relaunch to apply" toast, the
 * `status === 'ready'` signal is right here to wire it up.
 */
export function useExpoUpdates() {
  const [status, setStatus] = useState<UpdateStatus>(() =>
    __DEV__ || !Updates.isEnabled ? 'disabled' : 'idle',
  );

  useEffect(() => {
    // Skip when running under Metro (dev) or when the APK was built
    // without expo-updates (e.g. a bare gradle build before setup).
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        setStatus('checking');
        const res = await Updates.checkForUpdateAsync();
        if (cancelled) return;
        if (!res.isAvailable) {
          setStatus('idle');
          return;
        }

        setStatus('downloading');
        await Updates.fetchUpdateAsync();
        if (cancelled) return;
        setStatus('ready');
      } catch {
        // Silent — next launch will try again. Keeps the UX peaceful.
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /** True while the hook still has network work in flight. */
  const isBusy = status === 'checking' || status === 'downloading';
  /** True once the hook has finished, whether or not an update was applied. */
  const isSettled = status === 'idle' || status === 'ready' || status === 'error' || status === 'disabled';

  return { status, isBusy, isSettled };
}
