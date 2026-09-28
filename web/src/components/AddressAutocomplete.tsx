import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../hooks/useLocation";
import "./AddressAutocomplete.css";

const MIN_QUERY_LENGTH = 3;
// Nominatim's usage policy caps the public instance at 1 request/second —
// this debounce keeps normal typing well under that without needing an API
// key. See web/README.md for tradeoffs vs. self-hosting for higher traffic.
const DEBOUNCE_MS = 500;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (coordinate: Coordinate, formattedAddress: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: AddressAutocompleteProps) {
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function fetchSuggestions(input: string) {
    if (input.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(input)}`;
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Address search failed (${res.status})`);
        return res.json() as Promise<NominatimResult[]>;
      })
      .then((results) => {
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlighted(-1);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    onChange(next);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(next), DEBOUNCE_MS);
  }

  function selectSuggestion(suggestion: NominatimResult) {
    setIsOpen(false);
    setSuggestions([]);
    onSelect(
      { latitude: Number.parseFloat(suggestion.lat), longitude: Number.parseFloat(suggestion.lon) },
      suggestion.display_name,
    );
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
      selectSuggestion(suggestions[highlighted]);
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
            <li key={s.place_id}>
              <button
                type="button"
                className={`address-autocomplete__option ${
                  i === highlighted ? "address-autocomplete__option--highlighted" : ""
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectSuggestion(s)}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="address-autocomplete__error">⚠ {error}</p>}
    </div>
  );
}
