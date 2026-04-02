import { v1beta1 } from "@google-cloud/text-to-speech";
import type { google } from "@google-cloud/text-to-speech/build/protos/protos";

/** voicex gemini_voices.yaml: Chirp3-HD-Algenib (male), Chirp3-HD-Gacrux (female) */
const VOICE_NAMES = {
  male: "Chirp3-HD-Algenib",
  female: "Chirp3-HD-Gacrux",
} as const;

export type GeminiReadingGender = keyof typeof VOICE_NAMES;

let client: v1beta1.TextToSpeechClient | null = null;

function getClient(): v1beta1.TextToSpeechClient {
  if (!client) {
    client = new v1beta1.TextToSpeechClient();
  }
  return client;
}

/** Best-effort hint for /api/health (ADC may work without these). */
export function isGeminiTtsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}

/**
 * Plain-text KJV verse → MP3 via Google Cloud Text-to-Speech (Chirp 3 HD).
 * Requires Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS.
 */
export async function synthesizeGeminiVerse(
  text: string,
  gender: GeminiReadingGender,
): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) {
    return Buffer.from([]);
  }

  const voiceSuffix = VOICE_NAMES[gender];
  const languageCode = "en-US";
  const tts = getClient();

  const request: google.cloud.texttospeech.v1beta1.ISynthesizeSpeechRequest = {
    input: { text: trimmed },
    voice: {
      languageCode,
      name: `${languageCode}-${voiceSuffix}`,
      modelName: "chirp3",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  };

  const [response] = await tts.synthesizeSpeech(request);
  if (!response.audioContent?.length) {
    throw new Error("No audio content from Google TTS");
  }
  return Buffer.from(response.audioContent as Uint8Array);
}
