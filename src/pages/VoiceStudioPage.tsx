import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { base64ToBlob } from "@/lib/audioBase64";
import { loadSavedVoices, removeVoice, saveVoice, setSelectedVoiceId } from "@/lib/savedVoices";
import type { SavedVoice } from "@/types/voice";
import { HeadphonesIcon, ChevronRightIcon } from "@/components/Icons";
import { useI18n } from "@/i18n/provider";

const LANGUAGES = [
  { value: "en-US", key: "lang.en" },
  { value: "zh-CN", key: "lang.zh" },
  { value: "ja", key: "lang.ja" },
  { value: "es", key: "lang.es" },
];

function newId() {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function VoiceStudioPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"design" | "clone">("design");
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<SavedVoice[]>(() => loadSavedVoices());

  const refresh = useCallback(() => setSaved(loadSavedVoices()), []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { ok?: boolean; wavespeed?: boolean }) => setApiOk(Boolean(d.wavespeed)))
      .catch(() => setApiOk(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-8 space-y-8">
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <HeadphonesIcon className="w-6 h-6 text-accent/60" />
          <h1 className="text-2xl font-bold tracking-tight">{t("voice.title")}</h1>
        </div>
        <p className="text-sm text-text-secondary">
          {t("voice.subtitle")}
        </p>
        {apiOk === false && (
          <p className="text-xs text-amber-500/90 mt-2 glass rounded-lg px-3 py-2 border border-amber-500/20">
            {t("voice.apiNotReady")}
          </p>
        )}
        {apiOk === true && (
          <p className="text-xs text-emerald-500/80 mt-2">{t("voice.apiReady")}</p>
        )}
      </header>

      <div className="flex gap-2 animate-fade-in-up delay-100">
        {(["design", "clone"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              tab === tabKey
                ? "bg-accent text-bg-primary shadow-lg shadow-accent/20"
                : "glass text-text-secondary hover:text-text-primary"
            }`}
          >
            {tabKey === "design" ? t("voice.designTab") : t("voice.cloneTab")}
          </button>
        ))}
      </div>

      {tab === "design" ? (
        <VoiceDesignPanel onSaved={refresh} apiOk={apiOk} />
      ) : (
        <VoiceClonePanel onSaved={refresh} apiOk={apiOk} />
      )}

      <section className="animate-fade-in-up delay-200">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-3">
          {t("voice.saved")}
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8 glass rounded-xl">
            {t("voice.emptySaved")}
          </p>
        ) : (
          <ul className="space-y-2">
            {saved.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 glass rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{v.name}</p>
                  <p className="text-[11px] text-text-muted">
                    {v.kind === "design" ? t("voice.kind.design") : t("voice.kind.clone")} · {v.language}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVoiceId(v.id);
                  }}
                  className="text-[11px] font-medium text-accent hover:text-accent-hover px-2 py-1"
                >
                  {t("voice.use")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeVoice(v.id);
                    refresh();
                  }}
                  className="text-[11px] text-text-muted hover:text-red-400 px-2"
                >
                  {t("voice.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VoiceDesignPanel({
  onSaved,
  apiOk,
}: {
  onSaved: () => void;
  apiOk: boolean | null;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [sampleText, setSampleText] = useState(
    "In the beginning God created the heaven and the earth.",
  );
  const [language, setLanguage] = useState("en-US");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generatePreview = async () => {
    if (!voiceDescription.trim() || !sampleText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/voice/design/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceDescription, sampleText, language }),
      });
      const data = (await res.json()) as { error?: string; audioBase64?: string; mime?: string };
      if (!res.ok) throw new Error(data.error ?? t("voice.toast.requestFailed"));
      if (data.audioBase64) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const blob = base64ToBlob(data.audioBase64, data.mime ?? "audio/mpeg");
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !voiceDescription.trim()) return;
    const v: SavedVoice = {
      id: newId(),
      name: name.trim(),
      kind: "design",
      voiceDescription: voiceDescription.trim(),
      language,
      createdAt: Date.now(),
    };
    saveVoice(v);
    setSelectedVoiceId(v.id);
    onSaved();
    alert(t("voice.toast.savedDesign"));
  };

  return (
    <div className="space-y-5 glass rounded-2xl p-6 animate-fade-in-up delay-100">
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.name")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("voice.form.namePlaceholderDesign")}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.designDescription")}</span>
        <textarea
          value={voiceDescription}
          onChange={(e) => setVoiceDescription(e.target.value)}
          rows={4}
          placeholder={t("voice.form.designDescriptionPlaceholder")}
          className="mt-1.5 w-full px-4 py-3 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.sampleText")}</span>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={2}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.language")}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{t(l.key)}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || apiOk === false}
          onClick={generatePreview}
          className="px-4 py-2.5 rounded-xl bg-bg-elevated text-text-primary text-sm font-medium border border-border hover:border-accent/30 disabled:opacity-40"
        >
          {loading ? t("voice.form.generating") : t("voice.form.generatePreview")}
        </button>
        {previewUrl && (
          <audio ref={audioRef} src={previewUrl} controls className="h-10 flex-1 min-w-[200px]" />
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim() || !voiceDescription.trim()}
        className="w-full py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
      >
        {t("voice.form.saveDesign")}
      </button>
    </div>
  );
}

function VoiceClonePanel({
  onSaved,
  apiOk,
}: {
  onSaved: () => void;
  apiOk: boolean | null;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [sampleText, setSampleText] = useState(
    "Hello, this is my cloned voice reading the Holy Bible.",
  );
  const [referenceText, setReferenceText] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [file, setFile] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadReference = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/voice/media/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { download_url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("voice.toast.uploadFailed"));
      if (data.download_url) setReferenceUrl(data.download_url);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      void uploadReference(f);
    }
  };

  const generatePreview = async () => {
    if (!referenceUrl || !sampleText.trim()) {
      alert(t("voice.toast.needReference"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/voice/clone/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceAudioUrl: referenceUrl,
          sampleText,
          language,
          referenceText: referenceText.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; audioBase64?: string; mime?: string };
      if (!res.ok) throw new Error(data.error ?? t("voice.toast.requestFailed"));
      if (data.audioBase64) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const blob = base64ToBlob(data.audioBase64, data.mime ?? "audio/mpeg");
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !referenceUrl) {
      alert(t("voice.toast.needNameAndReference"));
      return;
    }
    const v: SavedVoice = {
      id: newId(),
      name: name.trim(),
      kind: "clone",
      referenceAudioUrl: referenceUrl,
      referenceText: referenceText.trim() || undefined,
      language,
      createdAt: Date.now(),
    };
    saveVoice(v);
    setSelectedVoiceId(v.id);
    onSaved();
    alert(t("voice.toast.savedClone"));
  };

  return (
    <div className="space-y-5 glass rounded-2xl p-6 animate-fade-in-up delay-100">
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.name")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("voice.form.namePlaceholderClone")}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
        />
      </label>
      <div>
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.referenceAudio")}</span>
        <p className="text-[11px] text-text-muted mt-1 mb-2">
          {t("voice.form.referenceAudioHint")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || apiOk === false}
          className="px-4 py-2.5 rounded-xl bg-bg-elevated text-sm border border-border hover:border-accent/30 disabled:opacity-40"
        >
          {uploading ? t("voice.form.uploading") : file ? file.name : t("voice.form.selectFile")}
        </button>
        {referenceUrl && (
          <p className="text-[10px] text-emerald-500/70 mt-2 truncate break-all">{t("voice.form.referenceReady")}</p>
        )}
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.referenceText")}</span>
        <textarea
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
          rows={2}
          placeholder={t("voice.form.referenceTextPlaceholder")}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.sampleTextClone")}</span>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={2}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t("voice.form.language")}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{t(l.key)}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={loading || apiOk === false}
          onClick={generatePreview}
          className="px-4 py-2.5 rounded-xl bg-bg-elevated text-text-primary text-sm font-medium border border-border hover:border-accent/30 disabled:opacity-40"
        >
          {loading ? t("voice.form.generating") : t("voice.form.generatePreview")}
        </button>
        {previewUrl && (
          <audio src={previewUrl} controls className="h-10 flex-1 min-w-[200px]" />
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim() || !referenceUrl}
        className="w-full py-3 rounded-xl bg-accent text-bg-primary font-semibold text-sm hover:bg-accent-hover disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {t("voice.form.saveClone")}
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
