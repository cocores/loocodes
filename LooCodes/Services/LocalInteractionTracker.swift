import Foundation

/// Per-device "did I confirm this / did I flag this" history, backed by
/// UserDefaults — mirrors web/src/lib/votedUpTracker.ts and
/// flaggedTracker.ts. hasVotedUp/flagCount on the Firestore document itself
/// are shared aggregates, not per-user state (anyone voting up a listing
/// would otherwise disable the button for every other visitor forever), so
/// whether *this device* already voted/flagged is tracked here instead.
enum LocalInteractionTracker {
    private static let votedKey = "loocodes.votedUpIds"
    private static let flaggedKey = "loocodes.flaggedIds"
    private static let userIdKey = "loocodes.userId"

    static func votedIds() -> Set<String> {
        Set(UserDefaults.standard.stringArray(forKey: votedKey) ?? [])
    }

    static func flaggedIds() -> Set<String> {
        Set(UserDefaults.standard.stringArray(forKey: flaggedKey) ?? [])
    }

    static func markVoted(_ id: String) {
        var ids = votedIds()
        ids.insert(id)
        UserDefaults.standard.set(Array(ids), forKey: votedKey)
    }

    static func unmarkVoted(_ id: String) {
        var ids = votedIds()
        guard ids.remove(id) != nil else { return }
        UserDefaults.standard.set(Array(ids), forKey: votedKey)
    }

    static func markFlagged(_ id: String) {
        var ids = flaggedIds()
        ids.insert(id)
        UserDefaults.standard.set(Array(ids), forKey: flaggedKey)
    }

    /// Forgets this device's local identity and vote/flag history — mirrors
    /// web's resetAccount(). Does not touch any shared Firestore data;
    /// listings already published stay public.
    static func resetAccount() {
        UserDefaults.standard.removeObject(forKey: votedKey)
        UserDefaults.standard.removeObject(forKey: flaggedKey)
        UserDefaults.standard.removeObject(forKey: userIdKey)
    }

    /// A persistent per-device anonymous id, used as `submittedBy` and to
    /// filter "My Codes" — mirrors web/src/lib/anonymousUser.ts. Without
    /// this every install would share one literal identifier and "My
    /// Codes" would show everyone's submissions, not just this device's.
    static func userId() -> String {
        if let existing = UserDefaults.standard.string(forKey: userIdKey) {
            return existing
        }
        let fresh = "anon-\(UUID().uuidString.prefix(8).lowercased())"
        UserDefaults.standard.set(fresh, forKey: userIdKey)
        return fresh
    }
}
