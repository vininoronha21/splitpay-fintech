import { readString, removeKey, writeString } from "./storage.ts";
import { graphemes, trimInvisible } from "./text.ts";

/** The fake login (Business Rule 4): the name lives only in localStorage. */
const USER_NAME_KEY = "splitpay.name";

/** Longest accepted name, counted in visible characters (graphemes). */
export const USER_NAME_MAX = 40;

/** Saved name, or null when nobody has entered yet. */
export function readUserName(): string | null {
  const stored = readString(USER_NAME_KEY);
  const name = stored === null ? "" : trimInvisible(stored);
  return name ? name : null;
}

export function saveUserName(name: string): void {
  writeString(USER_NAME_KEY, trimInvisible(name));
}

/** "Sair": forgets the name, so every app route redirects to /entrar. */
export function clearUserName(): void {
  removeKey(USER_NAME_KEY);
}

/** pt-BR validation message for the name field, or null when it is valid. */
export function validateUserName(name: string): string | null {
  // A zero-width-only name trims to "", and a decomposed "é" counts once.
  const length = graphemes(trimInvisible(name)).length;
  if (length === 0) return "Informe seu nome.";
  if (length > USER_NAME_MAX) return `Use até ${USER_NAME_MAX} caracteres.`;
  return null;
}
