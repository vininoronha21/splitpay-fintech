import { readString, removeKey, writeString } from "./storage.ts";

/** The fake login (Business Rule 4): the name lives only in localStorage. */
const USER_NAME_KEY = "splitpay.name";

/** Longest accepted name, counted in visible characters (code points). */
export const USER_NAME_MAX = 40;

/** Saved name, or null when nobody has entered yet. */
export function readUserName(): string | null {
  const name = readString(USER_NAME_KEY)?.trim();
  return name ? name : null;
}

export function saveUserName(name: string): void {
  writeString(USER_NAME_KEY, name.trim());
}

/** "Sair": forgets the name, so every app route redirects to /entrar. */
export function clearUserName(): void {
  removeKey(USER_NAME_KEY);
}

/** pt-BR validation message for the name field, or null when it is valid. */
export function validateUserName(name: string): string | null {
  // Array.from counts code points, so an emoji or accented letter counts once.
  const length = Array.from(name.trim()).length;
  if (length === 0) return "Informe seu nome.";
  if (length > USER_NAME_MAX) return `Use até ${USER_NAME_MAX} caracteres.`;
  return null;
}
