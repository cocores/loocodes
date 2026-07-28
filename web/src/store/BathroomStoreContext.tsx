import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Bathroom } from "../types";
import { CURRENT_USER } from "../types";
import { SEED_BATHROOMS } from "./seed";

const STORAGE_KEY = "loocodes.bathrooms.v1";

function loadInitial(): Bathroom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Bathroom[];
  } catch {
    // ignore corrupt storage, fall back to seed data
  }
  return SEED_BATHROOMS;
}

interface BathroomStoreValue {
  bathrooms: Bathroom[];
  myCodes: Bathroom[];
  add: (bathroom: Bathroom) => void;
  voteUp: (id: string) => void;
  flag: (id: string) => void;
}

const BathroomStoreContext = createContext<BathroomStoreValue | null>(null);

export function BathroomStoreProvider({ children }: { children: ReactNode }) {
  const [bathrooms, setBathrooms] = useState<Bathroom[]>(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bathrooms));
  }, [bathrooms]);

  const add = useCallback((bathroom: Bathroom) => {
    setBathrooms((prev) => [bathroom, ...prev]);
  }, []);

  const voteUp = useCallback((id: string) => {
    setBathrooms((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, hasVotedUp: true, upvoteCount: b.upvoteCount + 1 } : b,
      ),
    );
  }, []);

  const flag = useCallback((id: string) => {
    setBathrooms((prev) => prev.map((b) => (b.id === id ? { ...b, hasFlagged: true } : b)));
  }, []);

  const myCodes = useMemo(
    () => bathrooms.filter((b) => b.submittedBy === CURRENT_USER),
    [bathrooms],
  );

  const value = useMemo(
    () => ({ bathrooms, myCodes, add, voteUp, flag }),
    [bathrooms, myCodes, add, voteUp, flag],
  );

  return <BathroomStoreContext.Provider value={value}>{children}</BathroomStoreContext.Provider>;
}

export function useBathroomStore(): BathroomStoreValue {
  const ctx = useContext(BathroomStoreContext);
  if (!ctx) throw new Error("useBathroomStore must be used within BathroomStoreProvider");
  return ctx;
}
