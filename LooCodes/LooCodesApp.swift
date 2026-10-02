import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct LooCodesApp: App {
    @State private var authService = AuthService()
    @State private var locationService = LocationService()

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            AuthGate()
                .environment(authService)
                .environment(locationService)
                .preferredColorScheme(.dark)
                .onAppear {
                    locationService.requestPermission()
                    locationService.startUpdating()
                    authService.start()
                }
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}

/// The app now requires a signed-in account — there's no more anonymous/
/// no-login mode. A signed-out visitor only ever sees LoginView; everything
/// else (including BathroomStore, which needs a real uid) only exists once
/// a user does.
private struct AuthGate: View {
    @Environment(AuthService.self) var authService

    var body: some View {
        if authService.isLoading {
            ZStack {
                Color(hex: "1a1a1f").ignoresSafeArea()
                ProgressView()
                    .tint(Color(hex: "5b9ef5"))
                    .scaleEffect(1.4)
            }
        } else if let user = authService.user {
            AuthenticatedRootView(uid: user.uid)
        } else {
            LoginView()
        }
    }
}

private struct AuthenticatedRootView: View {
    let uid: String
    @State private var store = BathroomStore()

    var body: some View {
        ContentView()
            .environment(store)
            .onAppear { store.start(uid: uid) }
    }
}
