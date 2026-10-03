import Foundation

/// Mirrors web/src/lib/time.ts's formatRelativeTime exactly, so both apps
/// describe the same confirmation age the same way.
enum RelativeTime {
    private static let minute: Int64 = 60_000
    private static let hour: Int64 = 60 * minute
    private static let day: Int64 = 24 * hour
    private static let month: Int64 = 30 * day
    private static let year: Int64 = 365 * day

    static func format(_ timestampMs: Int64, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) -> String {
        let diff = max(0, now - timestampMs)
        if diff < minute { return "just now" }
        if diff < hour { return "\(diff / minute)m ago" }
        if diff < day { return "\(diff / hour)h ago" }
        if diff < month { return "\(diff / day)d ago" }
        if diff < year { return "\(diff / month)mo ago" }
        return "\(diff / year)y ago"
    }
}
