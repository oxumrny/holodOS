import Foundation
import Supabase

enum ProductServiceError: LocalizedError, Equatable {
    case emptyName
    case duplicate(name: String, location: String)
    case message(String)

    var errorDescription: String? {
        switch self {
        case .emptyName:
            return "Введите название продукта"
        case let .duplicate(name, location):
            return "«\(name)» уже \(location)"
        case let .message(text):
            return text
        }
    }
}

struct ProductService: Sendable {
    private let client: SupabaseClient

    init(client: SupabaseClient = SupabaseManager.client) {
        self.client = client
    }

    func fetchProducts(status: ProductStatus) async throws -> [Product] {
        let orderColumn = status == .finished ? "finished_at" : "created_at"

        do {
            return try await client
                .from("products")
                .select()
                .eq("status", value: status.rawValue)
                .order(orderColumn, ascending: false)
                .execute()
                .value
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func fetchPausedProducts() async throws -> [Product] {
        do {
            return try await client
                .from("products")
                .select()
                .eq("is_paused", value: true)
                .order("name")
                .execute()
                .value
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func addProduct(name: String, status: ProductStatus) async throws {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw ProductServiceError.emptyName
        }

        let normalizedName = trimmed.lowercased()

        let matches: [ExistingProduct]
        do {
            matches = try await client
                .from("products")
                .select("id, status, name")
                .ilike("name", pattern: normalizedName)
                .limit(1)
                .execute()
                .value
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }

        if let existing = matches.first {
            let location = existing.status == .active
                ? "в холодосе"
                : "в списке покупок"
            throw ProductServiceError.duplicate(name: existing.name, location: location)
        }

        var payload = NewProductPayload(
            name: normalizedName,
            status: status.rawValue,
            category: CategoryDetector.detect(from: normalizedName),
            finishedAt: nil
        )

        if status == .finished {
            payload.finishedAt = ISO8601DateFormatter.supabase.string(from: Date())
        }

        do {
            try await client
                .from("products")
                .insert(payload)
                .execute()
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func markAsFinished(id: UUID) async throws {
        let payload = StatusUpdatePayload(
            status: ProductStatus.finished.rawValue,
            finishedAt: ISO8601DateFormatter.supabase.string(from: Date()),
            isPaused: false
        )

        do {
            try await client
                .from("products")
                .update(payload)
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func restoreProduct(id: UUID) async throws {
        let payload = RestorePayload(
            status: ProductStatus.active.rawValue,
            finishedAt: nil,
            isPaused: false
        )

        do {
            try await client
                .from("products")
                .update(payload)
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func pauseProduct(id: UUID) async throws {
        do {
            try await client
                .from("products")
                .update(PausePayload(isPaused: true))
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }

    func resumeProduct(id: UUID) async throws {
        do {
            try await client
                .from("products")
                .update(PausePayload(isPaused: false))
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            throw ProductServiceError.message(error.localizedDescription)
        }
    }
}

private struct ExistingProduct: Decodable {
    let id: UUID
    let status: ProductStatus
    let name: String
}

private struct NewProductPayload: Encodable {
    let name: String
    let status: String
    let category: String
    var finishedAt: String?

    enum CodingKeys: String, CodingKey {
        case name
        case status
        case category
        case finishedAt = "finished_at"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(status, forKey: .status)
        try container.encode(category, forKey: .category)
        try container.encodeIfPresent(finishedAt, forKey: .finishedAt)
    }
}

private struct StatusUpdatePayload: Encodable {
    let status: String
    let finishedAt: String
    let isPaused: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case finishedAt = "finished_at"
        case isPaused = "is_paused"
    }
}

private struct RestorePayload: Encodable {
    let status: String
    let finishedAt: String?
    let isPaused: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case finishedAt = "finished_at"
        case isPaused = "is_paused"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(status, forKey: .status)
        try container.encodeNil(forKey: .finishedAt)
        try container.encode(isPaused, forKey: .isPaused)
    }
}

private struct PausePayload: Encodable {
    let isPaused: Bool

    enum CodingKeys: String, CodingKey {
        case isPaused = "is_paused"
    }
}

private extension ISO8601DateFormatter {
    static let supabase: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
