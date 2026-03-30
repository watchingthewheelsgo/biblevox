/**
 * BibleVox API — WaveSpeed Qwen3 TTS (voice design & clone).
 * Run: npm run dev:server  (set WAVESPEED_API_KEY in .env)
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  mapLanguageToQwen,
  uploadMediaToWaveSpeed,
  wavespeedVoiceClone,
  wavespeedVoiceDesign,
} from "./wavespeed-qwen3";

function requireApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) {
    throw new Error("WAVESPEED_API_KEY is not set");
  }
  return key;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5180", "http://127.0.0.1:5180"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    wavespeed: Boolean(process.env.WAVESPEED_API_KEY),
  }),
);

/** Upload reference audio → WaveSpeed-hosted URL (for voice clone) */
app.post("/api/voice/media/upload", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "Missing file" }, 400);
    }
    const f = file as File;
    const buf = Buffer.from(await f.arrayBuffer());
    const downloadUrl = await uploadMediaToWaveSpeed({
      apiKey,
      fileBuffer: buf,
      filename: f.name || "reference.webm",
      contentType: f.type || "application/octet-stream",
    });
    return c.json({ download_url: downloadUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** Short sample for voice design */
app.post("/api/voice/design/sample", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      voiceDescription: string;
      sampleText: string;
      language?: string;
    }>();
    const { voiceDescription, sampleText } = body;
    if (!voiceDescription?.trim() || !sampleText?.trim()) {
      return c.json({ error: "voiceDescription and sampleText required" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    const audio = await wavespeedVoiceDesign({
      apiKey,
      text: sampleText,
      voiceDescription,
      language: lang,
    });
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** Short sample for voice clone (reference must be WaveSpeed URL from /api/voice/media/upload) */
app.post("/api/voice/clone/sample", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      referenceAudioUrl: string;
      sampleText: string;
      language?: string;
      referenceText?: string;
    }>();
    const { referenceAudioUrl, sampleText } = body;
    if (!referenceAudioUrl?.trim() || !sampleText?.trim()) {
      return c.json({ error: "referenceAudioUrl and sampleText required" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    const audio = await wavespeedVoiceClone({
      apiKey,
      text: sampleText,
      audioUrl: referenceAudioUrl,
      language: lang,
      referenceText: body.referenceText,
    });
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** TTS for arbitrary text (reading) — design or clone mode */
app.post("/api/voice/tts", async (c) => {
  try {
    const apiKey = requireApiKey();
    const body = await c.req.json<{
      text: string;
      mode: "design" | "clone";
      voiceDescription?: string;
      referenceAudioUrl?: string;
      referenceText?: string;
      language?: string;
    }>();
    const { text, mode } = body;
    if (!text?.trim()) {
      return c.json({ error: "text required" }, 400);
    }
    if (text.length > 4000) {
      return c.json({ error: "text too long (max 4000 chars per request)" }, 400);
    }
    const lang = mapLanguageToQwen(body.language ?? "en-US");
    let audio: Buffer;
    if (mode === "clone") {
      const url = body.referenceAudioUrl;
      if (!url?.trim()) {
        return c.json({ error: "referenceAudioUrl required for clone mode" }, 400);
      }
      audio = await wavespeedVoiceClone({
        apiKey,
        text,
        audioUrl: url,
        language: lang,
        referenceText: body.referenceText,
      });
    } else {
      const desc = body.voiceDescription;
      if (!desc?.trim()) {
        return c.json({ error: "voiceDescription required for design mode" }, 400);
      }
      audio = await wavespeedVoiceDesign({
        apiKey,
        text,
        voiceDescription: desc,
        language: lang,
      });
    }
    return c.json({
      mime: "audio/mpeg",
      audioBase64: audio.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

const port = Number(process.env.PORT ?? 8787);
console.log(`BibleVox API listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
