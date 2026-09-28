import type { Coordinate } from "../hooks/useLocation";

// iPadOS reports as "MacIntel" in the UA/platform, so a touch check is
// needed to tell it apart from an actual Mac.
function isApplePlatform(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** A universal link that opens the device's native maps app with walking
 * directions to the given coordinate — Apple Maps on iOS/macOS, Google Maps
 * everywhere else (which also opens natively on Android). */
export function getWalkingDirectionsUrl(coordinate: Coordinate): string {
  const { latitude, longitude } = coordinate;
  if (isApplePlatform()) {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
}

export function openWalkingDirections(coordinate: Coordinate): void {
  window.open(getWalkingDirectionsUrl(coordinate), "_blank", "noopener,noreferrer");
}
