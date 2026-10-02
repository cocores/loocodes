import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  deleteAccount,
  signInWithApple,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

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
    }),
    [user, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
