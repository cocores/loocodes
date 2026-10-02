import FirebaseFirestore
import Observation

@Observable
final class BathroomStore {
    var bathrooms: [Bathroom] = []
    var isLoading = true

    /// Set once from `start(uid:)` when this store is created for a signed-in
    /// account (see LooCodesApp.swift) — every write needs it, so there's no
    /// meaningful state this store can be in without one.
    private(set) var uid: String = ""

    private var listener: ListenerRegistration?

    /// Which bathrooms the signed-in account has voted up / flagged —
    /// derived from each bathroom's own `voters`/`flaggers` array rather
    /// than device-local storage, so it's consistent across every device
    /// this account signs into.
    var votedUpIds: Set<String> {
        Set(bathrooms.filter { $0.voters.contains(uid) }.map(\.id))
    }
    var flaggedIds: Set<String> {
        Set(bathrooms.filter { $0.flaggers.contains(uid) }.map(\.id))
    }

    func start(uid: String) {
        self.uid = uid
        guard listener == nil else { return }
        listener = FirestoreService.subscribe(
            onData: { [weak self] list in
                self?.bathrooms = list
                self?.isLoading = false
            },
            onError: { [weak self] error in
                print("Failed to load bathrooms:", error)
                self?.isLoading = false
            }
        )

        // A listener that never fires either callback (observed in the web
        // app under a bad connection) would otherwise leave the app on a
        // loading spinner forever. This is a ceiling, not a replacement —
        // if the listener resolves after this, its callback still runs and
        // switches to live data normally.
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 8_000_000_000)
            self?.isLoading = false
        }
    }

    deinit {
        listener?.remove()
    }

    func myCodes() -> [Bathroom] {
        bathrooms.filter { $0.submittedBy == uid }
    }

    @discardableResult
    func add(_ draft: NewBathroomDraft) async -> Bathroom? {
        do {
            // No manual array insert here — the snapshot listener above
            // picks up the new doc (and reflects it to every other open
            // client too).
            return try await FirestoreService.createBathroom(draft)
        } catch {
            print("Failed to publish bathroom:", error)
            return nil
        }
    }

    /// "It Works" is a reconfirmation, not a one-time toggle — it should
    /// always be clickable, even after this account already voted, so
    /// repeat visits keep lastConfirmedAt fresh. Patched into local state
    /// *before* the network call, not after: a slow connection's write can
    /// take a long time to settle, and waiting for it left the button
    /// looking unresponsive in the meantime. The next Firestore snapshot
    /// reconciles this with the real values.
    func voteUp(_ id: String) {
        patch(id) { b in
            b.hasVotedUp = true
            b.upvoteCount += 1
            b.lastConfirmedAt = Int64(Date().timeIntervalSince1970 * 1000)
            if !b.voters.contains(self.uid) { b.voters.append(self.uid) }
        }
        Task {
            do {
                try await FirestoreService.voteUp(id, uid: self.uid)
            } catch {
                print("Failed to vote up bathroom:", error)
            }
        }
    }

    /// Flagging also resets this account's own "It Works" confirmation for
    /// the same listing — a flag is a signal that a prior confirmation may
    /// no longer hold, so the two shouldn't show as both checked at once.
    /// Still one report per account: repeat taps on an already-flagged
    /// listing are a no-op.
    func flag(_ id: String) {
        guard !flaggedIds.contains(id) else { return }
        patch(id) { b in
            b.flagCount += 1
            b.hasVotedUp = false
            if !b.flaggers.contains(self.uid) { b.flaggers.append(self.uid) }
        }
        Task {
            do {
                try await FirestoreService.flag(id, uid: self.uid)
            } catch {
                print("Failed to flag bathroom:", error)
            }
        }
    }

    /// Admin action — mirrors the web app's admin flagged-reports view
    /// (there's no equivalent screen on iOS yet, so this is currently
    /// unused, but kept so one can be wired up the same way). There's no
    /// real auth/admin role in this app, so this is a soft, honor-system
    /// gate; firestore.rules narrowly scopes what it can touch.
    func clearFlag(_ id: String) {
        patch(id) { b in
            b.flagCount = 0
            b.flaggers = []
        }
        Task {
            do {
                try await FirestoreService.clearFlag(id)
            } catch {
                print("Failed to clear flag:", error)
            }
        }
    }

    func suggest(_ id: String, text: String) {
        Task {
            do {
                try await FirestoreService.suggest(id, text: text, submittedBy: self.uid)
            } catch {
                print("Failed to submit suggestion:", error)
            }
        }
    }

    private func patch(_ id: String, _ transform: (inout Bathroom) -> Void) {
        guard let index = bathrooms.firstIndex(where: { $0.id == id }) else { return }
        transform(&bathrooms[index])
    }
}
