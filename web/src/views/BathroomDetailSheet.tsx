import { useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation } from "../hooks/useLocation";
import { isReportedStale, type Bathroom } from "../types";
import {
  ADABadge,
  DistanceBadge,
  PriceBadge,
  ReportedStaleBadge,
  TypeBadge,
  ZohranToiletBadge,
} from "../components/Badges";
import { StarRating } from "../components/StarRating";
import { BathroomsMap } from "../components/BathroomsMap";
import { formatRelativeTime } from "../lib/time";
import { openWalkingDirections } from "../lib/directions";
import "./BathroomDetailSheet.css";

export function BathroomDetailSheet({
  bathroom,
  onClose,
}: {
  bathroom: Bathroom;
  onClose: () => void;
}) {
  const { bathrooms, voteUp, flag, suggest, flaggedIds } = useBathroomStore();
  const { location, distanceTo } = useLocation();
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const current = bathrooms.find((b) => b.id === bathroom.id) ?? bathroom;
  // Shared, not per-account: once anyone confirms "It Works," it reads as
  // confirmed for every visitor, not just the account that tapped it — same
  // for a flag. Only whether *this* account can still tap Flag (to avoid a
  // wasted write the rules would reject anyway, since it's one flag per
  // account) stays per-account.
  const isConfirmedWorking = current.hasVotedUp;
  const hasBeenFlagged = current.flagCount > 0;
  const alreadyFlaggedByMe = flaggedIds.has(current.id);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
    } catch {
      // clipboard API unavailable, ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            {current.isZohranToilet && <ZohranToiletBadge />}
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

          {hasBeenFlagged && !isReportedStale(current) && (
            <div className="detail__note detail__note--flagged">
              <span>🚩</span>
              <div>
                <div className="detail__note-label">Flagged</div>
                <div className="detail__note-text">
                  Someone reported this may be incorrect or no longer available.
                </div>
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
              className={`detail__vote ${isConfirmedWorking ? "detail__vote--active" : ""}`}
              onClick={() => voteUp(current.id)}
            >
              {isConfirmedWorking ? (
                <>
                  <span>✓ Works!</span>
                  <span className="detail__vote-time">
                    Verified {formatRelativeTime(current.lastConfirmedAt)}
                  </span>
                </>
              ) : (
                "👍 It Works"
              )}
            </button>
            <button
              type="button"
              className={`detail__flag ${hasBeenFlagged ? "detail__flag--active" : ""}`}
              disabled={alreadyFlaggedByMe}
              onClick={() => flag(current.id)}
            >
              {hasBeenFlagged ? "🚩 Flagged" : "🚩 Flag Stale"}
            </button>
          </div>

          <div className="detail__location-actions">
            <button
              type="button"
              className="detail__maps"
              onClick={() =>
                openWalkingDirections({ latitude: current.latitude, longitude: current.longitude })
              }
            >
              🧭 Directions
            </button>
            <button
              type="button"
              className="detail__maps"
              aria-expanded={showMap}
              onClick={() => setShowMap((v) => !v)}
            >
              🗺 {showMap ? "Hide Map" : "View on Map"}
            </button>
          </div>

          {showMap && (
            <BathroomsMap
              bathrooms={[current]}
              userLocation={location}
              onSelect={() => {}}
              height="220px"
            />
          )}

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
