import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Whether the browser reports a connection (spec 014). Only a hint: a reachable
 * network with the API down still reads as online, and the cards show their own errors.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
