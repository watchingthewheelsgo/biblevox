/**
 * WaveSpeed AI Qwen3 TTS — voice-design & voice-clone.
 * Ported from voicex/server/tts/wavespeed-qwen3-client.ts
 * @see https://wavespeed.ai/docs/rest-api
 */

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";

const VOICE_DESIGN_MODEL = "wavespeed-ai/qwen3-tts/voice-design";
const VOICE_CLONE_MODEL = "wavespeed-ai/qwen3-tts/voice-clone";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 300_000;

type WavespeedApiEnvelope<T> = {
  code: number;
  message?: string;
  data?: T;
};

type SubmitData = {
  id: string;
  status?: string;
  urls?: { get?: string };
};

type PredictionData = {
  id: string;
  status: string;
  outputs?: string[];
  error?: string;
};

function assertOk<T>(
  json: WavespeedApiEnvelope<T>,
  context: string,
): asserts json is WavespeedApiEnvelope<T> & { code: 200; data: T } {
  if (json.code !== 200 || json.data === undefined) {
    throw new Error(
      `${context}: ${json.message ?? "unknown error"} (code ${json.code})`,
    );
  }
}

async function submitTask(
  apiKey: string,
  modelPath: string,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${WAVESPEED_API_BASE}/${modelPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as WavespeedApiEnvelope<SubmitData>;
  if (!res.ok) {
    throw new Error(
      `WaveSpeed submit HTTP ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  assertOk(json, "WaveSpeed submit");
  return json.data.id;
}

async function getPrediction(
  apiKey: string,
  taskId: string,
): Promise<PredictionData> {
  const res = await fetch(`${WAVESPEED_API_BASE}/predictions/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = (await res.json()) as WavespeedApiEnvelope<PredictionData>;
  if (!res.ok) {
    throw new Error(
      `WaveSpeed prediction HTTP ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  assertOk(json, "WaveSpeed get prediction");
  return json.data;
}

async function pollUntilComplete(
  apiKey: string,
  taskId: string,
): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const data = await getPrediction(apiKey, taskId);
    if (data.status === "completed") {
      const outs = data.outputs ?? [];
      if (outs.length === 0) {
        throw new Error("WaveSpeed: completed but no outputs");
      }
      return outs;
    }
    if (data.status === "failed") {
      throw new Error(data.error ?? "WaveSpeed task failed");
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("WaveSpeed: prediction timed out");
}

async function fetchAudioFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WaveSpeed output fetch failed: ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function wavespeedVoiceDesign(params: {
  apiKey: string;
  text: string;
  voiceDescription: string;
  language: string;
}): Promise<Buffer> {
  const { apiKey, text, voiceDescription, language } = params;
  const taskId = await submitTask(apiKey, VOICE_DESIGN_MODEL, {
    text,
    voice_description: voiceDescription,
    language,
  });
  const outputs = await pollUntilComplete(apiKey, taskId);
  return fetchAudioFromUrl(outputs[0]!);
}

export async function wavespeedVoiceClone(params: {
  apiKey: string;
  text: string;
  audioUrl: string;
  language: string;
  referenceText?: string;
}): Promise<Buffer> {
  const { apiKey, text, audioUrl, language, referenceText } = params;
  const body: Record<string, unknown> = {
    audio: audioUrl,
    text,
    language,
  };
  if (referenceText) body.reference_text = referenceText;
  const taskId = await submitTask(apiKey, VOICE_CLONE_MODEL, body);
  const outputs = await pollUntilComplete(apiKey, taskId);
  return fetchAudioFromUrl(outputs[0]!);
}

export async function uploadMediaToWaveSpeed(params: {
  apiKey: string;
  fileBuffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<string> {
  const { apiKey, fileBuffer, filename, contentType } = params;
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: contentType });
  form.append("file", blob, filename);

  const res = await fetch(`${WAVESPEED_API_BASE}/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = (await res.json()) as WavespeedApiEnvelope<{
    download_url: string;
  }>;
  if (!res.ok || json.code !== 200 || !json.data?.download_url) {
    throw new Error(
      `WaveSpeed media upload failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json.data.download_url;
}

export function mapLanguageToQwen(language: string): string {
  const mapping: Record<string, string> = {
    zh: "Chinese",
    "zh-CN": "Chinese",
    en: "English",
    "en-US": "English",
    ja: "Japanese",
    ko: "Korean",
    de: "German",
    fr: "French",
    ru: "Russian",
    pt: "Portuguese",
    es: "Spanish",
    it: "Italian",
  };
  return mapping[language] ?? "English";
}
