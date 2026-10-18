import SwiftUI

struct BrandBackground: View {
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            LinearGradient(
                colors: scheme == .dark
                    ? [Color(red: 0.04, green: 0.06, blue: 0.14), Color(red: 0.10, green: 0.06, blue: 0.26), Color(red: 0.17, green: 0.07, blue: 0.12)]
                    : [Color(red: 0.87, green: 0.92, blue: 1.0), Color(red: 0.95, green: 0.91, blue: 1.0), Color(red: 1.0, green: 0.92, blue: 0.88)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            RadialGradient(colors: [Color.accentColor.opacity(scheme == .dark ? 0.22 : 0.18), .clear], center: .topLeading, startRadius: 0, endRadius: 420)
            RadialGradient(colors: [Color.purple.opacity(scheme == .dark ? 0.20 : 0.14), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 460)
        }
        .ignoresSafeArea()
    }
}

extension View {
    /// Frosted card used for list rows.
    func glassRow() -> some View {
        listRowBackground(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(.ultraThinMaterial).padding(.vertical, 2))
    }
    func brandList() -> some View {
        scrollContentBackground(.hidden).background(BrandBackground())
    }
}

struct Pill: View {
    let text: String
    var color: Color = .secondary
    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(color.opacity(0.16), in: Capsule())
            .foregroundStyle(color)
    }
}
