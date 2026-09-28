"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "nabatati-onboarded";
const CHANGE_EVENT = "nabatati:onboarding";

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // storage unavailable — onboarding runs every launch
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CHANGE_EVENT, onStoreChange);
}

const getServerSnapshot = () => false;

export function useOnboarding() {
  // localStorage is an external store, so it is read through
  // useSyncExternalStore rather than a mount effect: the server (and the
  // first client render) sees `false` and React swaps in the real value once
  // hydration completes, which keeps server and client markup identical
  // without a cascading setState-in-effect.
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    getServerSnapshot,
  );
  const done = useSyncExternalStore(subscribe, readOnboarded, getServerSnapshot);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage unavailable — onboarding simply runs every launch
    }
    // localStorage emits no events of its own, so tell the store to re-read.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ready, done, complete };
}
