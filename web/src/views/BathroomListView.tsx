import { useEffect, useMemo, useRef, useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation, type Coordinate } from "../hooks/useLocation";
import { useStickyVisible } from "../hooks/useStickyVisible";
import { BATHROOM_TYPES, isReportedStale, type Bathroom, type BathroomTypeId } from "../types";
import { FilterChip } from "../components/FilterChip";
import {
  ADABadge,
  CodeBadge,
  DistanceBadge,
  PriceBadge,
  ReportedStaleBadge,
  TypeBadge,
  ZohranToiletBadge,
} from "../components/Badges";
import { StarRating } from "../components/StarRating";
import { BathroomsMap } from "../components/BathroomsMap";
import { computeTrustScore } from "../lib/trust";
import { formatRelativeTime } from "../lib/time";
import { BathroomDetailSheet } from "./BathroomDetailSheet";
import "./BathroomListView.css";

const CLOSE_BY_MAX_MILES = 1;
const FURTHER_AWAY_MAX_MILES = 15;

type ViewMode = "list" | "map";

// Freshest/most-confirmed first — this is what "sorted by trust score and
// last confirmed date" means in practice (the decay in computeTrustScore
// already folds recency in), applied within each distance bucket.
function sortByTrust(list: Bathroom[]): Bathroom[] {
  return [...list].sort((a, b) => computeTrustScore(b) - computeTrustScore(a));
}

export function BathroomListView({ onAddAtLocation }: { onAddAtLocation?: (coordinate: Coordinate) => void }) {
  const { bathrooms, isLoading } = useBathroomStore();
  const { location, distanceTo, distanceMilesTo } = useLocation();
  const [selectedType, setSelectedType] = useState<BathroomTypeId | null>(null);
  const [adaOnly, setAdaOnly] = useState(false);
  const [selected, setSelected] = useState<Bathroom | null>(null);
  const [farAwayExpanded, setFarAwayExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const farAwayCardsRef = useRef<HTMLDivElement>(null);

  // The revealed cards can land below the fold with nothing to draw the eye
  // to them — scroll them into view so expanding visibly does something.
  useEffect(() => {
    if (farAwayExpanded) farAwayCardsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [farAwayExpanded]);

  const filtered = useMemo(
    () =>
      bathrooms.filter(
        (b) => (selectedType === null || b.type === selectedType) && (!adaOnly || b.isADAAccessible),
      ),
    [bathrooms, selectedType, adaOnly],
  );

  // Distance is either known for every bathroom (location resolved) or unknown
  // for all of them (no location yet) — so grouping is all-or-nothing.
  const grouped = useMemo(() => {
    if (!location) return null;
    const closeBy: Bathroom[] = [];
    const furtherAway: Bathroom[] = [];
    const farAway: Bathroom[] = [];
    for (const b of filtered) {
      const miles = distanceMilesTo(b) ?? 0;
      if (miles < CLOSE_BY_MAX_MILES) closeBy.push(b);
      else if (miles < FURTHER_AWAY_MAX_MILES) furtherAway.push(b);
      else farAway.push(b);
    }
    return {
      closeBy: sortByTrust(closeBy),
      furtherAway: sortByTrust(furtherAway),
      farAway: sortByTrust(farAway),
    };
  }, [filtered, location, distanceMilesTo]);

  const sortedFlat = useMemo(() => sortByTrust(filtered), [filtered]);

  // "Far Away" bathrooms are a different city entirely, not the user's area —
  // exclude them from the headline count (they're still reachable via the
  // collapsible section below, which shows its own count).
  const localCount = grouped ? grouped.closeBy.length + grouped.furtherAway.length : filtered.length;

  // Same scoping, applied to the map: fitting bounds to every bathroom
  // (including ones a continent away) zooms out so far that pins from
  // unrelated cities land on the same handful of screen pixels, making a tap
  // resolve to whichever marker happens to be on top instead of the one the
  // user meant. Restricting the map to the local area keeps pins far enough
  // apart to actually be tappable.
  const mapBathrooms = grouped ? [...grouped.closeBy, ...grouped.furtherAway] : filtered;

  return (
    <div className="screen list-view">
      <header className="list-view__header">
        <h1>LooCodes</h1>
      </header>

      <div className="list-view__chips">
        <FilterChip
          label="All"
          isSelected={selectedType === null && !adaOnly}
          onClick={() => {
            setSelectedType(null);
            setAdaOnly(false);
          }}
        />
        {BATHROOM_TYPES.map((t) => (
          <FilterChip
            key={t.id}
            label={`${t.emoji} ${t.label}`}
            isSelected={selectedType === t.id}
            onClick={() => setSelectedType((prev) => (prev === t.id ? null : t.id))}
          />
        ))}
        <FilterChip label="♿ ADA" isSelected={adaOnly} isDashed onClick={() => setAdaOnly((v) => !v)} />
      </div>

      <div className="list-view__count">
        <span>
          {localCount} Location{localCount === 1 ? "" : "s"} Found
        </span>
        <div className="list-view__view-toggle">
          <button
            type="button"
            className={`list-view__view-btn ${viewMode === "list" ? "list-view__view-btn--active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            ☰ List
          </button>
          <button
            type="button"
            className={`list-view__view-btn ${viewMode === "map" ? "list-view__view-btn--active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            🗺 Map
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="list-view__empty">
          <span className="list-view__empty-icon">🚽</span>
          <p>Loading…</p>
        </div>
      ) : viewMode === "map" ? (
        // Rendered even with zero matches (unlike the list branches below) —
        // an empty map is exactly where "tap to add a bathroom" is most useful.
        <BathroomsMap
          bathrooms={mapBathrooms}
          userLocation={location}
          onSelect={setSelected}
          onMapClick={onAddAtLocation}
        />
      ) : filtered.length === 0 ? (
        <div className="list-view__empty">
          <span className="list-view__empty-icon">🚽</span>
          <p>No bathrooms found</p>
          <span>Try a different filter</span>
        </div>
      ) : grouped === null ? (
        <div className="list-view__cards">
          {sortedFlat.map((b) => (
            <BathroomCard key={b.id} bathroom={b} distance={distanceTo(b)} onOpen={() => setSelected(b)} />
          ))}
        </div>
      ) : (
        <>
          {grouped.closeBy.length > 0 && (
            <>
              <div className="list-view__section-divider">
                <span>Close By</span>
              </div>
              <div className="list-view__cards">
                {grouped.closeBy.map((b) => (
                  <BathroomCard
                    key={b.id}
                    bathroom={b}
                    distance={distanceTo(b)}
                    onOpen={() => setSelected(b)}
                  />
                ))}
              </div>
            </>
          )}

          {grouped.furtherAway.length > 0 && (
            <>
              <div className="list-view__section-divider">
                <span>Further Away</span>
              </div>
              <div className="list-view__cards">
                {grouped.furtherAway.map((b) => (
                  <BathroomCard
                    key={b.id}
                    bathroom={b}
                    distance={distanceTo(b)}
                    onOpen={() => setSelected(b)}
                  />
                ))}
              </div>
            </>
          )}

          {grouped.farAway.length > 0 && (
            <>
              <button
                type="button"
                className="list-view__section-divider list-view__section-divider--collapsible"
                onClick={() => setFarAwayExpanded((v) => !v)}
                aria-expanded={farAwayExpanded}
              >
                <span>
                  Far Away ({grouped.farAway.length})
                </span>
                <span className="list-view__section-chevron" data-expanded={farAwayExpanded}>
                  ›
                </span>
              </button>
              {farAwayExpanded && (
                <div className="list-view__cards list-view__cards--reveal" ref={farAwayCardsRef}>
                  {grouped.farAway.map((b) => (
                    <BathroomCard
                      key={b.id}
                      bathroom={b}
                      distance={distanceTo(b)}
                      onOpen={() => setSelected(b)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {selected && <BathroomDetailSheet bathroom={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BathroomCard({
  bathroom,
  distance,
  onOpen,
}: {
  bathroom: Bathroom;
  distance: string | null;
  onOpen: () => void;
}) {
  const { voteUp, flag, flaggedIds } = useBathroomStore();
  // Shared, not per-account: once anyone confirms "It Works," it should read
  // as confirmed for every visitor, not just the account that tapped it —
  // same for a flag. Only whether *this* account can still tap Flag (to
  // avoid a wasted write the rules would reject anyway, since it's one flag
  // per account) stays per-account.
  const isConfirmedWorking = bathroom.hasVotedUp;
  const hasBeenFlagged = bathroom.flagCount > 0;
  const alreadyFlaggedByMe = flaggedIds.has(bathroom.id);
  // Once this card has shown the flagged note, its slot stays reserved for
  // good (for this card instance) — clearing the flag only fades the
  // message out, it never shrinks the card back down.
  const showFlagNote = hasBeenFlagged && !isReportedStale(bathroom);
  const flagSlotReserved = useStickyVisible(showFlagNote);

  return (
    <div className="bathroom-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="bathroom-card__top">
        <div>
          <div className="bathroom-card__name">
            {bathroom.isVerified && <span className="bathroom-card__verified">✓</span>}
            <span className={bathroom.isVerified ? "bathroom-card__name--verified" : ""}>
              {bathroom.name}
            </span>
          </div>
          <div className="bathroom-card__address">{bathroom.address}</div>
        </div>
        <DistanceBadge text={distance} />
      </div>

      <div className="bathroom-card__tags">
        <TypeBadge type={bathroom.type} />
        <CodeBadge code={bathroom.code} isFreeNoCode={bathroom.isFree && !bathroom.code} />
        {bathroom.isADAAccessible && <ADABadge />}
        <PriceBadge isFree={bathroom.isFree} feeAmount={bathroom.feeAmount} />
        {bathroom.isZohranToilet && <ZohranToiletBadge />}
        {isReportedStale(bathroom) && <ReportedStaleBadge />}
      </div>

      <div className="bathroom-card__rating">
        <StarRating rating={bathroom.rating} />
        <span className="bathroom-card__rating-value">{bathroom.rating.toFixed(1)}</span>
        <span className="bathroom-card__spacer" />
        <span className="bathroom-card__votes">{bathroom.upvoteCount} votes</span>
      </div>

      <div className="bathroom-card__meta">
        <span>Confirmed {formatRelativeTime(bathroom.lastConfirmedAt)}</span>
        {bathroom.suggestions.length > 0 && (
          <span>
            💬 {bathroom.suggestions.length} update{bathroom.suggestions.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {bathroom.note && (
        <div className="bathroom-card__note">
          <span>📝</span>
          <span>{bathroom.note}</span>
        </div>
      )}

      {flagSlotReserved && (
        <div className={`bathroom-card__flagwrap ${showFlagNote ? "is-open" : ""}`}>
          <div className="bathroom-card__note bathroom-card__note--flagged">
            <span>🚩</span>
            <span>Flagged — someone reported this may be incorrect or no longer available.</span>
          </div>
        </div>
      )}

      <div className="bathroom-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`bathroom-card__vote ${isConfirmedWorking ? "bathroom-card__vote--active" : ""}`}
          onClick={() => voteUp(bathroom.id)}
        >
          {isConfirmedWorking ? (
            <>
              <span>✓ Works!</span>
              <span className="bathroom-card__vote-time">
                Verified {formatRelativeTime(bathroom.lastConfirmedAt)}
              </span>
            </>
          ) : (
            "It Works"
          )}
        </button>
        <button
          type="button"
          className={`bathroom-card__flag ${hasBeenFlagged ? "bathroom-card__flag--active" : ""}`}
          disabled={alreadyFlaggedByMe}
          onClick={() => flag(bathroom.id)}
          aria-label="Flag stale"
        >
          🚩
        </button>
      </div>
    </div>
  );
}
