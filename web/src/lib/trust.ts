import type { Bathroom } from "../types";

const CONFIRM_WEIGHT = 1;
const FLAG_WEIGHT = 3;
const DECAY_HALF_LIFE_DAYS = 90;

type TrustInputs = Pick<Bathroom, "upvoteCount" | "flagCount" | "lastConfirmedAt">;

/** Higher = fresher and more community-confirmed. Confirmations raise it,
 * flags cut it down harder, and it decays (halves every ~90 days) the longer
 * a listing goes without a fresh confirmation — so stale-but-once-popular
 * entries don't outrank recently-confirmed ones forever. */
export function computeTrustScore(bathroom: TrustInputs, now: number = Date.now()): number {
  const base = bathroom.upvoteCount * CONFIRM_WEIGHT - bathroom.flagCount * FLAG_WEIGHT;
  const daysSinceConfirmed = Math.max(0, (now - bathroom.lastConfirmedAt) / (1000 * 60 * 60 * 24));
  const decay = Math.pow(0.5, daysSinceConfirmed / DECAY_HALF_LIFE_DAYS);
  return base * decay;
}
