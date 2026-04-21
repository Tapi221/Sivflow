import SwiftUI

struct EmptyPlaceholderView: View {
    let title: String
    let message: String

    var body: some View {
        VStack(alignment: .center, spacing: AppSpacing.sm) {
            Image(systemName: "tray")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(AppSpacing.xl)
    }
}
