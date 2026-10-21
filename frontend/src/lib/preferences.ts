import { useSyncExternalStore } from "react";
import { readString, writeString } from "./storage.ts";

/** Theme options as shown in Configurações > Aparência. */
export type ThemePreference = "claro" | "escuro" | "automatico";

/** Values of `data-theme` on <html>, read by `styles/theme.css`. */
type DocumentTheme = "light" | "dark" | "auto";

const THEME_KEY = "splitpay.theme";
const HIDE_VALUES_KEY = "splitpay.hideValues";
const DEFAULT_THEME: ThemePreference = "claro";

// The inline script in index.html applies the same mapping before first paint.
const DOCUMENT_THEME: Record<ThemePreference, DocumentTheme> = {
  claro: "light",
  escuro: "dark",
  automatico: "auto",
};

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "claro" || value === "escuro" || value === "automatico";
}

interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Minimal observable value: every subscribed component re-renders on `set`. */
function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) {
        return;
      }
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const savedTheme = readString(THEME_KEY);
const themeStore = createStore<ThemePreference>(isThemePreference(savedTheme) ? savedTheme : DEFAULT_THEME);
const hideValuesStore = createStore<boolean>(readString(HIDE_VALUES_KEY) === "true");

export function getThemePreference(): ThemePreference {
  return themeStore.get();
}

/** Saves the theme and applies it to <html> at once. */
export function setThemePreference(next: ThemePreference): void {
  writeString(THEME_KEY, next);
  document.documentElement.dataset.theme = DOCUMENT_THEME[next];
  themeStore.set(next);
}

export function getHideValues(): boolean {
  return hideValuesStore.get();
}

export function setHideValues(next: boolean): void {
  writeString(HIDE_VALUES_KEY, String(next));
  hideValuesStore.set(next);
}

/** Current theme preference and its setter, shared by every component. */
export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get);
  return [theme, setThemePreference];
}

/** Whether amounts are masked, and its setter, shared by every component. */
export function useHideValues(): [boolean, (next: boolean) => void] {
  const hidden = useSyncExternalStore(hideValuesStore.subscribe, hideValuesStore.get);
  return [hidden, setHideValues];
}
