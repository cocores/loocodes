import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { Coordinate } from "../hooks/useLocation";
import "./PinMap.css";

const pinIcon = divIcon({
  className: "pin-map__marker",
  html: "📍",
  iconSize: [28, 28],
  iconAnchor: [14, 26],
});

function ClickHandler({ onPick }: { onPick: (coordinate: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

interface PinMapProps {
  center: Coordinate;
  pin: Coordinate | null;
  onPick: (coordinate: Coordinate) => void;
}

export function PinMap({ center, pin, onPick }: PinMapProps) {
  return (
    <div className="pin-map">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "200px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {pin && <Marker position={[pin.latitude, pin.longitude]} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
