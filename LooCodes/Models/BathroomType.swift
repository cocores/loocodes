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

    // SF Symbol name, not a Unicode emoji — native iOS iconography renders
    // crisply at any size/tint and sidesteps the color-emoji "tofu box"
    // rendering bug that plain emoji glyphs are prone to when styled.
    var sfSymbol: String {
        switch self {
        case .cafe:            return "cup.and.saucer.fill"
        case .restaurant:      return "fork.knife"
        case .publicRestroom:  return "toilet.fill"
        case .gasStation:      return "fuelpump.fill"
        case .store:           return "building.2.fill"
        case .park:            return "leaf.fill"
        case .hotel:           return "bed.double.fill"
        }
    }

    var tagBgColor: Color {
        Color(hex: "3a3a4a")
    }
}
