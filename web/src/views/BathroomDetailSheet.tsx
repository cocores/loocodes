import { useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation } from "../hooks/useLocation";
import { isReportedStale, type Bathroom } from "../types";
import { ADABadge, DistanceBadge, PriceBadge, ReportedStaleBadge, TypeBadge } from "../components/Badges";
import { StarRating } from "../components/StarRating";
import { hasFlaggedLocally } from "../lib/flaggedTracker";
import { formatRelativeTime } from "../lib/time";
import "./BathroomDetailSheet.css";

export function BathroomDetailSheet({
  bathroom,
  onClose,
}: {
  bathroom: Bathroom;
  onClose: () => void;
}) {
  const { bathrooms, voteUp, flag, suggest } = useBathroomStore();
  const { distanceTo } = useLocation();
  const [copied, setCopied] = useState(false);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const current = bathrooms.find((b) => b.id === bathroom.id) ?? bathroom;
  const alreadyFlagged = hasFlaggedLocally(current.id);
  const voteDisabled = current.hasVotedUp || alreadyFlagged;
  const flagDisabled = alreadyFlagged || current.hasVotedUp;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
    } catch {
      // clipboard API unavailable, ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${current.latitude},${current.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitSuggestion = async () => {
    const text = suggestionText.trim();
    if (!text) return;
    setSubmittingSuggestion(true);
    try {
      await suggest(current.id, text);
      setSuggestionText("");
      setShowSuggestForm(false);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__drag-indicator" />
        <div className="sheet__scroll">
          <div className="detail__header">
            <div>
              <div className="detail__name">
                {current.isVerified && <span className="detail__verified">✓</span>}
                <span>{current.name}</span>
              </div>
              <div className="detail__address">{current.address}</div>
            </div>
            <DistanceBadge text={distanceTo(current)} />
          </div>

          <div className="detail__code-box">
            <div className="detail__code-label">ACCESS CODE</div>
            <div className="detail__code-row">
              <span className="detail__code">{current.code || "FREE"}</span>
              <button
                type="button"
                className={`detail__copy ${copied ? "detail__copy--copied" : ""}`}
                onClick={copyCode}
              >
                {copied ? "✓ Copied!" : "⧉ Copy"}
              </button>
            </div>
          </div>

          <div className="detail__tags">
            <TypeBadge type={current.type} />
            {current.isADAAccessible && <ADABadge />}
            <PriceBadge isFree={current.isFree} feeAmount={current.feeAmount} />
            {isReportedStale(current) && <ReportedStaleBadge />}
          </div>

          <div className={`detail__accessibility ${current.isADAAccessible ? "detail__accessibility--yes" : ""}`}>
            <span>{current.isADAAccessible ? "♿" : "🚶"}</span>
            <span>{current.isADAAccessible ? "ADA accessible" : "Not marked as accessible"}</span>
          </div>

          {current.note && (
            <div className="detail__note">
              <span>📝</span>
              <div>
                <div className="detail__note-label">Note</div>
                <div className="detail__note-text">{current.note}</div>
              </div>
            </div>
          )}

          <div className="detail__stars">
            <StarRating rating={current.rating} />
            <span className="detail__stars-value">{current.rating.toFixed(1)}</span>
            <span className="detail__spacer" />
            <span className="detail__votes">{current.upvoteCount} upvotes</span>
          </div>

          <div className="detail__confirmed">
            Confirmed {formatRelativeTime(current.lastConfirmedAt)}
          </div>

          <div className="detail__actions">
            <button
              type="button"
              className={`detail__vote ${current.hasVotedUp ? "detail__vote--active" : ""}`}
              disabled={voteDisabled}
              style={{ opacity: alreadyFlagged ? 0.3 : 1 }}
              onClick={() => voteUp(current.id)}
            >
              {current.hasVotedUp ? "✓ Works!" : "👍 It Works"}
            </button>
            <button
              type="button"
              className={`detail__flag ${alreadyFlagged ? "detail__flag--active" : ""}`}
              disabled={flagDisabled}
              style={{ opacity: current.hasVotedUp ? 0.3 : 1 }}
              onClick={() => flag(current.id)}
            >
              {alreadyFlagged ? "🚩 Flagged" : "🚩 Flag Stale"}
            </button>
          </div>

          <button type="button" className="detail__maps" onClick={openInMaps}>
            🗺 Open in Maps
          </button>

          <div className="detail__suggestions">
            <div className="detail__suggestions-header">
              <span>Suggested Updates</span>
              {!showSuggestForm && (
                <button type="button" className="detail__suggest-toggle" onClick={() => setShowSuggestForm(true)}>
                  + Suggest an update
                </button>
              )}
            </div>

            {showSuggestForm && (
              <div className="detail__suggest-form">
                <textarea
                  className="dark-input"
                  placeholder="e.g. Code changed to 5555, or the door is locked after 8pm…"
                  rows={2}
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                />
                <div className="detail__suggest-actions">
                  <button
                    type="button"
                    className="detail__suggest-cancel"
                    onClick={() => {
                      setShowSuggestForm(false);
                      setSuggestionText("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="detail__suggest-submit"
                    disabled={!suggestionText.trim() || submittingSuggestion}
                    onClick={() => void submitSuggestion()}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            {current.suggestions.length === 0 ? (
              <p className="detail__suggestions-empty">No suggested updates yet.</p>
            ) : (
              <div className="detail__suggestions-list">
                {[...current.suggestions]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((s) => (
                    <div key={s.id} className="detail__suggestion">
                      <p>{s.text}</p>
                      <span>{formatRelativeTime(s.createdAt)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
