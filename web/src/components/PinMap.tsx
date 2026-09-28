import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Coordinate } from "../hooks/useLocation";
import "./PinMap.css";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const DROP_PIN_ICON = L.divIcon({
  className: "pin-map__pin",
  html: '<span class="pin-map__pin-badge">📍</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface PinMapProps {
  center: Coordinate;
  pin: Coordinate | null;
  onPick: (coordinate: Coordinate) => void;
}

export function PinMap({ center, pin, onPick }: PinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.latitude, center.longitude],
      zoom: 15,
    });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      onPickRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once, using center's initial value
  }, []);

  useEffect(() => {
    mapRef.current?.setView([center.latitude, center.longitude]);
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position: L.LatLngExpression = [pin.latitude, pin.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      markerRef.current = L.marker(position, { icon: DROP_PIN_ICON }).addTo(map);
    }
  }, [pin]);

  return (
    <div className="pin-map">
      <div ref={containerRef} className="pin-map__canvas" />
    </div>
  );
}
