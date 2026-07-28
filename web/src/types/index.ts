export type BathroomTypeId =
  | "cafe"
  | "restaurant"
  | "publicRestroom"
  | "gasStation"
  | "store"
  | "park";

export interface BathroomTypeInfo {
  id: BathroomTypeId;
  label: string;
  emoji: string;
}

export const BATHROOM_TYPES: BathroomTypeInfo[] = [
  { id: "cafe", label: "Cafe", emoji: "☕️" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "publicRestroom", label: "Public", emoji: "🚻" },
  { id: "gasStation", label: "Gas Station", emoji: "⛽️" },
  { id: "store", label: "Store", emoji: "🏬" },
  { id: "park", label: "Park", emoji: "🌳" },
];

export function bathroomType(id: BathroomTypeId): BathroomTypeInfo {
  return BATHROOM_TYPES.find((t) => t.id === id) ?? BATHROOM_TYPES[0];
}

export interface Bathroom {
  id: string;
  name: string;
  address: string;
  code: string;
  type: BathroomTypeId;
  isADAAccessible: boolean;
  isFree: boolean;
  feeAmount: string;
  note: string;
  latitude: number;
  longitude: number;
  submittedBy: string;
  isVerified: boolean;
  upvoteCount: number;
  rating: number;
  hasVotedUp: boolean;
  hasFlagged: boolean;
}

// What the client sends when publishing — the server assigns id and the
// remaining aggregate/moderation fields.
export type NewBathroom = Pick<
  Bathroom,
  | "name"
  | "address"
  | "code"
  | "type"
  | "isADAAccessible"
  | "isFree"
  | "feeAmount"
  | "note"
  | "latitude"
  | "longitude"
  | "submittedBy"
>;
