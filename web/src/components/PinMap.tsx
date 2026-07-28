import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../hooks/useLocation";
import { loadGoogleMaps } from "../lib/googleMaps";
import "./PinMap.css";

interface PinMapProps {
  center: Coordinate;
  pin: Coordinate | null;
  onPick: (coordinate: Coordinate) => void;
}

export function PinMap({ center, pin, onPick }: PinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onPickRef.current({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
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
    if (mapRef.current) mapRef.current.setCenter({ lat: center.latitude, lng: center.longitude });
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!pin) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    const position = { lat: pin.latitude, lng: pin.longitude };
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new google.maps.Marker({ map: mapRef.current, position });
    }
  }, [pin]);

  return (
    <div className="pin-map">
      <div ref={containerRef} className="pin-map__canvas" />
      {error && <div className="pin-map__message">📍 {error}</div>}
      {!ready && !error && <div className="pin-map__message">Loading map…</div>}
    </div>
  );
}
