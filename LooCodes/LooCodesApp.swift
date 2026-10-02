import FirebaseCore
import SwiftUI

@main
struct LooCodesApp: App {
    @State private var store = BathroomStore()
    @State private var locationService = LocationService()

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
                .environment(locationService)
                .preferredColorScheme(.dark)
                .onAppear {
                    locationService.requestPermission()
                    locationService.startUpdating()
                    store.start()
                }
        }
    }
}
