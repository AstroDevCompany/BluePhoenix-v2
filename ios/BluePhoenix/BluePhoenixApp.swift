import SwiftUI

@main
struct BluePhoenixApp: App {
    @State private var store = AppStore()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .task { store.requestSync() }
                .onChange(of: phase) { _, new in
                    if new == .active { store.requestSync() }
                }
        }
    }
}
