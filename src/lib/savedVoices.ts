import type { SavedVoice } from "@/types/voice";
import { SELECTED_VOICE_KEY, VOICES_STORAGE_KEY } from "@/types/voice";

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSavedVoices(): SavedVoice[] {
  if (typeof localStorage === "undefined") return [];
  return readJson<SavedVoice[]>(localStorage.getItem(VOICES_STORAGE_KEY), []);
}

export function saveVoice(voice: SavedVoice): void {
  const list = loadSavedVoices().filter((v) => v.id !== voice.id);
  list.push(voice);
  localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(list));
}

export function removeVoice(id: string): void {
  const list = loadSavedVoices().filter((v) => v.id !== id);
  localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(list));
  if (getSelectedVoiceId() === id) {
    localStorage.removeItem(SELECTED_VOICE_KEY);
  }
}

export function getSelectedVoiceId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SELECTED_VOICE_KEY);
}

export function setSelectedVoiceId(id: string | null): void {
  if (typeof localStorage === "undefined") return;
  if (id) localStorage.setItem(SELECTED_VOICE_KEY, id);
  else localStorage.removeItem(SELECTED_VOICE_KEY);
}

export function getSelectedVoice(): SavedVoice | null {
  const id = getSelectedVoiceId();
  if (!id) return null;
  return loadSavedVoices().find((v) => v.id === id) ?? null;
}
