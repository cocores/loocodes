import { useMemo, useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation } from "../hooks/useLocation";
import { BATHROOM_TYPES, type Bathroom, type BathroomTypeId } from "../types";
import { FilterChip } from "../components/FilterChip";
import { ADABadge, CodeBadge, DistanceBadge, PriceBadge, TypeBadge } from "../components/Badges";
import { StarRating } from "../components/StarRating";
import { BathroomDetailSheet } from "./BathroomDetailSheet";
import "./BathroomListView.css";

const FURTHER_AWAY_THRESHOLD_MILES = 25;

export function BathroomListView() {
  const { bathrooms, isLoading } = useBathroomStore();
  const { distanceTo, distanceMilesTo } = useLocation();
  const [selectedType, setSelectedType] = useState<BathroomTypeId | null>(null);
  const [adaOnly, setAdaOnly] = useState(false);
  const [selected, setSelected] = useState<Bathroom | null>(null);

  const filtered = useMemo(
    () =>
      bathrooms.filter(
        (b) => (selectedType === null || b.type === selectedType) && (!adaOnly || b.isADAAccessible),
      ),
    [bathrooms, selectedType, adaOnly],
  );

  const { nearby, further } = useMemo(() => {
    const nearby: Bathroom[] = [];
    const further: Bathroom[] = [];
    for (const b of filtered) {
      const miles = distanceMilesTo(b);
      // Unknown distance (no location permission yet) stays in the main list.
      (miles !== null && miles >= FURTHER_AWAY_THRESHOLD_MILES ? further : nearby).push(b);
    }
    return { nearby, further };
  }, [filtered, distanceMilesTo]);

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
        {filtered.length} Location{filtered.length === 1 ? "" : "s"} Found
      </div>

      {isLoading ? (
        <div className="list-view__empty">
          <span className="list-view__empty-icon">🚽</span>
          <p>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="list-view__empty">
          <span className="list-view__empty-icon">🚽</span>
          <p>No bathrooms found</p>
          <span>Try a different filter</span>
        </div>
      ) : (
        <>
          {nearby.length > 0 && (
            <div className="list-view__cards">
              {nearby.map((b) => (
                <BathroomCard
                  key={b.id}
                  bathroom={b}
                  distance={distanceTo(b)}
                  onOpen={() => setSelected(b)}
                />
              ))}
            </div>
          )}

          {further.length > 0 && (
            <>
              <div className="list-view__section-divider">
                <span>Further Away</span>
              </div>
              <div className="list-view__cards">
                {further.map((b) => (
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
  distance: string;
  onOpen: () => void;
}) {
  const { voteUp, flag } = useBathroomStore();
  const disableVotes = bathroom.hasVotedUp || bathroom.hasFlagged;

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
      </div>

      <div className="bathroom-card__rating">
        <StarRating rating={bathroom.rating} />
        <span className="bathroom-card__rating-value">{bathroom.rating.toFixed(1)}</span>
        <span className="bathroom-card__spacer" />
        <span className="bathroom-card__votes">{bathroom.upvoteCount} votes</span>
      </div>

      {bathroom.note && (
        <div className="bathroom-card__note">
          <span>📝</span>
          <span>{bathroom.note}</span>
        </div>
      )}

      <div className="bathroom-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`bathroom-card__vote ${bathroom.hasVotedUp ? "bathroom-card__vote--active" : ""}`}
          disabled={disableVotes}
          style={{ opacity: bathroom.hasFlagged ? 0.3 : 1 }}
          onClick={() => voteUp(bathroom.id)}
        >
          {bathroom.hasVotedUp ? "✓ Works!" : "It Works"}
        </button>
        <button
          type="button"
          className={`bathroom-card__flag ${bathroom.hasFlagged ? "bathroom-card__flag--active" : ""}`}
          disabled={disableVotes}
          style={{ opacity: bathroom.hasVotedUp ? 0.3 : 1 }}
          onClick={() => flag(bathroom.id)}
          aria-label="Flag stale"
        >
          🚩
        </button>
      </div>
    </div>
  );
}
