import CoreLocation

struct Bathroom: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
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
    var upvoteCount: Int = 0
    var rating: Double = 0
    var hasVotedUp: Bool = false
    var hasFlagged: Bool = false

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
