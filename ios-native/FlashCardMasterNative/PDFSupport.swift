#if canImport(SwiftUI)
import SwiftUI
#if canImport(PDFKit)
import PDFKit
#endif
import UniformTypeIdentifiers

extension UTType {
    static var xlsx: UTType {
        UTType(filenameExtension: "xlsx") ?? .data
    }
}

enum PDFSourceResolver {
    static func resolvedURL(from value: String) -> URL? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if let url = URL(string: trimmed), url.scheme != nil {
            return url
        }
        if trimmed.hasPrefix("/") {
            return URL(fileURLWithPath: trimmed)
        }
        return URL(fileURLWithPath: trimmed)
    }

    static func canPreview(_ value: String?) -> Bool {
        guard let value, let url = resolvedURL(from: value) else { return false }
        if url.isFileURL {
            return url.pathExtension.lowercased() == "pdf"
        }
        return url.pathExtension.lowercased() == "pdf" || value.lowercased().contains(".pdf")
    }

    static func displayName(_ value: String?) -> String {
        guard let value else { return "PDF" }
        guard let url = resolvedURL(from: value) else { return "PDF" }
        return url.lastPathComponent.isEmpty ? "PDF" : url.lastPathComponent
    }
}

#if canImport(PDFKit)
struct PDFKitRepresentedView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView(frame: .zero)
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.usePageViewController(true)
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        if uiView.document?.documentURL != url {
            uiView.document = PDFDocument(url: url)
        }
    }
}
#endif

struct PDFPreviewScreen: View {
    let sourceValue: String
    let title: String

    @State private var localURL: URL?
    @State private var isDownloading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            #if canImport(PDFKit)
            if let localURL {
                PDFKitRepresentedView(url: localURL)
            } else if isDownloading {
                ProgressView("Loading PDF…")
            } else if let errorMessage {
                ContentUnavailableView("PDF unavailable", systemImage: "doc.richtext", description: Text(errorMessage))
            } else {
                ContentUnavailableView("PDF unavailable", systemImage: "doc.richtext")
            }
            #else
            ContentUnavailableView("PDFKit unavailable", systemImage: "doc.richtext")
            #endif
        }
        .navigationTitle(title)
        .task {
            await loadIfNeeded()
        }
    }

    private func loadIfNeeded() async {
        guard localURL == nil, errorMessage == nil else { return }
        guard let url = PDFSourceResolver.resolvedURL(from: sourceValue) else {
            errorMessage = "Invalid PDF URL."
            return
        }
        if url.isFileURL {
            localURL = url
            return
        }
        isDownloading = true
        defer { isDownloading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let temp = FileManager.default.temporaryDirectory.appendingPathComponent(url.lastPathComponent.isEmpty ? "temp.pdf" : url.lastPathComponent)
            try data.write(to: temp, options: .atomic)
            localURL = temp
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
#endif
