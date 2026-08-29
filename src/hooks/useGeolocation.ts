"use client";

import { useEffect, useState } from "react";

export type LocationCoords = { lat: number; lng: number };

export function useGeolocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  const supported =
    typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined";

  return { coords, status, supported };
}
