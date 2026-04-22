import Foundation
#if canImport(FoundationXML)
import FoundationXML
#endif
#if canImport(zlib)
import zlib
#endif

struct XLSXImportedCard {
    let title: String
    let frontText: String
    let backText: String
    let noteText: String
    let imageURL: String?
    let sourceURL: String?
    let pdfURL: String?
}

struct XLSXImportResult {
    let cardSetName: String
    let cards: [XLSXImportedCard]
    let warnings: [String]
}

enum XLSXImportError: LocalizedError {
    case invalidArchive
    case missingWorksheet
    case missingHeaders
    case unsupportedCompressionMethod(UInt16)

    var errorDescription: String? {
        switch self {
        case .invalidArchive:
            return "The XLSX file could not be read."
        case .missingWorksheet:
            return "The workbook does not contain a readable sheet."
        case .missingHeaders:
            return "The workbook is missing the expected header row."
        case .unsupportedCompressionMethod(let method):
            return "Unsupported ZIP compression method \(method)."
        }
    }
}

private struct ZIPEntry {
    let path: String
    let method: UInt16
    let compressedSize: Int
    let uncompressedSize: Int
    let localHeaderOffset: Int
}

private extension Data {
    func leUInt16(at offset: Int) -> UInt16 {
        let b0 = UInt16(self[offset])
        let b1 = UInt16(self[offset + 1]) << 8
        return b0 | b1
    }

    func leUInt32(at offset: Int) -> UInt32 {
        let b0 = UInt32(self[offset])
        let b1 = UInt32(self[offset + 1]) << 8
        let b2 = UInt32(self[offset + 2]) << 16
        let b3 = UInt32(self[offset + 3]) << 24
        return b0 | b1 | b2 | b3
    }
}

private struct XLSXBlockRow {
    let cardID: String
    let side: String
    let blockOrder: Int
    let type: String
    let content: String
    let language: String
    let title: String
}

enum XLSXImportService {
    static func importWorkbook(data: Data, fileName: String) throws -> XLSXImportResult {
        let archive = try ZIPArchive(data: data)
        let sharedStrings = try archive.sharedStrings()
        let worksheetPath = try archive.workbook()
        let rows = try archive.worksheetRows(at: worksheetPath, sharedStrings: sharedStrings)
        guard let headerRow = rows.first else {
            throw XLSXImportError.missingHeaders
        }

        let headers = normalizeHeaders(headerRow)
        guard headers["cardid"] != nil, headers["blockorder"] != nil, headers["type"] != nil else {
            throw XLSXImportError.missingHeaders
        }

        var warnings: [String] = []
        var grouped: [String: [XLSXBlockRow]] = [:]

        for row in rows.dropFirst() {
            let cardID = value(for: "cardid", in: row, headers: headers).trimmingCharacters(in: .whitespacesAndNewlines)
            if cardID.isEmpty { continue }
            let side = value(for: "side", in: row, headers: headers).lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            let type = value(for: "type", in: row, headers: headers).lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            let content = value(for: "content", in: row, headers: headers)
            let language = value(for: "language", in: row, headers: headers)
            let title = value(for: "title", in: row, headers: headers)
            let blockOrder = Int(value(for: "blockorder", in: row, headers: headers)) ?? 0
            let normalizedSide = side.isEmpty ? "front" : side
            if normalizedSide != "front" && normalizedSide != "back" {
                warnings.append("Skipped row with invalid side for card \(cardID).")
                continue
            }
            if type.isEmpty {
                warnings.append("Skipped row with empty type for card \(cardID).")
                continue
            }
            grouped[cardID, default: []].append(XLSXBlockRow(cardID: cardID, side: normalizedSide, blockOrder: blockOrder, type: type, content: content, language: language, title: title))
        }

        let importedCards = grouped.keys.sorted().compactMap { cardID -> XLSXImportedCard? in
            let blocks = grouped[cardID, default: []].sorted { lhs, rhs in
                if lhs.blockOrder == rhs.blockOrder {
                    return lhs.side < rhs.side
                }
                return lhs.blockOrder < rhs.blockOrder
            }
            guard !blocks.isEmpty else { return nil }

            let title = blocks.first(where: { !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })?.title.trimmingCharacters(in: .whitespacesAndNewlines) ?? cardID
            let front = render(blocks: blocks.filter { $0.side == "front" })
            let back = render(blocks: blocks.filter { $0.side == "back" })
            let note = noteText(from: blocks)
            let imageURL = blocks.first(where: { $0.type == "image" && isLikelyURL($0.content) })?.content.trimmingCharacters(in: .whitespacesAndNewlines)
            let sourceURL = blocks.first(where: { ($0.type == "link" || $0.type == "source") && isLikelyURL($0.content) })?.content.trimmingCharacters(in: .whitespacesAndNewlines)
            let pdfURL = blocks.first(where: { ($0.type == "pdf" || $0.content.lowercased().contains(".pdf")) && isLikelyURL($0.content) })?.content.trimmingCharacters(in: .whitespacesAndNewlines)

            return XLSXImportedCard(
                title: title,
                frontText: front.isEmpty ? title : front,
                backText: back,
                noteText: note,
                imageURL: imageURL,
                sourceURL: sourceURL,
                pdfURL: pdfURL
            )
        }

        let baseName = URL(fileURLWithPath: fileName).deletingPathExtension().lastPathComponent
        let setName = baseName.isEmpty ? "Imported XLSX" : "Imported • \(baseName)"
        return XLSXImportResult(cardSetName: setName, cards: importedCards, warnings: warnings)
    }

    private static func normalizeHeaders(_ row: [Int: String]) -> [String: Int] {
        var mapping: [String: Int] = [:]
        for (index, value) in row {
            let normalized = value
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
                .replacingOccurrences(of: " ", with: "")
            if !normalized.isEmpty {
                mapping[normalized] = index
            }
        }
        return mapping
    }

    private static func value(for header: String, in row: [Int: String], headers: [String: Int]) -> String {
        guard let index = headers[header] else { return "" }
        return row[index] ?? ""
    }

    private static func render(blocks: [XLSXBlockRow]) -> String {
        let rendered = blocks.sorted { $0.blockOrder < $1.blockOrder }.map { block -> String in
            let trimmed = block.content.trimmingCharacters(in: .whitespacesAndNewlines)
            switch block.type {
            case "code":
                let language = block.language.trimmingCharacters(in: .whitespacesAndNewlines)
                return language.isEmpty ? trimmed : "```\(language)\n\(trimmed)\n```"
            case "markdown", "text", "html", "math", "latex":
                return trimmed
            case "pdf":
                return "[PDF] \(trimmed)"
            case "image":
                return isLikelyURL(trimmed) ? "[Image] \(trimmed)" : trimmed
            default:
                return trimmed
            }
        }
        return rendered.filter { !$0.isEmpty }.joined(separator: "\n\n")
    }

    private static func noteText(from blocks: [XLSXBlockRow]) -> String {
        let interesting = blocks.filter { ["code", "math", "latex", "pdf"].contains($0.type) }
        guard !interesting.isEmpty else { return "" }
        let summary = interesting.map { block in
            let text = block.content.trimmingCharacters(in: .whitespacesAndNewlines)
            return "[\(block.type.uppercased())] \(text)"
        }
        return summary.joined(separator: "\n")
    }

    private static func isLikelyURL(_ value: String) -> Bool {
        guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)), let scheme = url.scheme else {
            return false
        }
        return scheme == "http" || scheme == "https" || scheme == "file"
    }
}

private final class ZIPArchive {
    private let data: Data
    private let entries: [String: ZIPEntry]

    init(data: Data) throws {
        self.data = data
        self.entries = try ZIPArchive.parseEntries(from: data)
    }

    func workbook() throws -> String {
        let workbookData = try file(path: "xl/workbook.xml")
        let relsData = try file(path: "xl/_rels/workbook.xml.rels")
        let workbookParser = WorkbookParser()
        let relsParser = WorkbookRelationshipsParser()
        let workbookXML = XMLParser(data: workbookData)
        workbookXML.delegate = workbookParser
        workbookXML.parse()
        let relsXML = XMLParser(data: relsData)
        relsXML.delegate = relsParser
        relsXML.parse()

        let preferredSheet = workbookParser.sheetReferences.first { $0.name.lowercased() == "blocks" } ?? workbookParser.sheetReferences.first
        guard let preferredSheet, let target = relsParser.targetsByRelationshipID[preferredSheet.relationshipID] else {
            throw XLSXImportError.missingWorksheet
        }
        let normalized = target.hasPrefix("/") ? String(target.dropFirst()) : "xl/\(target.replacingOccurrences(of: "../", with: ""))"
        return normalized
    }

    func sharedStrings() throws -> [String] {
        guard let data = try? file(path: "xl/sharedStrings.xml") else {
            return []
        }
        let parser = SharedStringsParser()
        let xml = XMLParser(data: data)
        xml.delegate = parser
        xml.parse()
        return parser.values
    }

    func worksheetRows(at path: String, sharedStrings: [String]) throws -> [[Int: String]] {
        let sheetData = try file(path: path)
        let parser = WorksheetRowsParser(sharedStrings: sharedStrings)
        let xml = XMLParser(data: sheetData)
        xml.delegate = parser
        xml.parse()
        return parser.rows
    }

    private func file(path: String) throws -> Data {
        guard let entry = entries[path] ?? entries[path.replacingOccurrences(of: "\\", with: "/")] else {
            throw XLSXImportError.missingWorksheet
        }
        let localOffset = entry.localHeaderOffset
        guard data.leUInt32(at: localOffset) == 0x04034b50 else { throw XLSXImportError.invalidArchive }
        let fileNameLength = Int(data.leUInt16(at: localOffset + 26))
        let extraLength = Int(data.leUInt16(at: localOffset + 28))
        let payloadOffset = localOffset + 30 + fileNameLength + extraLength
        let payloadRange = payloadOffset..<(payloadOffset + entry.compressedSize)
        guard payloadRange.upperBound <= data.count else { throw XLSXImportError.invalidArchive }
        let payload = Data(data[payloadRange])
        switch entry.method {
        case 0:
            return payload
        case 8:
            return try inflateRawDeflate(payload, expectedSize: entry.uncompressedSize)
        default:
            throw XLSXImportError.unsupportedCompressionMethod(entry.method)
        }
    }

    private static func parseEntries(from data: Data) throws -> [String: ZIPEntry] {
        let searchStart = max(0, data.count - 66000)
        guard let eocdOffset = data[searchStart..<data.count].lastRange(of: Data([0x50, 0x4b, 0x05, 0x06]))?.lowerBound else {
            throw XLSXImportError.invalidArchive
        }
        let totalEntries = Int(data.leUInt16(at: eocdOffset + 10))
        let centralDirectoryOffset = Int(data.leUInt32(at: eocdOffset + 16))
        var cursor = centralDirectoryOffset
        var entries: [String: ZIPEntry] = [:]
        for _ in 0..<totalEntries {
            guard data.leUInt32(at: cursor) == 0x02014b50 else { throw XLSXImportError.invalidArchive }
            let method = data.leUInt16(at: cursor + 10)
            let compressedSize = Int(data.leUInt32(at: cursor + 20))
            let uncompressedSize = Int(data.leUInt32(at: cursor + 24))
            let fileNameLength = Int(data.leUInt16(at: cursor + 28))
            let extraLength = Int(data.leUInt16(at: cursor + 30))
            let commentLength = Int(data.leUInt16(at: cursor + 32))
            let localOffset = Int(data.leUInt32(at: cursor + 42))
            let nameStart = cursor + 46
            let nameEnd = nameStart + fileNameLength
            guard nameEnd <= data.count else { throw XLSXImportError.invalidArchive }
            let name = String(data: data[nameStart..<nameEnd], encoding: .utf8) ?? ""
            entries[name] = ZIPEntry(path: name, method: method, compressedSize: compressedSize, uncompressedSize: uncompressedSize, localHeaderOffset: localOffset)
            cursor = nameEnd + extraLength + commentLength
        }
        return entries
    }

    private func inflateRawDeflate(_ payload: Data, expectedSize: Int) throws -> Data {
        #if canImport(zlib)
        var stream = z_stream()
        var result = Data(count: max(expectedSize, payload.count * 4 + 1024))
        let statusInit = inflateInit2_(&stream, -MAX_WBITS, ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size))
        guard statusInit == Z_OK else { throw XLSXImportError.invalidArchive }
        defer { inflateEnd(&stream) }
        return try payload.withUnsafeBytes { (sourcePointer: UnsafeRawBufferPointer) -> Data in
            guard let sourceBase = sourcePointer.bindMemory(to: Bytef.self).baseAddress else {
                throw XLSXImportError.invalidArchive
            }
            stream.next_in = UnsafeMutablePointer(mutating: sourceBase)
            stream.avail_in = uInt(payload.count)
            while true {
                let status = result.withUnsafeMutableBytes { destinationPointer -> Int32 in
                    guard let destBase = destinationPointer.bindMemory(to: Bytef.self).baseAddress else {
                        return Z_MEM_ERROR
                    }
                    stream.next_out = destBase.advanced(by: Int(stream.total_out))
                    stream.avail_out = uInt(result.count - Int(stream.total_out))
                    return inflate(&stream, Z_FINISH)
                }
                if status == Z_STREAM_END {
                    result.count = Int(stream.total_out)
                    return result
                }
                if status == Z_OK || status == Z_BUF_ERROR {
                    let newCount = result.count + max(expectedSize, payload.count)
                    result.count = newCount
                    continue
                }
                throw XLSXImportError.invalidArchive
            }
        }
        #else
        throw XLSXImportError.invalidArchive
        #endif
    }
}

private final class SharedStringsParser: NSObject, XMLParserDelegate {
    var values: [String] = []
    private var currentText = ""
    private var insideTextNode = false

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        if elementName == "t" {
            insideTextNode = true
            currentText = ""
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if insideTextNode {
            currentText += string
        }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        if elementName == "si" {
            values.append(currentText)
            currentText = ""
        } else if elementName == "t" {
            insideTextNode = false
        }
    }
}

private final class WorkbookParser: NSObject, XMLParserDelegate {
    struct SheetReference {
        let name: String
        let relationshipID: String
    }

    var sheetReferences: [SheetReference] = []

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        if elementName == "sheet" {
            let name = attributeDict["name"] ?? "Sheet"
            let relationshipID = attributeDict["r:id"] ?? attributeDict["id"] ?? ""
            sheetReferences.append(SheetReference(name: name, relationshipID: relationshipID))
        }
    }
}

private final class WorkbookRelationshipsParser: NSObject, XMLParserDelegate {
    var targetsByRelationshipID: [String: String] = [:]

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        if elementName == "Relationship", let id = attributeDict["Id"], let target = attributeDict["Target"] {
            targetsByRelationshipID[id] = target
        }
    }
}

private final class WorksheetRowsParser: NSObject, XMLParserDelegate {
    let sharedStrings: [String]
    init(sharedStrings: [String]) {
        self.sharedStrings = sharedStrings
    }

    var rows: [[Int: String]] = []
    private var currentRow: [Int: String] = [:]
    private var currentCellReference = ""
    private var currentCellType = ""
    private var currentValue = ""
    private var currentInlineText = ""
    private var insideValue = false
    private var insideInlineText = false

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        switch elementName {
        case "row":
            currentRow = [:]
        case "c":
            currentCellReference = attributeDict["r"] ?? ""
            currentCellType = attributeDict["t"] ?? ""
            currentValue = ""
            currentInlineText = ""
        case "v":
            insideValue = true
            currentValue = ""
        case "t":
            insideInlineText = true
            currentInlineText = ""
        default:
            break
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if insideValue { currentValue += string }
        if insideInlineText { currentInlineText += string }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        switch elementName {
        case "v":
            insideValue = false
        case "t":
            insideInlineText = false
        case "c":
            let index = columnIndex(from: currentCellReference)
            let value: String
            if currentCellType == "s", let sharedIndex = Int(currentValue), sharedIndex < sharedStrings.count {
                value = sharedStrings[sharedIndex]
            } else if currentCellType == "inlineStr" {
                value = currentInlineText
            } else {
                value = currentValue.isEmpty ? currentInlineText : currentValue
            }
            currentRow[index] = value
        case "row":
            if !currentRow.isEmpty {
                rows.append(currentRow)
            }
        default:
            break
        }
    }

    private func columnIndex(from cellReference: String) -> Int {
        let letters = cellReference.prefix { $0.isLetter }
        var result = 0
        for scalar in letters.unicodeScalars {
            result = result * 26 + Int(scalar.value) - 64
        }
        return max(0, result - 1)
    }
}
