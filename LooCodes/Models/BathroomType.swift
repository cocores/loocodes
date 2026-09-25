import SwiftUI

enum BathroomType: String, CaseIterable, Identifiable, Codable {
    case cafe            = "Cafe"
    case restaurant       = "Restaurant"
    case publicRestroom  = "Public"
    case gasStation       = "Gas Station"
    case store            = "Store"
    case park             = "Park"
    // Mirrors web's "zohranThrone" BathroomTypeId — see
    // Models/Bathroom.swift's isZohranToilet doc comment for context. Not
    // yet wired to any live data on iOS.
    case zohranThrone     = "Zohran's Throne"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .cafe:            return "☕️"
        case .restaurant:      return "🍽️"
        case .publicRestroom:  return "🚻"
        case .gasStation:      return "⛽️"
        case .store:           return "🏬"
        case .park:            return "🌳"
        case .zohranThrone:    return "🏛️"
        }
    }

    var tagBgColor: Color {
        Color(hex: "3a3a4a")
    }
}
