import Foundation

enum ProductStatus: String, Codable, Sendable {
    case active
    case finished
}

struct Product: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    let name: String
    let status: ProductStatus
    let category: String
    let isFavorite: Bool
    let isPaused: Bool
    let createdAt: Date
    let finishedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case status
        case category
        case isFavorite = "is_favorite"
        case isPaused = "is_paused"
        case createdAt = "created_at"
        case finishedAt = "finished_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        status = try container.decode(ProductStatus.self, forKey: .status)
        category = try container.decodeIfPresent(String.self, forKey: .category) ?? "прочее"
        isFavorite = try container.decodeIfPresent(Bool.self, forKey: .isFavorite) ?? false
        isPaused = try container.decodeIfPresent(Bool.self, forKey: .isPaused) ?? false
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        finishedAt = try container.decodeIfPresent(Date.self, forKey: .finishedAt)
    }

    var isVisibleInMainList: Bool { !isPaused }
}

extension Array where Element == Product {
    func visibleInMainList() -> [Product] { filter(\.isVisibleInMainList) }
    func pausedOnly() -> [Product] { filter(\.isPaused) }
}

enum CategoryOrder {
    static let `default`: [String] = [
        "молочка",
        "овощи и фрукты",
        "мясо и рыба",
        "бакалея",
        "напитки",
        "заморозка",
        "бытовая химия",
        "прочее",
    ]
}
