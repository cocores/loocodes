# LooCodes (web)

Browser version of the LooCodes app — React + TypeScript + Vite, mirroring
the SwiftUI app's screens and dark theme.

## Develop

```bash
npm install
npm run dev
```

Without a configured Firebase project (see below), the app falls back to
local (per-browser, `localStorage`-backed) mode automatically — everything
still works, it just isn't shared. To exercise real Firestore locally without
a live project at all, run the Firestore emulator from the repo root:

```bash
npx firebase-tools emulators:start --project demo-loocodes --only firestore
```

and add `VITE_FIRESTORE_EMULATOR_HOST=localhost:8080` to `web/.env.local`.

## Build / preview

```bash
npm run build
npm run preview
```

## Structure

```
src/
├── App.tsx               Bottom tab bar (Share / Nearby / Profile), offline banner
├── types/                 Bathroom, BathroomType
├── lib/
│   ├── firebase.ts          Firebase app + Firestore init (and emulator wiring)
│   ├── firestoreBathrooms.ts Firestore reads/writes + client-side validation
│   ├── anonymousUser.ts     Persistent per-browser id (used for "My Codes")
│   ├── flaggedTracker.ts    Which listings this browser has already flagged
│   ├── trust.ts             computeTrustScore — confirmations/flags/decay
│   └── time.ts              formatRelativeTime ("Confirmed 2d ago", etc.)
├── store/                 BathroomStoreContext — subscribes to Firestore in
│                          real time, falls back to localStorage if it's
│                          unreachable or unconfigured
├── hooks/useLocation.ts    Browser Geolocation + distance formatting
├── views/                  BathroomListView, BathroomDetailSheet, ShareView,
│                           ProfileView, SettingsViews
└── components/             FilterChip, badges, StarRating (display), StarPicker
                            (submission input), FormField, Switch,
                            BathroomsMap (Nearby tab's Map view, Leaflet),
                            PinMap (Leaflet view for pin-drop mode),
                            AddressAutocomplete (OSM Nominatim predictions)
```

## Trust, confirmations & suggestions

- **Cleanliness rating** is set once at submission (`StarPicker` in Share) and
  stored as the listing's `rating` — there's no separate per-visit rating.
- **"It Works"** both increments `upvoteCount` and refreshes
  `lastConfirmedAt` — that's the "confirmation" the trust score and "Confirmed
  X ago" text are based on.
- **Trust score** (`lib/trust.ts`) isn't stored — it's computed on the fly
  from confirmations, flags (weighted more heavily), and how long it's been
  since the last confirmation (halves every ~90 days). It's used to sort
  listings within each distance section (Close By / Further Away / Far Away),
  not to gate visibility — new listings start neutral and rise as people
  confirm them.
- **Flagging** is a count (`flagCount`), not a takedown: a listing shows a
  "Reported Stale" badge once it crosses `FLAG_THRESHOLD` (3) but stays fully
  visible and votable.
- **Suggested updates**: anyone can propose a correction from the detail
  sheet ("+ Suggest an update"). It's appended to `suggestions` and shown
  underneath the original listing — it never silently overwrites the
  submitter's original fields, since there's no ownership/accounts system to
  arbitrate conflicting edits safely.
- **"Trusted Contributor"** badge on Profile is a rough, non-durable
  approximation (net confirmations across your own listings) — since
  identity here is just a resettable per-browser id (see Delete Account),
  it can't be a real persistent reputation system.

## Public sharing (Firebase / Firestore)

Clicking **Share Code** writes directly to a Firestore collection from the
browser (`src/lib/firestoreBathrooms.ts`) using the Firebase client SDK —
there's no custom backend in between. `BathroomStoreContext` subscribes to
that collection in real time (`onSnapshot`), so every visitor sees new codes,
votes, flags, and suggestions the moment they happen, without refreshing.

Since there's no accounts system, **Firestore Security Rules
(`firestore.rules`, repo root) are the only real enforcement layer** — they
allow public read, validated create, and only three narrow update shapes
(vote, flag, suggest), rejecting everything else (including direct edits to
a listing's name/code/address, and all deletes). The client-side validation
in `firestoreBathrooms.ts` is a first pass for well-behaved clients, not a
security boundary — treat the rules as the source of truth.

If no Firebase project is configured, the app automatically falls back to a
local-only mode (an orange banner says so, and shares only persist to that
browser's `localStorage`).

### One-time setup

1. **Create a project** at [console.firebase.google.com](https://console.firebase.google.com/).
2. **Build → Firestore Database → Create database** (any region; start in
   production mode, since `firestore.rules` supplies real rules regardless).
3. **Project settings → General → Your apps → Add app → Web**. Copy the
   config values it gives you.
4. **Add them as env vars**, one each:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
   - Locally: copy `.env.example` to `.env.local` and fill them in.
   - On Vercel: Project Settings → Environment Variables → add all six for
     Production (and Preview/Development if you want it there too) →
     redeploy. These are meant to be public (they ship in the built JS
     bundle) — Firestore Security Rules are what actually protects the data,
     not secrecy of these values.
5. **Deploy the security rules** — this step is required; without it,
   Firestore's default rules deny everything and the app falls back to
   offline mode even with a valid config:
   ```bash
   npx firebase-tools deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes
   ```
   (`npx firebase-tools login` first if you haven't authenticated the CLI.)

Redeploy the app once the env vars are set — the offline banner should
disappear and shared codes become visible to every visitor.

## Maps (Leaflet + OpenStreetMap)

Maps and address search use free, no-API-key services — nothing to
configure, no billing account required:

- The Nearby tab's **Map view** (`src/components/BathroomsMap.tsx`) — a
  List/Map toggle next to the results count plots every filtered listing as a
  pin (emoji per type), fits the view to them, and tapping one opens the same
  detail sheet as the list. Built with [Leaflet](https://leafletjs.com/)
  rendering [OpenStreetMap](https://www.openstreetmap.org/) tiles.
- The Share flow's **Drop Pin** map (`src/components/PinMap.tsx`) — same
  Leaflet/OSM setup.
- **Address** mode's predictive autocomplete-as-you-type
  (`src/components/AddressAutocomplete.tsx`) queries OpenStreetMap's
  [Nominatim](https://nominatim.org/) search API and resolves the selected
  suggestion to real coordinates.

These all work out of the box in every environment (dev, preview, prod) with
no env vars. GPS mode and List view are unaffected either way.

**Usage policy note:** the public `tile.openstreetmap.org` and
`nominatim.openstreetmap.org` endpoints are free community services with
[usage policies](https://operations.osmfoundation.org/policies/) — notably
Nominatim's 1 request/second cap (the autocomplete input is debounced to stay
under this). They're fine for a hobby project's traffic; a production app
with meaningful volume should switch to a paid tile/geocoding provider (e.g.
MapTiler, Mapbox, LocationIQ) or self-host Nominatim, and swap the URLs in
`BathroomsMap.tsx`, `PinMap.tsx`, and `AddressAutocomplete.tsx`.
