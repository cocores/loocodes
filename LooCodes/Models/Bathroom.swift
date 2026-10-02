import CoreLocation

struct BathroomSuggestion: Identifiable, Equatable {
    var id: String
    var text: String
    var submittedBy: String
    /// Epoch milliseconds, matching the web app's Date.now().
    var createdAt: Int64
}

/// Mirrors web/src/types/index.ts's Bathroom interface field-for-field —
/// this is the same Firestore document shape both apps read and write.
struct Bathroom: Identifiable, Equatable {
    var id: String
    var name: String
    var address: String
    var code: String
    var type: BathroomType
    var isADAAccessible: Bool
    var isFree: Bool
    var feeAmount: String
    var note: String
    var latitude: Double
    var longitude: Double
    var submittedBy: String
    var isVerified: Bool = false
    var isZohranToilet: Bool = false
    var upvoteCount: Int = 0
    var rating: Double = 0
    /// Shared Firestore aggregate (what the security rules pin true/false on
    /// every vote/flag) — NOT the per-device "did I confirm this" signal.
    /// That's tracked locally instead; see LocalInteractionTracker.
    var hasVotedUp: Bool = false
    var flagCount: Int = 0
    /// Epoch milliseconds of publish, or of the most recent "It Works" tap.
    var lastConfirmedAt: Int64 = 0
    var suggestions: [BathroomSuggestion] = []

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

/// What the Share form sends when publishing — the store assigns id and the
/// remaining aggregate/moderation fields, mirroring web's NewBathroom type.
struct NewBathroomDraft {
    var name: String
    var address: String
    var code: String
    var type: BathroomType
    var isADAAccessible: Bool
    var isFree: Bool
    var feeAmount: String
    var note: String
    var latitude: Double
    var longitude: Double
    var submittedBy: String
    var rating: Double
}
