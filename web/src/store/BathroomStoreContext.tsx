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
import { api } from "../lib/api";
import { getUserId, resetUserId } from "../lib/anonymousUser";
import { clearFlaggedLocally, hasFlaggedLocally, markFlaggedLocally } from "../lib/flaggedTracker";
import { SEED_BATHROOMS } from "./seed";

const LOCAL_CACHE_KEY = "loocodes.bathrooms.local-fallback.v1";

function loadLocalFallback(): Bathroom[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) return JSON.parse(raw) as Bathroom[];
  } catch {
    // ignore corrupt cache
  }
  return SEED_BATHROOMS;
}

interface BathroomStoreValue {
  bathrooms: Bathroom[];
  myCodes: Bathroom[];
  isLoading: boolean;
  /** True when the shared API is unreachable (e.g. no KV store connected yet) — sharing is local-only until this clears. */
  isOffline: boolean;
  offlineReason: string | null;
  add: (bathroom: NewBathroom) => Promise<void>;
  voteUp: (id: string) => Promise<void>;
  flag: (id: string) => Promise<void>;
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
    api
      .list()
      .then((list) => {
        if (cancelled) return;
        setBathrooms(list);
        setIsOffline(false);
        setOfflineReason(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setBathrooms(loadLocalFallback());
        setIsOffline(true);
        setOfflineReason(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
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
          upvoteCount: 0,
          rating: 0,
          hasVotedUp: false,
          flagCount: 0,
        };
        setBathrooms((prev) => [local, ...prev]);
        return;
      }
      const created = await api.create(bathroom);
      setBathrooms((prev) => [created, ...prev]);
    },
    [isOffline],
  );

  const voteUp = useCallback(
    async (id: string) => {
      if (isOffline) {
        setBathrooms((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, hasVotedUp: true, upvoteCount: b.upvoteCount + 1 } : b,
          ),
        );
        return;
      }
      try {
        const updated = await api.voteUp(id);
        setBathrooms((prev) => prev.map((b) => (b.id === id ? updated : b)));
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
        const updated = await api.flag(id);
        setBathrooms((prev) => prev.map((b) => (b.id === id ? updated : b)));
        markFlaggedLocally(id);
      } catch (err) {
        console.error("Failed to flag bathroom", err);
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
      resetAccount,
    }),
    [bathrooms, myCodes, isLoading, isOffline, offlineReason, add, voteUp, flag, resetAccount],
  );

  return <BathroomStoreContext.Provider value={value}>{children}</BathroomStoreContext.Provider>;
}

export function useBathroomStore(): BathroomStoreValue {
  const ctx = useContext(BathroomStoreContext);
  if (!ctx) throw new Error("useBathroomStore must be used within BathroomStoreProvider");
  return ctx;
}
