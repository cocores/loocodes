import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../hooks/useLocation";
import { loadGoogleMaps } from "../lib/googleMaps";
import { bathroomType, type Bathroom } from "../types";
import "./BathroomsMap.css";

const DEFAULT_CENTER = { lat: 40.758, lng: -73.9855 };

interface BathroomsMapProps {
  bathrooms: Bathroom[];
  userLocation: Coordinate | null;
  onSelect: (bathroom: Bathroom) => void;
}

export function BathroomsMap({ bathrooms, userLocation, onSelect }: BathroomsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = bathrooms.map((b) => {
      const marker = new google.maps.Marker({
        position: { lat: b.latitude, lng: b.longitude },
        map,
        title: b.name,
        label: { text: bathroomType(b.type).emoji, fontSize: "16px" },
      });
      marker.addListener("click", () => onSelectRef.current(b));
      return marker;
    });

    const pointCount = bathrooms.length + (userLocation ? 1 : 0);
    if (pointCount === 0) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(13);
    } else if (pointCount === 1) {
      const only = userLocation ?? { latitude: bathrooms[0].latitude, longitude: bathrooms[0].longitude };
      map.setCenter({ lat: only.latitude, lng: only.longitude });
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      bathrooms.forEach((b) => bounds.extend({ lat: b.latitude, lng: b.longitude }));
      if (userLocation) bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.fitBounds(bounds, 48);
    }
  }, [bathrooms, userLocation, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      return;
    }
    const position = { lat: userLocation.latitude, lng: userLocation.longitude };
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position,
        map,
        title: "You",
        zIndex: 999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#5b9ef5",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }
  }, [userLocation, ready]);

  return (
    <div className="bathrooms-map">
      <div ref={containerRef} className="bathrooms-map__canvas" />
      {error && <div className="bathrooms-map__message">📍 {error}</div>}
      {!ready && !error && <div className="bathrooms-map__message">Loading map…</div>}
      {ready && !error && bathrooms.length === 0 && (
        <div className="bathrooms-map__empty">No locations match the current filters.</div>
      )}
    </div>
  );
}
