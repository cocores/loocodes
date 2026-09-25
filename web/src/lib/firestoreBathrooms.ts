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
import { SEED_BATHROOMS, ZOHRAN_TOILETS } from "../store/seed";
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
  };
}

let seeded = false;

/** A fresh Firestore project has no data — seed it once so the app isn't
 * empty on first load, and separately backfill the curated NYC public
 * toilet listings into ANY deployment that's missing them (fresh or
 * already populated with real user data), keyed by their fixed ids so
 * it's idempotent. Both writes share one batch and one up-front read. */
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  const existingIds = new Set(snapshot.docs.map((d) => d.id));

  const batch = writeBatch(db);
  let hasWrites = false;

  if (snapshot.empty) {
    for (const bathroom of SEED_BATHROOMS) {
      batch.set(doc(db, COLLECTION, bathroom.id), bathroom);
      hasWrites = true;
    }
  }

  for (const toilet of ZOHRAN_TOILETS) {
    if (!existingIds.has(toilet.id)) {
      batch.set(doc(db, COLLECTION, toilet.id), toilet);
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

export async function subscribeToBathrooms(
  onData: (bathrooms: Bathroom[]) => void,
  onError: (err: Error) => void,
): Promise<Unsubscribe> {
  await ensureSeeded();
  const db = getDb();
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

export async function voteUpBathroom(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    upvoteCount: increment(1),
    hasVotedUp: true,
    lastConfirmedAt: Date.now(),
  });
}

export async function flagBathroom(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    flagCount: increment(1),
  });
}

export async function suggestBathroomUpdate(
  id: string,
  text: string,
  submittedBy: string,
): Promise<void> {
  const trimmed = sanitizeText(text, 500);
  if (!trimmed) throw new Error("Suggestion text is required");

  const suggestion: BathroomSuggestion = {
    id: crypto.randomUUID(),
    text: trimmed,
    submittedBy: sanitizeText(submittedBy, 100) || "anonymous",
    createdAt: Date.now(),
  };

  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    suggestions: arrayUnion(suggestion),
  });
}
