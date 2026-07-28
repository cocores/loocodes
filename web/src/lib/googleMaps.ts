import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let optionsSet = false;
let loadPromise: Promise<typeof google.maps> | null = null;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(API_KEY);
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!API_KEY) {
    return Promise.reject(
      new Error(
        "No Google Maps API key configured. Set VITE_GOOGLE_MAPS_API_KEY (see web/README.md).",
      ),
    );
  }
  if (!optionsSet) {
    setOptions({ key: API_KEY });
    optionsSet = true;
  }
  if (!loadPromise) {
    loadPromise = Promise.all([importLibrary("maps"), importLibrary("marker")]).then(
      () => google.maps,
    );
  }
  return loadPromise;
}
