import Observation

@Observable
final class BathroomStore {
    var bathrooms: [Bathroom] = []

    func myCodes() -> [Bathroom] {
        bathrooms.filter { $0.submittedBy == "current_user" }
    }

    func add(_ bathroom: Bathroom) {
        bathrooms.insert(bathroom, at: 0)
    }

    func voteUp(_ id: Bathroom.ID) {
        guard let index = bathrooms.firstIndex(where: { $0.id == id }) else { return }
        bathrooms[index].hasVotedUp = true
        bathrooms[index].upvoteCount += 1
    }

    func flag(_ id: Bathroom.ID) {
        guard let index = bathrooms.firstIndex(where: { $0.id == id }) else { return }
        bathrooms[index].hasFlagged = true
    }
}
