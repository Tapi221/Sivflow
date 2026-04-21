import SwiftUI
import UIKit

struct CardDetailScreen: View {
    let card: StudyCard
    let service: StudyBrowsingService

    private var tags: [StudyTag] {
        service.tags(for: card.tagIds)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.xl) {
                headerSection
                FaceSectionView(title: "Front", face: card.front, service: service)
                FaceSectionView(title: "Back", face: card.back, service: service)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppSpacing.lg)
        }
        .navigationTitle("Card Detail")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(card.displayTitle)
                .font(.title2.weight(.semibold))
            Text("Question #\(card.questionNumber)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if !tags.isEmpty {
                TagWrapView(tags: tags)
            }

            if !card.badges.isEmpty {
                FlowBadgeView(values: card.badges)
            }
        }
    }
}

private struct FaceSectionView: View {
    let title: String
    let face: StudyCardFace
    let service: StudyBrowsingService

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
                        CardBlockView(block: block, service: service)
                    }
                }
            }
        }
    }
}

private struct CardBlockView: View {
    let block: StudyCardBlock
    let service: StudyBrowsingService

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
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
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

private struct TagWrapView: View {
    let tags: [StudyTag]

    var body: some View {
        FlowBadgeView(values: tags.map(\.name))
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
                        .background(Color(.secondarySystemBackground))
                        .clipShape(Capsule())
                }
            }
        }
    }
}
