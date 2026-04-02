export type GeminiVoiceGender = "male" | "female";

const KEY = "biblevox.geminiVoiceGender";

export const GEMINI_VOICE_LABELS: Record<
  GeminiVoiceGender,
  { name: string; technical: string }
> = {
  male: { name: "Algenib", technical: "Chirp3-HD-Algenib" },
  female: { name: "Gacrux", technical: "Chirp3-HD-Gacrux" },
};

export function getGeminiVoiceGender(): GeminiVoiceGender {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "female" || v === "male") return v;
  } catch {
    /* ignore */
  }
  return "male";
}

export function setGeminiVoiceGender(g: GeminiVoiceGender) {
  try {
    localStorage.setItem(KEY, g);
  } catch {
    /* ignore */
  }
}
