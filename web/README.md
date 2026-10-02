# LooCodes (web)

Browser version of the LooCodes app — React + TypeScript + Vite, mirroring
the SwiftUI app's screens and dark theme.

## Develop

```bash
npm install
npm run dev
```

The app now requires signing in (Apple or Google, via Firebase Auth) before
anything else loads — a Firebase project (see below) is required to run it
at all, there's no more local-only/no-Firebase mode. To develop against a
real backend without a live cloud project, run the Firestore **and** Auth
emulators from the repo root:

```bash
npx firebase-tools emulators:start --project demo-loocodes --only firestore,auth
```

and add both of these to `web/.env.local`:

```
VITE_FIRESTORE_EMULATOR_HOST=localhost:8080
VITE_AUTH_EMULATOR_HOST=localhost:9099
```

The Auth emulator simulates Google/Apple sign-in locally (a fake account
picker instead of a real OAuth consent screen) — good enough for exercising
the whole app without needing live provider credentials.

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
│   ├── firebase.ts          Firebase app + Firestore + Auth init (and emulator wiring)
│   ├── auth.ts              signInWithGoogle/Apple, user profile upsert, deleteAccount
│   ├── firestoreBathrooms.ts Firestore reads/writes + client-side validation
│   ├── trust.ts             computeTrustScore — confirmations/flags/decay
│   └── time.ts              formatRelativeTime ("Confirmed 2d ago", etc.)
├── store/
│   ├── AuthContext.tsx      Wraps Firebase Auth state + sign-in/out/delete
│   └── BathroomStoreContext.tsx  Subscribes to Firestore in real time, falls
│                            back to localStorage if it's unreachable
├── hooks/useLocation.ts    Browser Geolocation + distance formatting
├── views/                  LoginView, BathroomListView, BathroomDetailSheet,
│                           ShareView, ProfileView, SettingsViews
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
- **"Trusted Contributor"** badge on Profile is a rough, informal
  approximation (net confirmations across your own listings), not a
  verified reputation system — it isn't derived from anything the account
  itself controls, but it's still just a cosmetic badge.

## Public sharing (Firebase / Firestore)

Clicking **Share Code** writes directly to a Firestore collection from the
browser (`src/lib/firestoreBathrooms.ts`) using the Firebase client SDK —
there's no custom backend in between. `BathroomStoreContext` subscribes to
that collection in real time (`onSnapshot`), so every visitor sees new codes,
votes, flags, and suggestions the moment they happen, without refreshing.

**Firestore Security Rules (`firestore.rules`, repo root) are the real
enforcement layer**, not the client-side validation in
`firestoreBathrooms.ts` (which is just a first pass for well-behaved
clients) — the rules require a signed-in account for every read and write,
pin a listing's `submittedBy` to the caller's own uid, and allow only four
narrow update shapes (vote, flag, clear-flag, suggest), rejecting everything
else (including direct edits to a listing's name/code/address, and all
deletes).

If Firestore is unreachable *after* signing in (a flaky connection, not a
missing Firebase config — signing in itself requires a configured project),
the app falls back to a local-only mode for that session (an orange banner
says so, and changes only persist to that browser's `localStorage` until
connectivity returns).

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
   Firestore's default rules deny everything:
   ```bash
   npx firebase-tools deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes
   ```
   (`npx firebase-tools login` first if you haven't authenticated the CLI.)
6. **Enable sign-in providers** — Authentication → Sign-in method → enable
   **Google** (one click; `firebase.json`'s `auth.providers.googleSignIn`
   block lets `firebase deploy --only auth` configure this for you too) and
   **Apple**. Apple needs its own Apple Developer setup first — see
   [Authentication / Sign-in](../README.md#authentication--sign-in) in the
   repo root README for the full Services ID / key / Firebase console steps.
   Until Apple's enabled, Google sign-in alone is enough to use the app.

Redeploy the app once the env vars are set and providers are enabled — the
login screen should let you sign in and the app loads normally from there.

### Sign-in silently bounces back to /login (no error shown)

This happens when `VITE_FIREBASE_AUTH_DOMAIN` is set to the default
`YOUR_PROJECT_ID.firebaseapp.com` while the app itself is served from a
different domain (any Vercel domain, custom or not). Completing sign-in —
whether via popup or redirect — needs a round trip through that auth
domain, and since it's a different origin than the app, the browser treats
the cookies/storage involved as third-party and increasingly blocks them by
default (Safari especially, on both desktop and mobile, but not only
Safari). The sign-in call itself doesn't error — `getRedirectResult()`/the
popup's result just silently comes back empty, and the user lands back on
`/login` with no explanation.

The fix: make the auth domain match the app's own domain.
`vercel.json`'s rewrites already proxy `/__/auth/*` to Firebase's actual
handler at `loo-codes-bc914.firebaseapp.com` behind the scenes — the only
remaining step is pointing the SDK at your own domain instead:

1. In Vercel → Project Settings → Environment Variables, set
   `VITE_FIREBASE_AUTH_DOMAIN` to your app's actual production domain
   (e.g. `loocodes.vercel.app`, or your custom domain if you have one) —
   **not** `loo-codes-bc914.firebaseapp.com`.
2. Confirm that same domain is also in Firebase's Authentication →
   Settings → Authorized domains (it needs to be there either way, so if
   you've already hit the `auth/unauthorized-domain` error and fixed it,
   this part's likely already done).
3. Redeploy.

This only fully works for one stable domain baked in at build time — if
Vercel gives every preview deploy its own unique `*.vercel.app` URL, those
previews will still hit the cross-origin issue unless you test sign-in
against the production domain specifically.

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
