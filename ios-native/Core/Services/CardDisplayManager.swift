import Foundation
import SwiftUI

// MARK: - Card Display Mode

enum CardDisplayMode: String, Codable {
    case card = "card"
    case fluid = "fluid"
}

// MARK: - Card Interaction Mode

enum CardInteractionMode: Equatable {
    case view
    case edit
}

// MARK: - Card Display State

@MainActor
final class CardDisplayState: ObservableObject {
    @Published var displayMode: CardDisplayMode = .card
    @Published var interactionMode: CardInteractionMode = .view
    @Published var zoomLevel: CGFloat = 1.0
    @Published var isFrontShowing: Bool = true
    
    let minZoom: CGFloat = 0.5
    let maxZoom: CGFloat = 3.0
    let defaultZoom: CGFloat = 1.0
    
    func toggleFace() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isFrontShowing.toggle()
        }
    }
    
    func toggleDisplayMode() {
        withAnimation(.easeInOut(duration: 0.2)) {
            displayMode = displayMode == .card ? .fluid : .card
        }
    }
    
    func setZoom(_ value: CGFloat) {
        let clamped = max(minZoom, min(maxZoom, value))
        withAnimation(.easeInOut(duration: 0.1)) {
            zoomLevel = clamped
        }
    }
    
    func resetZoom() {
        withAnimation(.easeInOut(duration: 0.2)) {
            zoomLevel = defaultZoom
        }
    }
    
    func zoomIn() {
        setZoom(zoomLevel + 0.2)
    }
    
    func zoomOut() {
        setZoom(zoomLevel - 0.2)
    }
}

// MARK: - Card Status Manager

@MainActor
final class CardStatusManager: ObservableObject {
    @Published var isDraft: Bool = false
    @Published var isUncertain: Bool = false
    @Published var isCompleted: Bool = false
    @Published var isSilent: Bool = false
    
    func toggleDraft() {
        isDraft.toggle()
    }
    
    func toggleUncertain() {
        isUncertain.toggle()
    }
    
    func toggleCompleted() {
        isCompleted.toggle()
    }
    
    func toggleSilent() {
        isSilent.toggle()
    }
    
    var statusBadges: [String] {
        var badges: [String] = []
        if isDraft { badges.append("Draft") }
        if isUncertain { badges.append("Uncertain") }
        if isCompleted { badges.append("Done") }
        if isSilent { badges.append("Silent") }
        return badges
    }
}

// MARK: - Card Content Renderer

struct CardContentRenderer {
    static func renderBlockContent(_ block: StudyCardBlock, service: StudyBrowsingService) -> AnyView {
        switch block.type {
        case .text:
            if let content = block.content {
                return AnyView(Text(content).lineLimit(nil))
            }
            
        case .markdown:
            if let markdown = block.markdown ?? block.content {
                return AnyView(Text(markdown).lineLimit(nil))
            }
            
        case .code:
            if let code = block.code?.code ?? block.content {
                return AnyView(
                    VStack(alignment: .leading) {
                        Text("Code")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(code)
                            .font(.system(.caption, design: .monospaced))
                            .lineLimit(nil)
                    }
                )
            }
            
        case .math:
            if let latex = block.math?.latex ?? block.content {
                return AnyView(
                    VStack(alignment: .leading) {
                        Text("Math")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(latex)
                            .font(.system(.caption, design: .monospaced))
                            .lineLimit(nil)
                    }
                )
            }
            
        case .image:
            if !block.images.isEmpty {
                return AnyView(
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(block.images) { image in
                            if let source = service.resolveImageSource(for: image) {
                                renderImageSource(source)
                            } else {
                                Text(image.displayLabel)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                )
            }
            
        case .audio:
            if !block.audios.isEmpty {
                return AnyView(
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(block.audios) { audio in
                            HStack {
                                Image(systemName: "speaker.wave.2")
                                    .foregroundStyle(.blue)
                                Text(audio.filename)
                                    .font(.caption)
                                    .lineLimit(1)
                            }
                        }
                    }
                )
            }
            
        case .reference:
            if !block.references.isEmpty {
                return AnyView(
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(block.references) { ref in
                            HStack {
                                Image(systemName: "link")
                                    .foregroundStyle(.blue)
                                Text(ref.displayLabel)
                                    .font(.caption)
                                    .lineLimit(1)
                            }
                        }
                    }
                )
            }
            
        case .question:
            if let title = block.questionTitle {
                return AnyView(
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Q: \(title)")
                            .font(.subheadline.weight(.semibold))
                        if let answer = block.questionAnswer {
                            Text("A: \(answer)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                )
            }
        }
        
        return AnyView(EmptyView())
    }
    
    private static func renderImageSource(_ source: StudyResolvedImageSource) -> AnyView {
        switch source {
        case .inlineData(let data):
            if let uiImage = UIImage(data: data) {
                return AnyView(
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 300)
                )
            }
            
        case .file(let url):
            return AnyView(
                Image(uiImage: UIImage(contentsOfFile: url.path) ?? UIImage())
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 300)
            )
            
        case .remote(let url):
            return AnyView(
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 300)
                    case .failure:
                        Text("Failed to load image")
                            .foregroundStyle(.red)
                    @unknown default:
                        EmptyView()
                    }
                }
            )
        }
        
        return AnyView(EmptyView())
    }
}

// MARK: - Card Search & Filter

struct CardSearchFilter {
    var query: String = ""
    var selectedCardSetIds: Set<String> = []
    var selectedTagIds: Set<String> = []
    var statusFilter: StatusFilterOption = .all
    var dateRange: DateRange? = nil
    
    enum StatusFilterOption {
        case all
        case draft
        case complete
        case uncertain
    }
    
    struct DateRange {
        let from: Date
        let to: Date
    }
    
    func matches(card: StudyCard) -> Bool {
        // Query matching
        if !query.isEmpty {
            let searchText = query.lowercased()
            let titleMatch = card.displayTitle.lowercased().contains(searchText)
            let contentMatch = card.front.blocks.contains { block in
                block.primaryText?.lowercased().contains(searchText) ?? false
            }
            if !titleMatch && !contentMatch {
                return false
            }
        }
        
        // Status filter
        switch statusFilter {
        case .draft:
            if !card.isDraft { return false }
        case .complete:
            if !card.isCompleted { return false }
        case .uncertain:
            if !card.hasUncertainty { return false }
        case .all:
            break
        }
        
        // Tag filter
        if !selectedTagIds.isEmpty {
            let hasMatchingTag = card.tagIds.contains { selectedTagIds.contains($0) }
            if !hasMatchingTag { return false }
        }
        
        return true
    }
}
