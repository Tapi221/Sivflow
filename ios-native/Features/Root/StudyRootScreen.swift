import SwiftUI
import UniformTypeIdentifiers

struct StudyRootScreen: View {
    @ObservedObject var runtimeStore: StudyRuntimeStore
    @State private var isImportingSnapshot = false
    @State private var importErrorMessage: String?

    var body: some View {
        NavigationStack {
            FolderListScreen(
                title: "Library",
                folder: nil,
                service: runtimeStore.session.service
            )
            .navigationTitle("FlashCardMaster")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            isImportingSnapshot = true
                        } label: {
                            Label("Import Snapshot", systemImage: "square.and.arrow.down")
                        }

                        Button {
                            runtimeStore.resetToBundledSample()
                        } label: {
                            Label("Reset to bundled sample", systemImage: "arrow.counterclockwise")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                RuntimeStatusPanel(session: runtimeStore.session, importErrorMessage: importErrorMessage)
            }
            .fileImporter(
                isPresented: $isImportingSnapshot,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    importErrorMessage = nil
                    Task {
                        await runtimeStore.importSnapshot(from: url)
                    }
                case .failure(let error):
                    importErrorMessage = error.localizedDescription
                }
            }
        }
    }
}

private struct RuntimeStatusPanel: View {
    let session: RuntimeSession
    let importErrorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack(alignment: .firstTextBaseline, spacing: AppSpacing.sm) {
                Text(session.source.rawValue)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.primary)
                Text(session.sourceDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: AppSpacing.md) {
                Label("schema \(session.service.metadata.schemaVersion)", systemImage: "shippingbox")
                Label("gen \(session.service.metadata.generationCounter)", systemImage: "number")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)

            if let bootstrapError = session.bootstrapError,
               !bootstrapError.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(bootstrapError)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.leading)
            }

            if let importErrorMessage,
               !importErrorMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(importErrorMessage)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.md)
        .background(.thinMaterial)
    }
}
