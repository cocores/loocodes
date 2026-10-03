import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import {
  ATHENS_TOILETS,
  BARCELONA_TOILETS,
  BERLIN_TOILETS,
  DENVER_TOILETS,
  KANSAS_CITY_KS_TOILETS,
  KANSAS_CITY_MO_TOILETS,
  LISBON_TOILETS,
  LONDON_TOILETS,
  LOS_ANGELES_TOILETS,
  MIAMI_TOILETS,
  NYC_PARKS_TOILETS,
  PARIS_TOILETS,
  ROME_TOILETS,
  SAN_FRANCISCO_TOILETS,
  SEED_BATHROOMS,
  ST_LOUIS_TOILETS,
  WASHINGTON_DC_TOILETS,
  ZOHRAN_TOILETS,
} from "../store/seed";
import { BATHROOM_TYPES, type Bathroom, type BathroomSuggestion, type NewBathroom } from "../types";

const COLLECTION = "bathrooms";

function sanitizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").slice(0, maxLength).trim();
}

// Mirrors the validation the old serverless API enforced — now the first
// line of defense client-side, backed up by firestore.rules since anyone
// can otherwise call the Firestore API directly from the browser console.
function buildBathroomDoc(input: NewBathroom, id: string): Bathroom {
  if (!BATHROOM_TYPES.some((t) => t.id === input.type)) {
    throw new Error(`Invalid bathroom type: ${input.type}`);
  }
  const name = sanitizeText(input.name, 200);
  if (!name) throw new Error("Name is required");

  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Valid latitude/longitude are required");
  }

  const rating = Number(input.rating);
  const clampedRating = Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 3;

  return {
    id,
    name,
    address: sanitizeText(input.address, 300) || "Shared location",
    code: sanitizeText(input.code, 50),
    type: input.type,
    isADAAccessible: Boolean(input.isADAAccessible),
    isFree: Boolean(input.isFree),
    feeAmount: sanitizeText(input.feeAmount, 30),
    note: sanitizeText(input.note, 500),
    latitude,
    longitude,
    submittedBy: sanitizeText(input.submittedBy, 100) || "anonymous",
    isVerified: false,
    // Only the curated ZOHRAN_TOILETS listings (seeded by
    // ensureZohranToiletsSeeded below) ever get this — never settable
    // from the Share form.
    isZohranToilet: false,
    upvoteCount: 0,
    rating: clampedRating,
    hasVotedUp: false,
    flagCount: 0,
    lastConfirmedAt: Date.now(),
    suggestions: [],
    voters: [],
    flaggers: [],
  };
}

let seeded = false;

/** A fresh Firestore project has no data — seed it once so the app isn't
 * empty on first load, and separately backfill the curated public toilet
 * listings (NYC's free ones, London's paid ones, LA's library/Metro ones,
 * SF's Pit Stop program, Paris's sanisettes, Berlin's Wall-operated
 * toilets, Rome's P.Stop kiosks, Denver's/Miami's/Kansas City's park
 * restrooms, DC's rec centers and NPS Mall restrooms, St. Louis's Forest
 * Park and rec centers, Barcelona's self-cleaning WC cabins and Park Güell
 * restrooms, Lisbon's historic WC kiosks and central gardens, Athens's
 * National Garden/metro/Acropolis restrooms) into ANY deployment that's
 * missing them (fresh or already populated with real user data), keyed by
 * their fixed ids so it's idempotent. All writes share one batch and one
 * up-front read. */
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  const existingIds = new Set(snapshot.docs.map((d) => d.id));

  const batch = writeBatch(db);
  let hasWrites = false;

  // The curated seed data in store/seed.ts predates `voters`/`flaggers` (and
  // is typed Bathroom[] with those fields optional for exactly this reason)
  // — firestore.rules requires both present as empty lists on create, so
  // fill them in here rather than editing several thousand lines of seed data.
  const withVoteFields = (b: Bathroom): Bathroom => ({
    ...b,
    voters: b.voters ?? [],
    flaggers: b.flaggers ?? [],
  });

  if (snapshot.empty) {
    for (const bathroom of SEED_BATHROOMS) {
      batch.set(doc(db, COLLECTION, bathroom.id), withVoteFields(bathroom));
      hasWrites = true;
    }
  }

  for (const toilet of [
    ...ZOHRAN_TOILETS,
    ...NYC_PARKS_TOILETS,
    ...LONDON_TOILETS,
    ...LOS_ANGELES_TOILETS,
    ...SAN_FRANCISCO_TOILETS,
    ...PARIS_TOILETS,
    ...BERLIN_TOILETS,
    ...ROME_TOILETS,
    ...DENVER_TOILETS,
    ...MIAMI_TOILETS,
    ...KANSAS_CITY_KS_TOILETS,
    ...KANSAS_CITY_MO_TOILETS,
    ...WASHINGTON_DC_TOILETS,
    ...ST_LOUIS_TOILETS,
    ...BARCELONA_TOILETS,
    ...LISBON_TOILETS,
    ...ATHENS_TOILETS,
  ]) {
    if (!existingIds.has(toilet.id)) {
      batch.set(doc(db, COLLECTION, toilet.id), withVoteFields(toilet));
      hasWrites = true;
    }
  }

  if (hasWrites) {
    try {
      await batch.commit();
    } catch (err) {
      // A concurrent client (or, in dev, React StrictMode's double effect
      // invocation) can win this same race first — once these fixed-id
      // docs exist, our redundant set() is evaluated as an "update" by the
      // rules, which reject it (only vote/flag/suggestion updates are
      // allowed). The data's already seeded either way, so this is fine.
      console.warn("Seed race lost to a concurrent writer (expected, harmless):", err);
    }
  }
  seeded = true;
}

export function subscribeToBathrooms(
  onData: (bathrooms: Bathroom[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  // Fire-and-forget: seeding runs in the background and its writes surface
  // through this same listener once they land. It must never block the
  // listener itself from attaching — if this one-time check is slow or
  // hangs (flaky network, etc.), the app should still show whatever data
  // is already there instead of being stuck on a loading spinner forever.
  ensureSeeded().catch((err) => console.warn("ensureSeeded failed (non-fatal):", err));
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => onData(snapshot.docs.map((d) => d.data() as Bathroom)),
    (err) => onError(err),
  );
}

export async function createBathroom(input: NewBathroom): Promise<Bathroom> {
  const db = getDb();
  const ref = doc(collection(db, COLLECTION));
  const bathroom = buildBathroomDoc(input, ref.id);
  await setDoc(ref, bathroom);
  return bathroom;
}

export async function voteUpBathroom(id: string, uid: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    upvoteCount: increment(1),
    hasVotedUp: true,
    lastConfirmedAt: Date.now(),
    // Repeat votes from the same uid are a no-op for this list (arrayUnion
    // dedupes) — it's only ever used to show "✓ Works!" across this
    // account's devices, never to block the increment above.
    voters: arrayUnion(uid),
  });
}

export async function flagBathroom(id: string, uid: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    flagCount: increment(1),
    // A flag is a signal that a prior "It Works" confirmation may no longer
    // hold, so it resets the shared confirmed-state back to unconfirmed —
    // matched by resetting this device's own local vote history alongside
    // the flag() call in BathroomStoreContext.
    hasVotedUp: false,
    flaggers: arrayUnion(uid),
  });
}

/** Resets a listing's flag count once a reviewer has looked into the report
 * (see views/AdminFlaggedView.tsx). There's no real auth/admin role in this
 * app, so this is a soft, honor-system gate — the security rules only
 * guarantee it's narrowly a flagCount reset to zero (and flaggers cleared
 * alongside it, so the same accounts can flag again if the issue recurs). */
export async function clearFlag(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    flagCount: 0,
    flaggers: [],
  });
}

export async function suggestBathroomUpdate(id: string, text: string, uid: string): Promise<void> {
  const trimmed = sanitizeText(text, 500);
  if (!trimmed) throw new Error("Suggestion text is required");

  const suggestion: BathroomSuggestion = {
    id: crypto.randomUUID(),
    text: trimmed,
    submittedBy: uid,
    createdAt: Date.now(),
  };

  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    suggestions: arrayUnion(suggestion),
  });
}
