import { useCallback, useEffect, useState } from "react";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

function haversineMiles(a: Coordinate, b: Coordinate): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useLocation() {
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "granted" | "denied">("idle");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const distanceTo = useCallback(
    (coordinate: Coordinate): string => {
      if (!location) return "—";
      const miles = haversineMiles(location, coordinate);
      return `${miles.toFixed(1)} mi`;
    },
    [location],
  );

  return { location, status, requestLocation, distanceTo };
}
