import SwiftUI

struct CardDetailScreen: View {
    let card: StudyCard

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.xl) {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text(card.displayTitle)
                        .font(.title2.weight(.semibold))
                    Text("Question #\(card.questionNumber)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if !card.tagIds.isEmpty {
                        Text(card.tagIds.joined(separator: ", "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                FaceSectionView(title: "Front", face: card.front)
                FaceSectionView(title: "Back", face: card.back)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppSpacing.lg)
        }
        .navigationTitle("Card Detail")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct FaceSectionView: View {
    let title: String
    let face: StudyCardFace

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text(title)
                .font(.headline)

            if face.blocks.isEmpty {
                EmptyPlaceholderView(
                    title: "Block がありません",
                    message: "この面には block が存在しません。"
                )
            } else {
                VStack(spacing: AppSpacing.md) {
                    ForEach(face.blocks) { block in
                        CardBlockView(block: block)
                    }
                }
            }
        }
    }
}

private struct CardBlockView: View {
    let block: StudyCardBlock

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(block.type.rawValue.capitalized)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            switch block.type {
            case .text, .markdown:
                Text(block.primaryText ?? "Empty")
                    .frame(maxWidth: .infinity, alignment: .leading)
            case .question:
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(block.questionTitle ?? "Question")
                        .font(.body.weight(.semibold))
                    Text(block.questionAnswer ?? "Answer")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            case .code:
                ScrollView(.horizontal, showsIndicators: false) {
                    Text(block.primaryText ?? "")
                        .font(.system(.body, design: .monospaced))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            case .math:
                Text(block.primaryText ?? "")
                    .font(.system(.body, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
            case .image:
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("画像ブロック")
                        .font(.body.weight(.semibold))
                    Text(block.primaryText ?? "asset 情報のみ保持")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            case .audio, .reference:
                Text(block.primaryText ?? "未サポート block")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(AppSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
    }
}
