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
                            PinMap (Leaflet map for the Share flow's pin-drop mode)
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
