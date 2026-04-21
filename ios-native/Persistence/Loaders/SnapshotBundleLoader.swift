import Foundation

struct SnapshotBundleLoader {
    enum SnapshotBundleLoaderError: LocalizedError {
        case missingFile(String)
        case unreadableData

        var errorDescription: String? {
            switch self {
            case .missingFile(let fileName):
                return "Bundle 内に \(fileName).json が見つかりません。"
            case .unreadableData:
                return "snapshot JSON の読み込みに失敗しました。"
            }
        }
    }

    let decoder: JSONDecoder

    init(decoder: JSONDecoder = JSONDecoder()) {
        self.decoder = decoder
    }

    func load(named fileName: String, bundle: Bundle = .main) throws -> SnapshotDTO {
        guard let url = bundle.url(forResource: fileName, withExtension: "json") else {
            throw SnapshotBundleLoaderError.missingFile(fileName)
        }

        guard let data = try? Data(contentsOf: url) else {
            throw SnapshotBundleLoaderError.unreadableData
        }

        return try decoder.decode(SnapshotDTO.self, from: data)
    }
}
