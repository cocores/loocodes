import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Bathroom, NewBathroom } from "../types";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  createBathroom,
  flagBathroom,
  subscribeToBathrooms,
  suggestBathroomUpdate,
  voteUpBathroom,
} from "../lib/firestoreBathrooms";
import { getUserId, resetUserId } from "../lib/anonymousUser";
import { clearFlaggedLocally, hasFlaggedLocally, markFlaggedLocally } from "../lib/flaggedTracker";
import { SEED_BATHROOMS } from "./seed";

const LOCAL_CACHE_KEY = "loocodes.bathrooms.local-fallback.v1";
const NO_FIREBASE_MESSAGE =
  "No Firebase project configured. Set VITE_FIREBASE_* env vars (see web/README.md).";

// Upgrades bathrooms cached under an older app version — this cache can
// persist in a real browser across schema changes (flagCount replacing a
// hasFlagged boolean, then lastConfirmedAt/suggestions being added for the
// trust model). Without this, a stale cached record missing a field the UI
// now assumes always exists (e.g. `suggestions.length`) crashes the render.
function normalizeBathroom(bathroom: Bathroom & { hasFlagged?: boolean }): Bathroom {
  const { hasFlagged, ...rest } = bathroom;
  return {
    ...rest,
    flagCount: typeof bathroom.flagCount === "number" ? bathroom.flagCount : hasFlagged ? 1 : 0,
    lastConfirmedAt: typeof bathroom.lastConfirmedAt === "number" ? bathroom.lastConfirmedAt : 0,
    suggestions: Array.isArray(bathroom.suggestions) ? bathroom.suggestions : [],
    isZohranToilet: typeof bathroom.isZohranToilet === "boolean" ? bathroom.isZohranToilet : false,
  };
}

function loadLocalFallback(): Bathroom[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) return (JSON.parse(raw) as Bathroom[]).map(normalizeBathroom);
  } catch {
    // ignore corrupt cache
  }
  return SEED_BATHROOMS;
}

interface BathroomStoreValue {
  bathrooms: Bathroom[];
  myCodes: Bathroom[];
  isLoading: boolean;
  /** True when Firestore is unreachable or unconfigured — sharing is local-only until this clears. */
  isOffline: boolean;
  offlineReason: string | null;
  add: (bathroom: NewBathroom) => Promise<void>;
  voteUp: (id: string) => Promise<void>;
  flag: (id: string) => Promise<void>;
  suggest: (id: string, text: string) => Promise<void>;
  /** Forgets this browser's local identity (new anon id, cleared flag history).
   * Does NOT touch any shared code data — codes already published stay public,
   * they just stop showing under "My Codes" for this browser. */
  resetAccount: () => void;
}

const BathroomStoreContext = createContext<BathroomStoreValue | null>(null);

export function BathroomStoreProvider({ children }: { children: ReactNode }) {
  const [bathrooms, setBathrooms] = useState<Bathroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const [userId, setUserId] = useState(getUserId);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    if (!isFirebaseConfigured()) {
      setBathrooms(loadLocalFallback());
      setIsOffline(true);
      setOfflineReason(NO_FIREBASE_MESSAGE);
      setIsLoading(false);
      return;
    }

    subscribeToBathrooms(
      (list) => {
        if (cancelled) return;
        setBathrooms(list);
        setIsOffline(false);
        setOfflineReason(null);
        setIsLoading(false);
      },
      (err) => {
        if (cancelled) return;
        setBathrooms(loadLocalFallback());
        setIsOffline(true);
        setOfflineReason(err.message);
        setIsLoading(false);
      },
    ).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (isOffline) localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(bathrooms));
  }, [bathrooms, isOffline]);

  const add = useCallback(
    async (bathroom: NewBathroom) => {
      if (isOffline) {
        const local: Bathroom = {
          ...bathroom,
          id: crypto.randomUUID(),
          isVerified: false,
          isZohranToilet: false,
          upvoteCount: 0,
          hasVotedUp: false,
          flagCount: 0,
          lastConfirmedAt: Date.now(),
          suggestions: [],
        };
        setBathrooms((prev) => [local, ...prev]);
        return;
      }
      // No manual setBathrooms here — the onSnapshot subscription above
      // picks up the new doc (and reflects it to every other open tab too).
      await createBathroom(bathroom);
    },
    [isOffline],
  );

  const voteUp = useCallback(
    async (id: string) => {
      if (isOffline) {
        setBathrooms((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...b, hasVotedUp: true, upvoteCount: b.upvoteCount + 1, lastConfirmedAt: Date.now() }
              : b,
          ),
        );
        return;
      }
      try {
        await voteUpBathroom(id);
      } catch (err) {
        console.error("Failed to vote up bathroom", err);
      }
    },
    [isOffline],
  );

  const flag = useCallback(
    async (id: string) => {
      if (hasFlaggedLocally(id)) return;

      if (isOffline) {
        setBathrooms((prev) =>
          prev.map((b) => (b.id === id ? { ...b, flagCount: b.flagCount + 1 } : b)),
        );
        markFlaggedLocally(id);
        return;
      }
      try {
        await flagBathroom(id);
        markFlaggedLocally(id);
      } catch (err) {
        console.error("Failed to flag bathroom", err);
      }
    },
    [isOffline],
  );

  const suggest = useCallback(
    async (id: string, text: string) => {
      if (isOffline) {
        setBathrooms((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  suggestions: [
                    ...b.suggestions,
                    { id: crypto.randomUUID(), text, submittedBy: getUserId(), createdAt: Date.now() },
                  ],
                }
              : b,
          ),
        );
        return;
      }
      try {
        await suggestBathroomUpdate(id, text, getUserId());
      } catch (err) {
        console.error("Failed to submit suggestion", err);
      }
    },
    [isOffline],
  );

  const myCodes = useMemo(
    () => bathrooms.filter((b) => b.submittedBy === userId),
    [bathrooms, userId],
  );

  const resetAccount = useCallback(() => {
    clearFlaggedLocally();
    setUserId(resetUserId());
  }, []);

  const value = useMemo(
    () => ({
      bathrooms,
      myCodes,
      isLoading,
      isOffline,
      offlineReason,
      add,
      voteUp,
      flag,
      suggest,
      resetAccount,
    }),
    [
      bathrooms,
      myCodes,
      isLoading,
      isOffline,
      offlineReason,
      add,
      voteUp,
      flag,
      suggest,
      resetAccount,
    ],
  );

  return <BathroomStoreContext.Provider value={value}>{children}</BathroomStoreContext.Provider>;
}

export function useBathroomStore(): BathroomStoreValue {
  const ctx = useContext(BathroomStoreContext);
  if (!ctx) throw new Error("useBathroomStore must be used within BathroomStoreProvider");
  return ctx;
}
