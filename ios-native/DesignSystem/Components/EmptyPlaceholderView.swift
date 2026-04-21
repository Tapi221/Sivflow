import SwiftUI

struct EmptyPlaceholderView: View {
    let title: String
    let message: String

    var body: some View {
        VStack(alignment: .center, spacing: AppSpacing.sm) {
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
