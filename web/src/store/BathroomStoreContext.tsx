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
  clearFlag as clearFlagInFirestore,
  createBathroom,
  flagBathroom,
  subscribeToBathrooms,
  suggestBathroomUpdate,
  voteUpBathroom,
} from "../lib/firestoreBathrooms";
import { useAuth } from "./AuthContext";
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
  /** Admin action (see views/AdminFlaggedView.tsx) — resets a listing's flag
   * count once a report's been reviewed. No real auth/admin role exists in
   * this app; the security rules narrowly scope what this can touch. */
  clearFlag: (id: string) => Promise<void>;
  suggest: (id: string, text: string) => Promise<void>;
  /** Which bathrooms *this account* has personally voted up / flagged —
   * derived from each bathroom document's own `voters`/`flaggers` arrays
   * rather than browser-local storage, so it's consistent across every
   * device this account signs into. Not what drives the "✓ Works!"/flagged
   * display in the UI (that's shared state — `hasVotedUp`/`flagCount` on the
   * bathroom itself, true for every viewer once anyone has confirmed or
   * flagged it) — `flaggedIds` here only gates whether *this* account can
   * still tap Flag, since the rules allow one flag per account. */
  votedUpIds: ReadonlySet<string>;
  flaggedIds: ReadonlySet<string>;
}

const BathroomStoreContext = createContext<BathroomStoreValue | null>(null);

export function BathroomStoreProvider({ children }: { children: ReactNode }) {
  // Only ever mounted once a user is signed in (see App.tsx's AuthGate) —
  // every bathroom document now requires a real uid for ownership/voting/
  // flagging, so there's nothing useful this provider can do without one.
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [bathrooms, setBathrooms] = useState<Bathroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isFirebaseConfigured()) {
      setBathrooms(loadLocalFallback());
      setIsOffline(true);
      setOfflineReason(NO_FIREBASE_MESSAGE);
      setIsLoading(false);
      return;
    }

    // Firestore's listener doesn't always reject cleanly on a bad
    // connection — a flaky network can leave both callbacks below
    // permanently unfired (mirrors a write's Promise hanging instead of
    // rejecting under the same conditions), which would otherwise leave the
    // app on the loading spinner forever. This is a ceiling, not a
    // replacement: if the listener does resolve later, the callback below
    // still runs and switches back to live data normally.
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setBathrooms((prev) => (prev.length > 0 ? prev : loadLocalFallback()));
      setIsOffline(true);
      setOfflineReason("Timed out waiting for Cloud Firestore — showing cached data.");
      setIsLoading(false);
    }, 8000);

    const unsubscribe = subscribeToBathrooms(
      (list) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setBathrooms(list);
        setIsOffline(false);
        setOfflineReason(null);
        setIsLoading(false);
      },
      (err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setBathrooms(loadLocalFallback());
        setIsOffline(true);
        setOfflineReason(err.message);
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unsubscribe();
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

  // votedUpIds/flaggedIds are derived from the bathrooms themselves (each
  // document's own `voters`/`flaggers` array) rather than tracked
  // separately — this is what makes them consistent across every device
  // this account signs into, instead of being per-browser.
  const votedUpIds = useMemo(
    () => new Set(bathrooms.filter((b) => (b.voters ?? []).includes(uid)).map((b) => b.id)),
    [bathrooms, uid],
  );
  const flaggedIds = useMemo(
    () => new Set(bathrooms.filter((b) => (b.flaggers ?? []).includes(uid)).map((b) => b.id)),
    [bathrooms, uid],
  );

  const voteUp = useCallback(
    async (id: string) => {
      // "It Works" is a reconfirmation, not a one-time toggle — it should
      // always be clickable, even after this account has already voted, so
      // repeat visits keep lastConfirmedAt (and the trust score it feeds)
      // fresh. Nothing here ever blocks the click.
      //
      // Patched into local state *before* the network call, not after:
      // under a slow or flaky connection the write's Promise can take a
      // long time (or hang outright) to settle, and waiting for it left the
      // button looking like the click hadn't done anything in the meantime.
      // The next Firestore snapshot reconciles this with the real values.
      setBathrooms((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                hasVotedUp: true,
                upvoteCount: b.upvoteCount + 1,
                lastConfirmedAt: Date.now(),
                voters: [...new Set([...(b.voters ?? []), uid])],
              }
            : b,
        ),
      );

      if (isOffline) return;
      try {
        await voteUpBathroom(id, uid);
      } catch (err) {
        console.error("Failed to vote up bathroom", err);
      }
    },
    [isOffline, uid],
  );

  const flag = useCallback(
    async (id: string) => {
      if (flaggedIds.has(id)) return;

      // Same reasoning as voteUp: patch local state before awaiting the
      // network. A flag also resets this account's own "It Works"
      // confirmation for the same listing — flagging is a signal that a
      // prior "it works" tap may no longer hold, so the two shouldn't show
      // as both checked at once.
      setBathrooms((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                flagCount: b.flagCount + 1,
                hasVotedUp: false,
                flaggers: [...new Set([...(b.flaggers ?? []), uid])],
              }
            : b,
        ),
      );

      if (isOffline) return;
      try {
        await flagBathroom(id, uid);
      } catch (err) {
        console.error("Failed to flag bathroom", err);
      }
    },
    [isOffline, uid, flaggedIds],
  );

  const clearFlag = useCallback(
    async (id: string) => {
      setBathrooms((prev) =>
        prev.map((b) => (b.id === id ? { ...b, flagCount: 0, flaggers: [] } : b)),
      );
      if (isOffline) return;
      try {
        await clearFlagInFirestore(id);
      } catch (err) {
        console.error("Failed to clear flag", err);
      }
    },
    [isOffline],
  );

  const suggest = useCallback(
    async (id: string, text: string) => {
      setBathrooms((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                suggestions: [
                  ...b.suggestions,
                  { id: crypto.randomUUID(), text, submittedBy: uid, createdAt: Date.now() },
                ],
              }
            : b,
        ),
      );
      if (isOffline) return;
      try {
        await suggestBathroomUpdate(id, text, uid);
      } catch (err) {
        console.error("Failed to submit suggestion", err);
      }
    },
    [isOffline, uid],
  );

  const myCodes = useMemo(() => bathrooms.filter((b) => b.submittedBy === uid), [bathrooms, uid]);

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
      clearFlag,
      suggest,
      votedUpIds,
      flaggedIds,
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
      clearFlag,
      suggest,
      votedUpIds,
      flaggedIds,
    ],
  );

  return <BathroomStoreContext.Provider value={value}>{children}</BathroomStoreContext.Provider>;
}

export function useBathroomStore(): BathroomStoreValue {
  const ctx = useContext(BathroomStoreContext);
  if (!ctx) throw new Error("useBathroomStore must be used within BathroomStoreProvider");
  return ctx;
}
