import FirebaseFirestore
import Foundation

/// Mirrors web/src/lib/firestoreBathrooms.ts — same collection, same field
/// shapes, same security rules. Deliberately avoids Firestore's Codable
/// bridging (FirebaseFirestoreSwift's @DocumentID/property-wrapper macros)
/// in favor of plain dictionary mapping: this file can't be compiled here
/// to verify against a specific SDK version, so explicit [String: Any]
/// reads/writes are the safer bet.
enum FirestoreService {
    private static let collection = "bathrooms"

    // MARK: - Field coercion

    // Numbers coming back from Firestore aren't guaranteed to be Int vs
    // Double consistently — this project's documents have been written by
    // several different paths over time (client increments, admin tooling),
    // some of which stored counts as doubleValue. Coerce defensively rather
    // than force-casting.
    private static func intValue(_ any: Any?) -> Int {
        if let i = any as? Int { return i }
        if let n = any as? NSNumber { return n.intValue }
        return 0
    }

    private static func int64Value(_ any: Any?) -> Int64 {
        if let i = any as? Int64 { return i }
        if let n = any as? NSNumber { return n.int64Value }
        return 0
    }

    private static func doubleValue(_ any: Any?) -> Double {
        if let d = any as? Double { return d }
        if let n = any as? NSNumber { return n.doubleValue }
        return 0
    }

    private static func stringValue(_ any: Any?) -> String {
        any as? String ?? ""
    }

    private static func boolValue(_ any: Any?) -> Bool {
        any as? Bool ?? false
    }

    // MARK: - Mapping

    static func bathroom(from data: [String: Any], id: String) -> Bathroom? {
        guard let name = data["name"] as? String, !name.isEmpty else { return nil }
        let typeRaw = stringValue(data["type"])
        let type = BathroomType(rawValue: typeRaw) ?? .publicRestroom

        let suggestions: [BathroomSuggestion] = (data["suggestions"] as? [[String: Any]] ?? []).map { s in
            BathroomSuggestion(
                id: stringValue(s["id"]),
                text: stringValue(s["text"]),
                submittedBy: stringValue(s["submittedBy"]),
                createdAt: int64Value(s["createdAt"])
            )
        }

        return Bathroom(
            id: id,
            name: name,
            address: stringValue(data["address"]),
            code: stringValue(data["code"]),
            type: type,
            isADAAccessible: boolValue(data["isADAAccessible"]),
            isFree: boolValue(data["isFree"]),
            feeAmount: stringValue(data["feeAmount"]),
            note: stringValue(data["note"]),
            latitude: doubleValue(data["latitude"]),
            longitude: doubleValue(data["longitude"]),
            submittedBy: stringValue(data["submittedBy"]),
            isVerified: boolValue(data["isVerified"]),
            isZohranToilet: boolValue(data["isZohranToilet"]),
            upvoteCount: intValue(data["upvoteCount"]),
            rating: doubleValue(data["rating"]),
            hasVotedUp: boolValue(data["hasVotedUp"]),
            flagCount: intValue(data["flagCount"]),
            lastConfirmedAt: int64Value(data["lastConfirmedAt"]),
            suggestions: suggestions
        )
    }

    private static func fields(for bathroom: Bathroom) -> [String: Any] {
        [
            "id": bathroom.id,
            "name": bathroom.name,
            "address": bathroom.address,
            "code": bathroom.code,
            "type": bathroom.type.rawValue,
            "isADAAccessible": bathroom.isADAAccessible,
            "isFree": bathroom.isFree,
            "feeAmount": bathroom.feeAmount,
            "note": bathroom.note,
            "latitude": bathroom.latitude,
            "longitude": bathroom.longitude,
            "submittedBy": bathroom.submittedBy,
            "isVerified": bathroom.isVerified,
            "isZohranToilet": bathroom.isZohranToilet,
            "upvoteCount": bathroom.upvoteCount,
            "rating": bathroom.rating,
            "hasVotedUp": bathroom.hasVotedUp,
            "flagCount": bathroom.flagCount,
            "lastConfirmedAt": bathroom.lastConfirmedAt,
            "suggestions": [],
        ]
    }

    // MARK: - Reads

    @discardableResult
    static func subscribe(
        onData: @escaping ([Bathroom]) -> Void,
        onError: @escaping (Error) -> Void
    ) -> ListenerRegistration {
        Firestore.firestore().collection(collection).addSnapshotListener { snapshot, error in
            if let error {
                onError(error)
                return
            }
            guard let snapshot else { return }
            let bathrooms = snapshot.documents.compactMap { bathroom(from: $0.data(), id: $0.documentID) }
            onData(bathrooms)
        }
    }

    // MARK: - Writes

    static func createBathroom(_ draft: NewBathroomDraft) async throws -> Bathroom {
        let ref = Firestore.firestore().collection(collection).document()
        let bathroom = Bathroom(
            id: ref.documentID,
            name: String(draft.name.prefix(200)),
            address: draft.address.isEmpty ? "Shared location" : String(draft.address.prefix(300)),
            code: String(draft.code.prefix(50)),
            type: draft.type,
            isADAAccessible: draft.isADAAccessible,
            isFree: draft.isFree,
            feeAmount: String(draft.feeAmount.prefix(30)),
            note: String(draft.note.prefix(500)),
            latitude: draft.latitude,
            longitude: draft.longitude,
            submittedBy: draft.submittedBy.isEmpty ? "anonymous" : draft.submittedBy,
            isVerified: false,
            isZohranToilet: false,
            upvoteCount: 0,
            rating: draft.rating.isFinite ? min(5, max(1, draft.rating)) : 3,
            hasVotedUp: false,
            flagCount: 0,
            lastConfirmedAt: Int64(Date().timeIntervalSince1970 * 1000),
            suggestions: []
        )
        try await ref.setData(fields(for: bathroom))
        return bathroom
    }

    static func voteUp(_ id: String) async throws {
        try await Firestore.firestore().collection(collection).document(id).updateData([
            "upvoteCount": FieldValue.increment(Int64(1)),
            "hasVotedUp": true,
            "lastConfirmedAt": Int64(Date().timeIntervalSince1970 * 1000),
        ])
    }

    static func flag(_ id: String) async throws {
        // A flag resets the shared "confirmed working" state too — matched
        // by clearing this device's own local vote history in BathroomStore.
        try await Firestore.firestore().collection(collection).document(id).updateData([
            "flagCount": FieldValue.increment(Int64(1)),
            "hasVotedUp": false,
        ])
    }

    /// Admin action — resets a listing's flag count once reviewed. Narrowly
    /// scoped by firestore.rules to a reset from >0 back to exactly 0.
    static func clearFlag(_ id: String) async throws {
        try await Firestore.firestore().collection(collection).document(id).updateData([
            "flagCount": 0,
        ])
    }

    static func suggest(_ id: String, text: String, submittedBy: String) async throws {
        let trimmed = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(500))
        guard !trimmed.isEmpty else { return }
        let suggestion: [String: Any] = [
            "id": UUID().uuidString,
            "text": trimmed,
            "submittedBy": submittedBy.isEmpty ? "anonymous" : String(submittedBy.prefix(100)),
            "createdAt": Int64(Date().timeIntervalSince1970 * 1000),
        ]
        try await Firestore.firestore().collection(collection).document(id).updateData([
            "suggestions": FieldValue.arrayUnion([suggestion]),
        ])
    }
}
