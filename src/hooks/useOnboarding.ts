"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nabatati-onboarded";

export function useOnboarding() {
  // `ready` guards the first render so the server HTML and the client's first
  // render are identical (reading localStorage during render would cause a
  // hydration mismatch). Everything is decided in an effect after mount.
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setDone(true);
      }
    } catch {
      // storage unavailable — onboarding runs every launch
    }
    setReady(true);
  }, []);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage unavailable — onboarding simply runs every launch
    }
    setDone(true);
  }, []);

  return { ready, done, complete };
}
