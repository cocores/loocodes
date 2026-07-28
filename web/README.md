# LooCodes (web)

Browser version of the LooCodes app — React + TypeScript + Vite, mirroring
the SwiftUI app's screens and dark theme.

## Develop

```bash
npm install
npm run dev
```

`npm run dev` runs the Vite dev server only, which has no `/api` routes — the
app will fall back to local (per-browser) mode automatically. To exercise the
real API + KV locally, use `vercel dev` from the repo root instead (see below).

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
│   ├── api.ts             Client for the /api/bathrooms endpoints
│   └── anonymousUser.ts   Persistent per-browser id (used for "My Codes")
├── store/                 BathroomStoreContext — fetches/writes through the API,
│                          falls back to localStorage if the API is unreachable
├── hooks/useLocation.ts    Browser Geolocation + distance formatting
├── views/                  BathroomListView, BathroomDetailSheet, ShareView,
│                           ProfileView, SettingsViews
└── components/             FilterChip, badges, StarRating, FormField, Switch,
                            PinMap (Google Maps view for pin-drop mode),
                            AddressAutocomplete (Google Places predictions)
```

## Public sharing (Vercel KV)

Clicking **Share Code** publishes to `/api/bathrooms` (see `../api/` at the
repo root), which reads/writes a single shared list in a KV store — that's
what makes a published code visible to every visitor, not just the browser
that shared it.

If no KV store is connected, the API returns 503 and the app automatically
falls back to a local-only mode (an orange banner says so, and shares only
persist to that browser's `localStorage`).

To turn on public sharing on Vercel:

1. Project dashboard → **Storage** tab → **Create Database** → pick a
   Redis/KV option (e.g. "Upstash for Redis").
2. **Connect** it to this project. Vercel injects `KV_REST_API_URL` /
   `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   — the API checks both) as environment variables automatically.
3. Redeploy. The offline banner should disappear and shared codes will be
   visible to every visitor.

No code changes or manual env var entry needed — the API (`api/_kv.js`) picks
up whichever pair of env vars Vercel provides.

## Google Maps setup

Two features use the Google Maps JavaScript API and share the same key:

- The Share flow's **Drop Pin** map (`src/components/PinMap.tsx`).
- **Address** mode's predictive autocomplete-as-you-type
  (`src/components/AddressAutocomplete.tsx`), which also resolves the
  selected suggestion to real coordinates (previously a placeholder).

Without a key configured, both degrade gracefully — Drop Pin shows a "no key
configured" message, Address mode falls back to a plain text field with a
small "predictions unavailable" hint — rather than crashing. GPS mode is
unaffected either way.

1. **Create/select a project** at
   [console.cloud.google.com](https://console.cloud.google.com/).
2. **Enable billing** on the project. This is required by Google even for
   free-tier usage — Maps Platform includes a recurring $200/month credit
   that covers typical small-app usage, so a hobby project like this
   shouldn't actually be charged.
3. **APIs & Services → Library** → enable both:
   - **Maps JavaScript API** (Drop Pin map)
   - **Places API (New)** (address autocomplete + geocoding)
4. **APIs & Services → Credentials → Create Credentials → API key.**
5. **Restrict the key** (click into it after creating):
   - *Application restrictions* → **Websites** → add your Vercel domain(s),
     e.g. `https://your-app.vercel.app/*`, plus `http://localhost:5173/*` if
     you want it working under `npm run dev` too.
   - *API restrictions* → restrict to **Maps JavaScript API** and
     **Places API (New)**.

   This key is meant to be public (it ships in the built JS bundle) — the
   website restriction is what keeps other sites from using your quota, not
   secrecy.
6. **Add it as an env var** named `VITE_GOOGLE_MAPS_API_KEY`:
   - Locally: copy `.env.example` to `.env.local` and paste the key in.
   - On Vercel: Project Settings → Environment Variables → add
     `VITE_GOOGLE_MAPS_API_KEY` for Production (and Preview/Development if
     you want it there too) → redeploy.

Address autocomplete uses the newer session-token-based Places API
(`AutocompleteSuggestion.fetchAutocompleteSuggestions`), not the legacy
`google.maps.places.Autocomplete` widget — predictions are billed per
session (typing + selecting counts once), not per keystroke.
