import { useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation } from "../hooks/useLocation";
import { isReportedStale, type Bathroom } from "../types";
import { ADABadge, DistanceBadge, PriceBadge, ReportedStaleBadge, TypeBadge } from "../components/Badges";
import { StarRating } from "../components/StarRating";
import { hasFlaggedLocally } from "../lib/flaggedTracker";
import "./BathroomDetailSheet.css";

export function BathroomDetailSheet({
  bathroom,
  onClose,
}: {
  bathroom: Bathroom;
  onClose: () => void;
}) {
  const { bathrooms, voteUp, flag } = useBathroomStore();
  const { distanceTo } = useLocation();
  const [copied, setCopied] = useState(false);

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
        </div>
      </div>
    </div>
  );
}
