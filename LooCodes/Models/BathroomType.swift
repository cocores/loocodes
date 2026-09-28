import SwiftUI

enum BathroomType: String, CaseIterable, Identifiable, Codable {
    case cafe            = "Cafe"
    case restaurant       = "Restaurant"
    case publicRestroom  = "Public"
    case gasStation       = "Gas Station"
    case store            = "Store"
    case park             = "Park"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .cafe:            return "☕️"
        case .restaurant:      return "🍽️"
        case .publicRestroom:  return "🚻"
        case .gasStation:      return "⛽️"
        case .store:           return "🏬"
        case .park:            return "🌳"
        }
    }

    var tagBgColor: Color {
        Color(hex: "3a3a4a")
    }
}
