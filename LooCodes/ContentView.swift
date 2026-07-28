import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 1

    var body: some View {
        TabView(selection: $selectedTab) {
            ShareView(selectedTab: $selectedTab)
                .tabItem { Label("Share", systemImage: "plus.circle.fill") }
                .tag(0)

            BathroomListView()
                .tabItem { Label("Nearby", systemImage: "list.bullet") }
                .tag(1)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.fill") }
                .tag(2)
        }
        .tint(Color(hex: "5b9ef5"))
    }
}
