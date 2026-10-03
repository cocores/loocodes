import Foundation

/// Mirrors web/src/lib/auth.ts's NotificationPrefs — stored on this account's
/// Firestore profile (users/{uid}.notificationPrefs), not locally, so it's
/// consistent across every device this account signs into. Optional on the
/// document itself (see firestore.rules): a profile created before this
/// field existed just reads back as all-false via the defaults below.
struct NotificationPrefs: Equatable {
    var nearbyNew    = false
    var weeklyDigest = false
    var codeVerified = false
    var codeFlagged  = false
    var suggestions  = false
    var quietHours   = false
}
