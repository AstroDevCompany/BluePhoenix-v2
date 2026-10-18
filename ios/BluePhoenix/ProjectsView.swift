import SwiftUI

struct ProjectsView: View {
    @Environment(AppStore.self) private var store
    @State private var adding = false
    @State private var newName = ""

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.projects) { p in
                    NavigationLink(value: p.id) { ProjectRow(project: p) }
                        .glassRow()
                        .swipeActions(edge: .leading) {
                            Button { var q = p; q.favorite.toggle(); store.save(q) } label: {
                                Label(p.favorite ? "Unstar" : "Star", systemImage: p.favorite ? "star.slash" : "star")
                            }.tint(.yellow)
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { store.delete(p) } label: { Label("Delete", systemImage: "trash") }
                        }
                }
            }
            .brandList()
            .overlay { if store.projects.isEmpty { EmptyProjects() } }
            .navigationTitle("Projects")
            .navigationDestination(for: String.self) { id in ProjectDetailView(projectId: id) }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if store.syncing { ProgressView() }
                    else if store.lastError != nil { Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange) }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { newName = ""; adding = true } label: { Image(systemName: "plus") }
                }
            }
            .refreshable { await store.sync() }
            .alert("New project", isPresented: $adding) {
                TextField("Name", text: $newName)
                Button("Cancel", role: .cancel) {}
                Button("Add") {
                    let n = newName.trimmingCharacters(in: .whitespaces)
                    if !n.isEmpty { store.save(Project(name: n)) }
                }
            } message: { Text("It syncs to your computers. Link a folder there to use git and commands.") }
        }
    }
}

private struct EmptyProjects: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        ContentUnavailableView {
            Label(store.connected ? "No projects yet" : "Connect your database", systemImage: store.connected ? "tray" : "icloud.slash")
        } description: {
            Text(store.connected ? "Add a project here, or on your computer, and it will show up everywhere." : "Open Settings and paste the same database address you use in BluePhoenix on your computer.")
        }
    }
}

struct ProjectRow: View {
    @Environment(AppStore.self) private var store
    let project: Project
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(project.name).font(.headline)
                Pill(text: project.kind)
                Spacer()
                if project.favorite { Image(systemName: "star.fill").foregroundStyle(.yellow).font(.footnote) }
            }
            if let d = project.description, !d.isEmpty {
                Text(d).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
            HStack(spacing: 16) {
                Label(formatMinutes(store.minutes(project.id)), systemImage: "clock")
                Label("\(store.openTodos(project.id)) open", systemImage: "checklist")
            }
            .font(.footnote).foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }
}
