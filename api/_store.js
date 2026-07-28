const { kvCommand } = require("./_kv");

const KEY = "loocodes:bathrooms";

const BATHROOM_TYPES = ["cafe", "restaurant", "publicRestroom", "gasStation", "store", "park"];

// Mirrors web/src/store/seed.ts so a fresh KV store isn't empty on first load.
const SEED = [
  {
    id: "seed-1",
    name: "Blue Bottle Coffee",
    address: "1 Rockefeller Plaza, New York, NY",
    code: "4821",
    type: "cafe",
    isADAAccessible: true,
    isFree: false,
    feeAmount: "",
    note: "Ask the barista, it's behind the counter door.",
    latitude: 40.7587,
    longitude: -73.9787,
    submittedBy: "jen_nyc",
    isVerified: true,
    upvoteCount: 42,
    rating: 4.5,
    hasVotedUp: false,
    hasFlagged: false,
  },
  {
    id: "seed-2",
    name: "Bryant Park Public Restroom",
    address: "Bryant Park, New York, NY",
    code: "",
    type: "publicRestroom",
    isADAAccessible: true,
    isFree: true,
    feeAmount: "",
    note: "Open until 10pm, attendant on site.",
    latitude: 40.7536,
    longitude: -73.9832,
    submittedBy: "parks_dept",
    isVerified: true,
    upvoteCount: 128,
    rating: 4.8,
    hasVotedUp: false,
    hasFlagged: false,
  },
  {
    id: "seed-3",
    name: "Shell Gas Station",
    address: "350 W 42nd St, New York, NY",
    code: "9910",
    type: "gasStation",
    isADAAccessible: false,
    isFree: false,
    feeAmount: "$1.00",
    note: "",
    latitude: 40.7577,
    longitude: -73.9925,
    submittedBy: "demo_user",
    isVerified: false,
    upvoteCount: 6,
    rating: 3.2,
    hasVotedUp: false,
    hasFlagged: false,
  },
  {
    id: "seed-4",
    name: "Whole Foods Market",
    address: "10 Columbus Cir, New York, NY",
    code: "2468",
    type: "store",
    isADAAccessible: true,
    isFree: true,
    feeAmount: "",
    note: "Second floor, near the cafe seating.",
    latitude: 40.7685,
    longitude: -73.9822,
    submittedBy: "demo_user",
    isVerified: true,
    upvoteCount: 19,
    rating: 4.1,
    hasVotedUp: false,
    hasFlagged: false,
  },
];

async function getAll() {
  const raw = await kvCommand(["GET", KEY]);
  if (!raw) {
    await kvCommand(["SET", KEY, JSON.stringify(SEED)]);
    return SEED;
  }
  return JSON.parse(raw);
}

async function saveAll(bathrooms) {
  await kvCommand(["SET", KEY, JSON.stringify(bathrooms)]);
}

function sanitizeText(value, maxLength) {
  return String(value ?? "").slice(0, maxLength).trim();
}

function createBathroom(input) {
  if (!BATHROOM_TYPES.includes(input.type)) {
    throw new Error(`Invalid bathroom type: ${input.type}`);
  }
  const name = sanitizeText(input.name, 200);
  if (!name) throw new Error("Name is required");

  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Valid latitude/longitude are required");
  }

  return {
    id: crypto.randomUUID(),
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
    upvoteCount: 0,
    rating: 0,
    hasVotedUp: false,
    hasFlagged: false,
  };
}

module.exports = { getAll, saveAll, createBathroom };
