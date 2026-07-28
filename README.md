# LooCodes

An app for finding and sharing bathroom access codes: a SwiftUI iOS app
(`LooCodes/`) and a browser version (`web/`), sharing the same screens,
data model, and dark theme.

## iOS (SwiftUI)

### Structure

```
LooCodes/
├── LooCodesApp.swift        App entry point
├── ContentView.swift        Root TabView (Share / Nearby / Profile)
├── Models/
│   ├── Bathroom.swift
│   └── BathroomType.swift
├── Services/
│   ├── BathroomStore.swift  @Observable in-memory store
│   └── LocationService.swift
├── Views/
│   ├── BathroomListView.swift
│   ├── BathroomDetailSheet.swift
│   ├── ShareView.swift
│   ├── ProfileView.swift
│   └── SettingsViews.swift  Notifications / Privacy / About
├── Components/              Shared badges, chips, layout, form styling
└── Extensions/
    └── Color+Hex.swift
```

### Notes

- `BathroomStore` and `LocationService` are in-memory/stub implementations
  (no networking or persistence yet) so the views have something concrete
  to bind against.
- This repo currently contains source files only. To run the app, create
  an Xcode project (iOS App, SwiftUI lifecycle) and add the `LooCodes/`
  folder as its source, or generate one with a tool like XcodeGen.

## Web (React + Vite)

See [`web/README.md`](web/README.md). Quick start:

```bash
cd web
npm install
npm run dev
```

## API (`api/`)

Vercel serverless functions backing the web app's public sharing feature —
a shared, KV-backed list of bathrooms so a published code is visible to
every visitor, not just the browser that shared it. See
[`web/README.md`](web/README.md#public-sharing-vercel-kv) for the one-time
Vercel KV setup.

```
api/
├── _kv.js               Upstash/Vercel KV REST client (plain fetch, no deps)
├── _store.js             Seed data + get/save/create-bathroom helpers
├── bathrooms.js           GET (list) / POST (publish)
└── bathrooms/[id]/
    ├── vote.js             POST (upvote)
    └── flag.js             POST (flag as stale)
```
