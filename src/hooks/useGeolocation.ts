"use client";

import { useCallback, useRef, useState } from "react";

export type LocationCoords = { lat: number; lng: number };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 600000,
};

export function useGeolocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "loading">(
    "idle",
  );
  const requested = useRef(false);

  const request = useCallback(() => {
    if (requested.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    requested.current = true;
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      GEO_OPTIONS,
    );
  }, []);

  const supported =
    typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined";

  return { coords, status, supported, request };
}
