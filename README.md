# LooCodes

A SwiftUI app for finding and sharing bathroom access codes.

## Structure

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

## Notes

- `BathroomStore` and `LocationService` are in-memory/stub implementations
  (no networking or persistence yet) so the views have something concrete
  to bind against.
- This repo currently contains source files only. To run the app, create
  an Xcode project (iOS App, SwiftUI lifecycle) and add the `LooCodes/`
  folder as its source, or generate one with a tool like XcodeGen.
