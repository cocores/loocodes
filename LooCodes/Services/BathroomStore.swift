import FirebaseFirestore
import Observation

@Observable
final class BathroomStore {
    var bathrooms: [Bathroom] = []
    var isLoading = true
    /// Which bathrooms *this device* has voted up / flagged — see
    /// LocalInteractionTracker for why this isn't read off the Firestore
    /// document itself.
    var votedUpIds: Set<String> = LocalInteractionTracker.votedIds()
    var flaggedIds: Set<String> = LocalInteractionTracker.flaggedIds()

    private var listener: ListenerRegistration?

    func start() {
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
        let userId = LocalInteractionTracker.userId()
        return bathrooms.filter { $0.submittedBy == userId }
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
    /// always be clickable, even after this device already voted, so repeat
    /// visits keep lastConfirmedAt fresh. Marked locally *before* the
    /// network call, not after: a slow connection's write can take a long
    /// time to settle, and marking only on success left the button looking
    /// unresponsive in the meantime (same bug already fixed on the web app).
    func voteUp(_ id: String) {
        LocalInteractionTracker.markVoted(id)
        votedUpIds.insert(id)
        Task {
            do {
                try await FirestoreService.voteUp(id)
            } catch {
                print("Failed to vote up bathroom:", error)
            }
        }
    }

    /// Flagging also resets this device's own "It Works" confirmation for
    /// the same listing — a flag is a signal that a prior confirmation may
    /// no longer hold, so the two shouldn't show as both checked at once.
    /// Still one report per device: repeat taps on an already-flagged
    /// listing are a no-op.
    func flag(_ id: String) {
        guard !flaggedIds.contains(id) else { return }
        LocalInteractionTracker.markFlagged(id)
        flaggedIds.insert(id)
        LocalInteractionTracker.unmarkVoted(id)
        votedUpIds.remove(id)
        Task {
            do {
                try await FirestoreService.flag(id)
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
                try await FirestoreService.suggest(id, text: text, submittedBy: LocalInteractionTracker.userId())
            } catch {
                print("Failed to submit suggestion:", error)
            }
        }
    }

    /// Forgets this device's local identity (new anon id, cleared vote/flag
    /// history). Does NOT touch any shared Firestore data — listings
    /// already published stay public, they just stop showing under "My
    /// Codes" for this device.
    func resetAccount() {
        LocalInteractionTracker.resetAccount()
        votedUpIds = []
        flaggedIds = []
    }
}
