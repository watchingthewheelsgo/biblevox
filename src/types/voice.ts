export type SavedVoice = {
  id: string;
  name: string;
  kind: "design" | "clone";
  /** Voice design: natural-language description (WaveSpeed voice-design) */
  voiceDescription?: string;
  /** Voice clone: URL from WaveSpeed media upload (same as voicex referenceAudioUrl) */
  referenceAudioUrl?: string;
  /** Optional: transcript of reference clip for better clone quality */
  referenceText?: string;
  language: string;
  createdAt: number;
};

export const VOICES_STORAGE_KEY = "biblevox-saved-voices";
export const SELECTED_VOICE_KEY = "biblevox-selected-voice-id";
