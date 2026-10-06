import { useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { bathroomType, type Bathroom } from "../types";
import { displayCode } from "../lib/code";
import "./SettingsViews.css";
import "./AdminFlaggedView.css";

export function AdminFlaggedView({ onBack }: { onBack: () => void }) {
  const { bathrooms, clearFlag } = useBathroomStore();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const flagged = [...bathrooms]
    .filter((b) => b.flagCount > 0)
    .sort((a, b) => b.flagCount - a.flagCount);

  const resolve = async (id: string) => {
    setResolvingId(id);
    try {
      await clearFlag(id);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="screen sub-screen">
      <header className="sub-screen__header">
        <button type="button" className="sub-screen__back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="sub-screen__title">Flagged Reports</span>
        <span className="sub-screen__spacer" />
      </header>

      <div className="sub-screen__body">
        <p className="admin-flagged__intro">
          Listings flagged as stale (a wrong code, or no longer a bathroom at all). There's no
          real admin role in this app yet — any signed-in account can open this screen and
          resolve a report, it's an honor-system gate, not a privilege check. Resolving clears
          the flag count back to zero (and lets the same accounts flag it again later); it
          doesn't otherwise change the listing.
        </p>

        {flagged.length === 0 ? (
          <p className="admin-flagged__empty">No flagged reports right now.</p>
        ) : (
          <div className="admin-flagged__list">
            {flagged.map((b) => (
              <FlaggedCard
                key={b.id}
                bathroom={b}
                isResolving={resolvingId === b.id}
                onResolve={() => resolve(b.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlaggedCard({
  bathroom,
  isResolving,
  onResolve,
}: {
  bathroom: Bathroom;
  isResolving: boolean;
  onResolve: () => void;
}) {
  const info = bathroomType(bathroom.type);
  return (
    <div className="admin-flagged__card">
      <div className="admin-flagged__top">
        <div>
          <div className="admin-flagged__name">
            {info.emoji} {bathroom.name}
          </div>
          <div className="admin-flagged__address">{bathroom.address}</div>
        </div>
        <span className="admin-flagged__count">
          🚩 {bathroom.flagCount} flag{bathroom.flagCount === 1 ? "" : "s"}
        </span>
      </div>

      {bathroom.code && <div className="admin-flagged__code">Code: {displayCode(bathroom.code)}</div>}
      {bathroom.note && <div className="admin-flagged__note">📝 {bathroom.note}</div>}

      {bathroom.suggestions.length > 0 && (
        <div className="admin-flagged__suggestions">
          {[...bathroom.suggestions]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map((s) => (
              <div key={s.id} className="admin-flagged__suggestion">
                💬 {s.text}
              </div>
            ))}
        </div>
      )}

      <button
        type="button"
        className="admin-flagged__resolve"
        disabled={isResolving}
        onClick={onResolve}
      >
        {isResolving ? "Resolving…" : "✓ Resolve (clear flag)"}
      </button>
    </div>
  );
}
