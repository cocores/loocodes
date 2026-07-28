import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../hooks/useLocation";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMaps";
import "./AddressAutocomplete.css";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (coordinate: Coordinate, formattedAddress: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: AddressAutocompleteProps) {
  const placesRef = useRef<typeof google.maps.places | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) return;
    loadGoogleMaps()
      .then((maps) => {
        placesRef.current = maps.places;
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  function fetchSuggestions(input: string) {
    const places = placesRef.current;
    if (!places || input.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }
    places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionTokenRef.current,
    })
      .then((res) => {
        setSuggestions(res.suggestions);
        setIsOpen(res.suggestions.length > 0);
        setHighlighted(-1);
      })
      .catch((err: Error) => setError(err.message));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    onChange(next);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(next), DEBOUNCE_MS);
  }

  async function selectSuggestion(suggestion: google.maps.places.AutocompleteSuggestion) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;
    setIsOpen(false);
    setSuggestions([]);
    try {
      const { place } = await prediction.toPlace().fetchFields({ fields: ["location", "formattedAddress"] });
      if (place.location) {
        onSelect(
          { latitude: place.location.lat(), longitude: place.location.lng() },
          place.formattedAddress ?? prediction.text.text,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve address");
    } finally {
      sessionTokenRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      void selectSuggestion(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="address-autocomplete" ref={containerRef}>
      <input
        className="dark-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="address-autocomplete__list">
          {suggestions.map((s, i) => (
            <li key={s.placePrediction?.placeId ?? i}>
              <button
                type="button"
                className={`address-autocomplete__option ${
                  i === highlighted ? "address-autocomplete__option--highlighted" : ""
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => void selectSuggestion(s)}
              >
                {s.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isGoogleMapsConfigured() && (
        <p className="address-autocomplete__hint">
          Address predictions unavailable (no Google Maps API key configured).
        </p>
      )}
      {error && <p className="address-autocomplete__error">⚠ {error}</p>}
    </div>
  );
}
