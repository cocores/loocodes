# LooCodes (web)

Browser version of the LooCodes app — React + TypeScript + Vite, mirroring
the SwiftUI app's screens and dark theme.

## Develop

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build
npm run preview
```

## Structure

```
src/
├── App.tsx               Bottom tab bar (Share / Nearby / Profile)
├── types/                 Bathroom, BathroomType
├── store/                 BathroomStoreContext (React context, localStorage-backed)
├── hooks/useLocation.ts    Browser Geolocation + distance formatting
├── views/                  BathroomListView, BathroomDetailSheet, ShareView,
│                           ProfileView, SettingsViews
└── components/             FilterChip, badges, StarRating, FormField, Switch,
                            PinMap (Leaflet map for the Share flow's pin-drop mode)
```

Data is seeded with sample bathrooms and persisted to `localStorage` — there's
no backend yet.
