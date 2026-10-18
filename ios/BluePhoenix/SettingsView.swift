import SwiftUI

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var url = ""
    @State private var busy = false
    @State private var message: String?
    @State private var isError = false
    @State private var confirmErase = false

    var body: some View {
        NavigationStack {
            Form {
                SwiftUI.Section {
                    if store.connected { connected } else { connect }
                } header: {
                    Text("Cloud sync")
                } footer: {
                    Text("Use the same database address you entered in BluePhoenix on your computer (Settings → Cloud sync). Neon is the default; any PostgreSQL database works. The address is stored in the iOS keychain.")
                }
                if let message {
                    SwiftUI.Section { Text(message).font(.footnote).foregroundStyle(isError ? .red : .green).textSelection(.enabled) }
                }
                SwiftUI.Section("About") {
                    LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                    if store.connected {
                        Button("Erase data on this iPhone", role: .destructive) { confirmErase = true }
                    }
                }
            }
            .brandList()
            .navigationTitle("Settings")
            .confirmationDialog("Erase all synced data stored on this iPhone? Your database is not touched.", isPresented: $confirmErase, titleVisibility: .visible) {
                Button("Erase", role: .destructive) { store.eraseLocalData(); message = nil }
            }
        }
    }

    @ViewBuilder private var connect: some View {
        SecureField("postgresql://user:password@host/db", text: $url)
            .textInputAutocapitalization(.never).autocorrectionDisabled().font(.footnote.monospaced())
        Button {
            Task { await run { _ = try await RemoteDB(info: try ConnectionInfo.parse(url)).test(); return "Connection works." } }
        } label: { Label("Test connection", systemImage: "bolt.horizontal") }
            .disabled(url.trimmingCharacters(in: .whitespaces).isEmpty || busy)
        Button {
            Task { await run { try await store.connect(url: url); url = ""; return "Connected. Your projects will appear in a moment." } }
        } label: { Label("Connect & sync", systemImage: "icloud.and.arrow.down") }
            .disabled(url.trimmingCharacters(in: .whitespaces).isEmpty || busy)
        if busy { ProgressView() }
    }

    @ViewBuilder private var connected: some View {
        LabeledContent("Status") {
            if store.syncing { ProgressView() }
            else if store.lastError != nil { Text("Failed").foregroundStyle(.orange) }
            else { Text("Connected").foregroundStyle(.green) }
        }
        if let host = Keychain.get().flatMap({ try? ConnectionInfo.parse($0).host }) { LabeledContent("Database", value: host) }
        if let t = store.cache.lastSync {
            LabeledContent("Last synced") { Text(Date(timeIntervalSince1970: Double(t) / 1000), style: .relative) }
        }
        if let e = store.lastError { Text(e).font(.footnote).foregroundStyle(.orange).textSelection(.enabled) }
        Button { Task { await store.sync() } } label: { Label("Sync now", systemImage: "arrow.triangle.2.circlepath") }.disabled(store.syncing)
        Button("Disconnect", role: .destructive) { store.disconnect(); message = nil }
    }

    private func run(_ work: () async throws -> String) async {
        busy = true; message = nil
        defer { busy = false }
        do { message = try await work(); isError = false }
        catch { message = RemoteDB.describe(error); isError = true }
    }
}
