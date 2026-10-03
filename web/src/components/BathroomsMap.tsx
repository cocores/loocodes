import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { Coordinate } from "../hooks/useLocation";
import { bathroomType, type Bathroom } from "../types";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./BathroomsMap.css";

const DEFAULT_CENTER: L.LatLngExpression = [40.758, -73.9855];
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const USER_ICON = L.divIcon({
  className: "bathrooms-map__user-pin",
  html: '<span class="bathrooms-map__user-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: "bathrooms-map__pin",
    html: `<span class="bathrooms-map__pin-badge">${emoji}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Matches the app's dark theme instead of the library's default
// light/yellow circles — see BathroomsMap.css's .bathrooms-map__cluster.
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: "bathrooms-map__cluster",
    html: `<span class="bathrooms-map__cluster-badge">${count}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

interface BathroomsMapProps {
  bathrooms: Bathroom[];
  userLocation: Coordinate | null;
  onSelect: (bathroom: Bathroom) => void;
  /** Overrides the default full-tab height, e.g. for a smaller inline embed. */
  height?: string;
  /** Tapping empty map area (not a pin) reports the coordinate here, e.g.
   * to start adding a new listing at that spot. Omit to disable. */
  onMapClick?: (coordinate: Coordinate) => void;
}

export function BathroomsMap({ bathrooms, userLocation, onSelect, height, onMapClick }: BathroomsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
    });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      // Marker clicks don't bubble up to the map's own click event (Leaflet
      // markers don't bubble mouse events by default), so this only fires
      // for taps on empty map area.
      onMapClickRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    // Without clustering, a dense area (a busy downtown with dozens of
    // listings a block apart) renders its pins stacked directly on top of
    // each other — a tap then resolves to whichever one happens to be on
    // top in the DOM, not the one the user meant. Clustering keeps pins far
    // enough apart to always be unambiguous: it groups nearby markers into
    // a single tappable badge that expands as you zoom in or tap it, and
    // spiderfies markers that share the exact same coordinate once zoomed
    // all the way in, so even an exact duplicate location stays tappable.
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
    });
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;
    setReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();
    const markers = bathrooms.map((b) => {
      const marker = L.marker([b.latitude, b.longitude], {
        icon: emojiIcon(bathroomType(b.type).emoji),
        title: b.name,
      });
      marker.on("click", () => onSelectRef.current(b));
      return marker;
    });
    clusterGroup.addLayers(markers);

    const points: L.LatLngExpression[] = bathrooms.map((b) => [b.latitude, b.longitude]);
    if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 13);
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
    }
  }, [bathrooms, userLocation, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const position: L.LatLngExpression = [userLocation.latitude, userLocation.longitude];
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(position);
    } else {
      userMarkerRef.current = L.marker(position, {
        icon: USER_ICON,
        zIndexOffset: 1000,
        title: "You",
      }).addTo(map);
    }
  }, [userLocation, ready]);

  return (
    <div className="bathrooms-map" style={height ? { height, margin: 0 } : undefined}>
      <div ref={containerRef} className="bathrooms-map__canvas" />
      {onMapClick && ready && (
        <div className="bathrooms-map__hint">Tap an empty spot to add a bathroom there</div>
      )}
      {ready && bathrooms.length === 0 && (
        <div className="bathrooms-map__empty">No locations match the current filters.</div>
      )}
    </div>
  );
}
