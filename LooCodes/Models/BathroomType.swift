import SwiftUI

// Raw values must match the strings actually stored in Firestore (see
// web/src/types/index.ts's BathroomTypeId and firestore.rules'
// isValidNewBathroom() allow-list) — not display text.
enum BathroomType: String, CaseIterable, Identifiable, Codable {
    case cafe           = "cafe"
    case restaurant      = "restaurant"
    case publicRestroom = "publicRestroom"
    case gasStation      = "gasStation"
    case store           = "store"
    case park            = "park"
    case hotel           = "hotel"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .cafe:            return "Cafe"
        case .restaurant:      return "Restaurant"
        case .publicRestroom:  return "Public"
        case .gasStation:      return "Gas Station"
        case .store:           return "Store"
        case .park:            return "Park"
        case .hotel:           return "Hotel"
        }
    }

    var emoji: String {
        switch self {
        case .cafe:            return "☕️"
        case .restaurant:      return "🍽️"
        case .publicRestroom:  return "🚻"
        case .gasStation:      return "⛽️"
        case .store:           return "🏬"
        case .park:            return "🌳"
        case .hotel:           return "🏨"
        }
    }

    var tagBgColor: Color {
        Color(hex: "3a3a4a")
    }
}
