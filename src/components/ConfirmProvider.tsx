/**
 * ConfirmProvider — global, Promise-based replacement for the native
 * `Alert.alert(title, body, buttons)` API.
 *
 * Mount `<ConfirmProvider>` once at the root (in `_layout.tsx`) and
 * any component below can call `useConfirm()` to get a function that
 * opens the themed `ConfirmModal` and resolves to `true` / `false`
 * when the user picks an action. This keeps every screen's call
 * site to ~2 lines of intent ("ask, await, act") with no per-screen
 * Modal state to wire up.
 *
 * Why Promise-based: the native `Alert.alert` uses callbacks per
 * button, which forces destructive-action branches to live inside
 * the Alert config. With `await confirm({...})` the "user said yes"
 * branch lives at the call site as plain async-imperative code,
 * which reads better and survives refactors.
 */
import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { ConfirmModal } from './ConfirmModal';

export interface ConfirmOptions {
  title: string;
  body?: string;
  /** Confirm-button label; default localized via `confirm` key. */
  confirmLabel?: string;
  /** Cancel-button label; default localized via `cancel` key. */
  cancelLabel?: string;
  /** Big emoji at the top of the dialog; default 🌸. */
  emoji?: string;
  /** Renders the confirm button in red — for delete-style flows. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

// Default fallback: when no provider is mounted (shouldn't happen
// outside tests), resolve to `false` so nothing destructive ever
// runs without the provider being in scope.
const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    // Snapshot the resolver before clearing state — if multiple
    // confirms fire in quick succession we don't want to drop one.
    if (state) {
      state.resolve(value);
      setState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        visible={!!state}
        title={state?.title ?? ''}
        body={state?.body}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        emoji={state?.emoji}
        destructive={state?.destructive}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Hook that returns a `confirm({...})` function. Awaits the user's
 * choice and resolves to `true` (confirmed) or `false` (cancelled /
 * backdrop-tapped). Use it wherever you'd have called `Alert.alert`
 * with a 2-button confirm + cancel shape.
 *
 * @example
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Supprimer ?', destructive: true })) {
 *     deleteItem();
 *   }
 */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
