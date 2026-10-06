import Foundation

extension String {
    /// Canonicalizes how a stored access code is shown. A blank code
    /// already gets its own caller-specific placeholder ("FREE", etc.),
    /// but a code someone actually typed as some casing of "n/a" should
    /// always render as the canonical "N/A" rather than whatever casing
    /// they happened to type.
    var displayCode: String {
        trimmingCharacters(in: .whitespaces).uppercased() == "N/A" ? "N/A" : self
    }
}
