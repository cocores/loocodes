import { useEffect, useRef, useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { useLocation, type Coordinate } from "../hooks/useLocation";
import { BATHROOM_TYPES, type NewBathroom, type BathroomTypeId } from "../types";
import { FilterChip } from "../components/FilterChip";
import { FormField } from "../components/FormField";
import { PinMap } from "../components/PinMap";
import { AddressAutocomplete } from "../components/AddressAutocomplete";
import { CodeBadge } from "../components/Badges";
import { Switch } from "../components/Switch";
import { StarPicker } from "../components/StarPicker";
import { getUserId } from "../lib/anonymousUser";
import "./ShareView.css";

type InputMode = "gps" | "pin" | "address";

const DEFAULT_CENTER: Coordinate = { latitude: 40.758, longitude: -73.9855 };
const PUBLISH_STEPS = [
  "Verifying location",
  "Encrypting & uploading code",
  "Publishing to your area",
  "Notifying nearby users",
];

export function ShareView({ onViewList }: { onViewList: () => void }) {
  const { add } = useBathroomStore();
  const { location } = useLocation();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<BathroomTypeId>("cafe");
  const [isADA, setIsADA] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [feeAmount, setFeeAmount] = useState("");
  const [note, setNote] = useState("");
  const [cleanliness, setCleanliness] = useState(3);
  const [inputMode, setInputMode] = useState<InputMode>("gps");
  const [address, setAddress] = useState("");
  const [addressCoordinate, setAddressCoordinate] = useState<Coordinate | null>(null);
  const [droppedPin, setDroppedPin] = useState<Coordinate | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [newBathroom, setNewBathroom] = useState<NewBathroom | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const canShare = name.trim() !== "" && (code.trim() !== "" || (isFree && type === "publicRestroom"));

  const publishCode = () => {
    let coord: Coordinate;
    if (inputMode === "gps") coord = location ?? DEFAULT_CENTER;
    else if (inputMode === "pin") coord = droppedPin ?? DEFAULT_CENTER;
    else coord = addressCoordinate ?? DEFAULT_CENTER;

    const bathroom: NewBathroom = {
      name,
      address: address || "Shared location",
      code,
      type,
      isADAAccessible: isADA,
      isFree,
      feeAmount,
      note,
      latitude: coord.latitude,
      longitude: coord.longitude,
      submittedBy: getUserId(),
      rating: cleanliness,
    };

    setNewBathroom(bathroom);
    setPublishError(null);
    setIsPublishing(true);
    setPublishStep(0);

    PUBLISH_STEPS.forEach((_, i) => {
      const id = window.setTimeout(() => setPublishStep(i + 1), (i + 1) * 750);
      timers.current.push(id);
    });

    const finalId = window.setTimeout(async () => {
      try {
        await add(bathroom);
        setPublished(true);
        setName("");
        setCode("");
        setNote("");
        setAddress("");
        setAddressCoordinate(null);
        setIsFree(true);
        setIsADA(false);
        setDroppedPin(null);
        setFeeAmount("");
        setCleanliness(3);
      } catch (err) {
        setIsPublishing(false);
        setPublishError(err instanceof Error ? err.message : "Failed to publish code");
      }
    }, (PUBLISH_STEPS.length + 1) * 750);
    timers.current.push(finalId);
  };

  return (
    <div className="screen share-view">
      <header className="share-view__header">
        <h1>Share a Code</h1>
      </header>

      <div className="share-view__form">
        <FormField label="Place Name">
          <input
            className="dark-input"
            placeholder="e.g. Starbucks Reserve"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField label="Access Code">
          <input
            className="dark-input"
            placeholder="e.g. 1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>

        <FormField label="Type">
          <div className="share-view__chip-row">
            {BATHROOM_TYPES.map((t) => (
              <FilterChip
                key={t.id}
                label={`${t.emoji} ${t.label}`}
                isSelected={type === t.id}
                onClick={() => setType(t.id)}
              />
            ))}
          </div>
        </FormField>

        <FormField label="Entry">
          <div className="share-view__entry-toggle">
            <button
              type="button"
              className={`share-view__entry-btn ${isFree ? "share-view__entry-btn--free-active" : ""}`}
              onClick={() => setIsFree(true)}
            >
              🆓 Free
            </button>
            <button
              type="button"
              className={`share-view__entry-btn ${!isFree ? "share-view__entry-btn--paid-active" : ""}`}
              onClick={() => setIsFree(false)}
            >
              💰 Paid
            </button>
          </div>
          {!isFree && (
            <input
              className="dark-input"
              placeholder="Fee amount (e.g. $1.00)"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </FormField>

        <FormField label="Accessibility">
          <label className="share-view__toggle-row">
            <span>♿ ADA Accessible</span>
            <Switch checked={isADA} onChange={setIsADA} />
          </label>
        </FormField>

        <FormField label="Location">
          <div className="share-view__segmented">
            {(["gps", "pin", "address"] as InputMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`share-view__segment ${inputMode === m ? "share-view__segment--active" : ""}`}
                onClick={() => setInputMode(m)}
              >
                {m === "gps" ? "GPS" : m === "pin" ? "Drop Pin" : "Address"}
              </button>
            ))}
          </div>

          {inputMode === "gps" &&
            (location ? (
              <div className="share-view__gps-status share-view__gps-status--ok">
                📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </div>
            ) : (
              <div className="share-view__gps-status">📍 Acquiring GPS…</div>
            ))}

          {inputMode === "pin" && (
            <div className="share-view__pin">
              <PinMap center={location ?? DEFAULT_CENTER} pin={droppedPin} onPick={setDroppedPin} />
              <div className="share-view__gps-status">Tap the map to drop a pin</div>
              {droppedPin && (
                <div className="share-view__gps-status share-view__gps-status--pin">
                  📍 {droppedPin.latitude.toFixed(5)}, {droppedPin.longitude.toFixed(5)}
                </div>
              )}
            </div>
          )}

          {inputMode === "address" && (
            <>
              <AddressAutocomplete
                value={address}
                placeholder="Enter full address"
                onChange={(next) => {
                  setAddress(next);
                  setAddressCoordinate(null);
                }}
                onSelect={(coordinate, formattedAddress) => {
                  setAddress(formattedAddress);
                  setAddressCoordinate(coordinate);
                }}
              />
              {addressCoordinate && (
                <div className="share-view__gps-status share-view__gps-status--ok">
                  📍 {addressCoordinate.latitude.toFixed(5)}, {addressCoordinate.longitude.toFixed(5)}
                </div>
              )}
            </>
          )}
        </FormField>

        <FormField label="Cleanliness">
          <StarPicker value={cleanliness} onChange={setCleanliness} />
        </FormField>

        <FormField label="Notes (Optional)">
          <textarea
            className="dark-input"
            placeholder="Any extra tips…"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>

        <button
          type="button"
          className="share-view__submit"
          disabled={!canShare}
          onClick={publishCode}
        >
          Share Code
        </button>
        {publishError && <p className="share-view__error">⚠ {publishError}</p>}
      </div>

      {(isPublishing || published) && (
        <PublishOverlay
          steps={PUBLISH_STEPS}
          currentStep={publishStep}
          published={published}
          bathroom={newBathroom}
          onViewList={() => {
            setIsPublishing(false);
            setPublished(false);
            onViewList();
          }}
        />
      )}
    </div>
  );
}

function PublishOverlay({
  steps,
  currentStep,
  published,
  bathroom,
  onViewList,
}: {
  steps: string[];
  currentStep: number;
  published: boolean;
  bathroom: NewBathroom | null;
  onViewList: () => void;
}) {
  return (
    <div className="publish-overlay">
      <div className="publish-overlay__content">
        {published ? (
          <>
            <div className="publish-overlay__check">✓</div>
            <h2>Code Published! 🎉</h2>
            {bathroom && (
              <div className="publish-overlay__summary">
                <div className="publish-overlay__summary-name">{bathroom.name}</div>
                <CodeBadge code={bathroom.code} isFreeNoCode={bathroom.isFree && !bathroom.code} />
              </div>
            )}
            <button type="button" className="publish-overlay__button" onClick={onViewList}>
              📋 View in List
            </button>
          </>
        ) : (
          <>
            <div className="publish-overlay__spinner" />
            <div className="publish-overlay__steps">
              {steps.map((step, i) => (
                <div key={step} className="publish-overlay__step">
                  <span
                    className={`publish-overlay__step-icon ${
                      i < currentStep
                        ? "publish-overlay__step-icon--done"
                        : i === currentStep
                          ? "publish-overlay__step-icon--active"
                          : ""
                    }`}
                  >
                    {i < currentStep ? "✓" : i === currentStep ? "" : ""}
                  </span>
                  <span
                    className={
                      i < currentStep
                        ? "publish-overlay__step-text--done"
                        : i === currentStep
                          ? "publish-overlay__step-text--active"
                          : "publish-overlay__step-text"
                    }
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
