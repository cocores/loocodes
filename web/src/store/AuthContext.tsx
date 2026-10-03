import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  completeRedirectSignIn,
  deleteAccount,
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  signInWithApple,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  updateNotificationPrefs,
  type NotificationPrefs,
  type User,
} from "../lib/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns true on success. On failure (most commonly Firebase requiring
   * a "recent" sign-in before letting an account delete itself), sets
   * `error` with a message the caller can show, and returns false. */
  deleteAccount: () => Promise<boolean>;
  notificationPrefs: NotificationPrefs;
  /** Patches just the given keys and persists the full resulting object —
   * callers never need to read the current value first. */
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }
    // Surfaces an error from a sign-in redirect that just completed (e.g.
    // the same email already exists under a different provider) — a
    // successful sign-in doesn't need anything from this, it's picked up
    // by the onAuthStateChanged listener below like any other session.
    completeRedirectSignIn().catch((err) => {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    });
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
      return;
    }
    let cancelled = false;
    // A brand-new sign-in's profile doc may not exist yet (ensureUserProfile
    // runs fire-and-forget in subscribeToAuthState) — getNotificationPrefs
    // already falls back to all-off defaults for a missing doc, which is the
    // right value for a brand-new account anyway, so there's nothing to race.
    getNotificationPrefs(user.uid).then((prefs) => {
      if (!cancelled) setNotificationPrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      signInWithGoogle: async () => {
        setError(null);
        try {
          await signInWithGoogle();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
        }
      },
      signInWithApple: async () => {
        setError(null);
        try {
          await signInWithApple();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
        }
      },
      signOut: async () => {
        await signOutUser();
      },
      deleteAccount: async () => {
        setError(null);
        try {
          await deleteAccount();
          return true;
        } catch (err) {
          const code = (err as { code?: string }).code;
          setError(
            code === "auth/requires-recent-login"
              ? "For security, please sign out and sign back in before deleting your account."
              : err instanceof Error
                ? err.message
                : "Failed to delete account. Please try again.",
          );
          return false;
        }
      },
      notificationPrefs,
      updateNotificationPrefs: async (patch) => {
        if (!user) return;
        const next = { ...notificationPrefs, ...patch };
        // Optimistic, same as every other write in this app — reflect the
        // change locally immediately rather than waiting on the round trip.
        setNotificationPrefs(next);
        await updateNotificationPrefs(user.uid, next);
      },
    }),
    [user, isLoading, error, notificationPrefs],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
