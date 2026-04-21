import SwiftUI
import UIKit

struct CardDetailScreenEnhanced: View {
    let card: StudyCard
    let service: StudyBrowsingService
    
    @StateObject private var displayState = CardDisplayState()
    @StateObject private var statusManager = CardStatusManager()
    @State private var showActionMenu = false
    
    private var tags: [StudyTag] {
        service.tags(for: card.tagIds)
    }
    
    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.xl) {
                    // Header with controls
                    headerSection
                    
                    // Card content with flip animation
                    cardContentSection
                    
                    // Status badges
                    if !card.badges.isEmpty {
                        statusBadgesSection
                    }
                    
                    // Tags
                    if !tags.isEmpty {
                        tagsSection
                    }
                    
                    // Action buttons
                    actionButtonsSection
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(AppSpacing.lg)
            }
            
            // Zoom controls overlay
            if displayState.zoomLevel > displayState.defaultZoom {
                VStack {
                    HStack {
                        Button(action: displayState.resetZoom) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .padding(AppSpacing.md)
                                .background(Color.black.opacity(0.6))
                                .clipShape(Circle())
                        }
                        Spacer()
                    }
                    .padding(AppSpacing.md)
                    
                    Spacer()
                }
            }
        }
        .navigationTitle("Card")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Menu {
                    Button(action: displayState.toggleDisplayMode) {
                        Label(
                            displayState.displayMode == .card ? "Fluid View" : "Card View",
                            systemImage: displayState.displayMode == .card ? "rectangle.expand" : "rectangle.compress"
                        )
                    }
                    
                    Divider()
                    
                    Button(action: { statusManager.toggleDraft() }) {
                        Label(
                            statusManager.isDraft ? "Remove Draft" : "Mark as Draft",
                            systemImage: statusManager.isDraft ? "checkmark.circle.fill" : "circle"
                        )
                    }
                    
                    Button(action: { statusManager.toggleUncertain() }) {
                        Label(
                            statusManager.isUncertain ? "Remove Uncertain" : "Mark Uncertain",
                            systemImage: statusManager.isUncertain ? "checkmark.circle.fill" : "circle"
                        )
                    }
                    
                    Button(action: { statusManager.toggleCompleted() }) {
                        Label(
                            statusManager.isCompleted ? "Mark Incomplete" : "Mark Complete",
                            systemImage: statusManager.isCompleted ? "checkmark.circle.fill" : "circle"
                        )
                    }
                    
                    Button(action: { statusManager.toggleSilent() }) {
                        Label(
                            statusManager.isSilent ? "Enable Sound" : "Mute",
                            systemImage: statusManager.isSilent ? "speaker.fill" : "speaker.slash.fill"
                        )
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(card.displayTitle)
                .font(.title2.weight(.semibold))
            Text("Question #\(card.questionNumber)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
    
    private var cardContentSection: some View {
        VStack(spacing: AppSpacing.md) {
            // Display mode and zoom controls
            HStack(spacing: AppSpacing.md) {
                HStack(spacing: AppSpacing.sm) {
                    Button(action: displayState.zoomOut) {
                        Image(systemName: "minus.magnifyingglass")
                            .font(.body)
                    }
                    .disabled(displayState.zoomLevel <= displayState.minZoom)
                    
                    Text(String(format: "%.0f%%", displayState.zoomLevel * 100))
                        .font(.caption.weight(.semibold))
                        .frame(minWidth: 40)
                    
                    Button(action: displayState.zoomIn) {
                        Image(systemName: "plus.magnifyingglass")
                            .font(.body)
                    }
                    .disabled(displayState.zoomLevel >= displayState.maxZoom)
                }
                .padding(AppSpacing.sm)
                .background(Color(.secondarySystemBackground))
                .clipShape(Capsule())
                
                Spacer()
                
                Button(action: displayState.toggleFace) {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "arrow.left.arrow.right")
                        Text(displayState.isFrontShowing ? "Front" : "Back")
                    }
                    .font(.caption.weight(.semibold))
                    .padding(AppSpacing.sm)
                    .background(Color(.systemBlue))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                }
            }
            
            // Card content with flip animation
            ZStack {
                if displayState.isFrontShowing {
                    FaceContentView(
                        title: "Front",
                        face: card.front,
                        service: service,
                        zoomLevel: displayState.zoomLevel,
                        displayMode: displayState.displayMode
                    )
                    .transition(.opacity)
                } else {
                    FaceContentView(
                        title: "Back",
                        face: card.back,
                        service: service,
                        zoomLevel: displayState.zoomLevel,
                        displayMode: displayState.displayMode
                    )
                    .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: displayState.isFrontShowing)
        }
        .padding(AppSpacing.md)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    
    private var statusBadgesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Status")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            
            FlowBadgeView(values: card.badges)
        }
    }
    
    private var tagsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Tags")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            
            FlowBadgeView(values: tags.map(\.name))
        }
    }
    
    private var actionButtonsSection: some View {
        VStack(spacing: AppSpacing.md) {
            HStack(spacing: AppSpacing.md) {
                Button(action: { /* TODO: Edit card */ }) {
                    Label("Edit", systemImage: "pencil")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                
                Button(action: { /* TODO: Delete card */ }) {
                    Label("Delete", systemImage: "trash")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
    }
}

private struct FaceContentView: View {
    let title: String
    let face: StudyCardFace
    let service: StudyBrowsingService
    let zoomLevel: CGFloat
    let displayMode: CardDisplayMode
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text(title)
                .font(.headline)
            
            if face.blocks.isEmpty {
                EmptyPlaceholderView(
                    title: "Block がありません",
                    message: "この面には block が存在しません。"
                )
                .frame(minHeight: 140)
            } else {
                VStack(spacing: AppSpacing.md) {
                    ForEach(face.blocks) { block in
                        CardBlockViewEnhanced(
                            block: block,
                            service: service,
                            zoomLevel: zoomLevel
                        )
                    }
                }
            }
        }
    }
}

private struct CardBlockViewEnhanced: View {
    let block: StudyCardBlock
    let service: StudyBrowsingService
    let zoomLevel: CGFloat
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(block.type.rawValue.capitalized)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            
            switch block.type {
            case .text:
                plainTextView(block.content)
            case .markdown:
                MarkdownBlockView(markdown: block.markdown ?? block.content ?? "")
            case .question:
                questionView
            case .code:
                codeView
            case .math:
                mathView
            case .image:
                imageView
            case .audio:
                audioView
            case .reference:
                referenceView
            }
        }
        .padding(AppSpacing.md)
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .scaleEffect(zoomLevel, anchor: .topLeading)
    }
    
    @ViewBuilder
    private func plainTextView(_ value: String?) -> some View {
        Text(value ?? "")
            .frame(maxWidth: .infinity, alignment: .leading)
            .textSelection(.enabled)
    }
    
    private var questionView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(block.questionTitle ?? "Question")
                .font(.body.weight(.semibold))
            if let answer = block.questionAnswer {
                Text(answer)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .textSelection(.enabled)
    }
    
    private var codeView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            if let language = block.code?.language, !language.isEmpty {
                Text(language.uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                Text(block.code?.code ?? block.content ?? "")
                    .font(.system(.body, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
        }
    }
    
    private var mathView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(block.math?.latex ?? block.content ?? "")
                .font(.system(.body, design: .serif))
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
            if let note = block.math?.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
    
    private var imageView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            if block.images.isEmpty {
                Text("画像参照がありません")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(block.images) { image in
                    ResolvedImageView(
                        image: image,
                        resolvedSource: service.resolveImageSource(for: image)
                    )
                }
            }
        }
    }
    
    private var audioView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            if block.audios.isEmpty {
                Text("音声参照がありません")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(block.audios.sorted(by: { $0.order < $1.order })) { audio in
                    if let url = URL(string: audio.url) {
                        Link(destination: url) {
                            Label(audio.filename, systemImage: "speaker.wave.2")
                        }
                    } else {
                        Text(audio.filename)
                    }
                }
            }
        }
    }
    
    private var referenceView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            if block.references.isEmpty {
                Text("参照リンクがありません")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(block.references) { reference in
                    if let url = URL(string: reference.url) {
                        Link(destination: url) {
                            Label(reference.displayLabel, systemImage: "link")
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    } else {
                        Text(reference.displayLabel)
                    }
                }
            }
        }
    }
}

private struct MarkdownBlockView: View {
    let markdown: String
    
    var body: some View {
        if let attributed = try? AttributedString(
            markdown: markdown,
            options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .full)
        ) {
            Text(attributed)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        } else {
            Text(markdown)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        }
    }
}

private struct ResolvedImageView: View {
    let image: StudyImageReference
    let resolvedSource: StudyResolvedImageSource?
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Group {
                switch resolvedSource {
                case .inlineData(let data):
                    if let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                    } else {
                        unresolvedPlaceholder(message: "data URL を画像として復元できませんでした。")
                    }
                case .file(let url):
                    if let uiImage = UIImage(contentsOfFile: url.path) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                    } else {
                        unresolvedPlaceholder(message: "ローカル画像を読み込めませんでした: \(url.lastPathComponent)")
                    }
                case .remote(let url):
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                        case .failure:
                            unresolvedPlaceholder(message: "リモート画像の取得に失敗しました: \(url.absoluteString)")
                        case .empty:
                            ProgressView()
                                .frame(maxWidth: .infinity, minHeight: 120)
                        @unknown default:
                            unresolvedPlaceholder(message: "未対応の画像状態です。")
                        }
                    }
                case .none:
                    unresolvedPlaceholder(message: "有効な画像ソースを解決できませんでした。")
                }
            }
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            
            Text(image.displayLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
    }
    
    @ViewBuilder
    private func unresolvedPlaceholder(message: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Image unavailable")
                .font(.body.weight(.semibold))
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .leading)
        .padding(AppSpacing.md)
        .background(Color(.tertiarySystemBackground))
    }
}

private struct FlowBadgeView: View {
    let values: [String]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(values, id: \.self) { value in
                    Text(value)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, 6)
                        .background(Color(.systemBlue).opacity(0.2))
                        .clipShape(Capsule())
                }
            }
        }
    }
}
