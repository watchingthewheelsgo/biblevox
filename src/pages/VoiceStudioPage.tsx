import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { base64ToBlob } from "@/lib/audioBase64";
import { loadSavedVoices, removeVoice, saveVoice, setSelectedVoiceId } from "@/lib/savedVoices";
import type { SavedVoice } from "@/types/voice";
import { HeadphonesIcon, ChevronRightIcon } from "@/components/Icons";

const LANGUAGES = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

function newId() {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function VoiceStudioPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Voice Studio</h1>
        </div>
        <p className="text-sm text-text-secondary">
          WaveSpeed Qwen3：用文字描述设计音色，或上传/录制短音频进行克隆。
        </p>
        {apiOk === false && (
          <p className="text-xs text-amber-500/90 mt-2 glass rounded-lg px-3 py-2 border border-amber-500/20">
            后端未配置 <code className="text-amber-400">WAVESPEED_API_KEY</code> 或未启动 API。
            请运行 <code className="text-amber-400">npm run dev</code>（会同时启动 Vite 与 API），并在项目根目录 <code className="text-amber-400">.env</code> 中设置密钥。
          </p>
        )}
        {apiOk === true && (
          <p className="text-xs text-emerald-500/80 mt-2">API 已连接 · WaveSpeed 密钥已配置</p>
        )}
      </header>

      <div className="flex gap-2 animate-fade-in-up delay-100">
        {(["design", "clone"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              tab === t
                ? "bg-accent text-bg-primary shadow-lg shadow-accent/20"
                : "glass text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "design" ? "Voice Design" : "Voice Clone"}
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
          已保存的音色
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8 glass rounded-xl">
            暂无保存的音色。创建后可前往阅读页选择使用。
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
                    {v.kind === "design" ? "Design" : "Clone"} · {v.language}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVoiceId(v.id);
                  }}
                  className="text-[11px] font-medium text-accent hover:text-accent-hover px-2 py-1"
                >
                  选用
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeVoice(v.id);
                    refresh();
                  }}
                  className="text-[11px] text-text-muted hover:text-red-400 px-2"
                >
                  删除
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
      if (!res.ok) throw new Error(data.error ?? "请求失败");
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
    alert("已保存。在阅读页可选择该音色朗读。");
  };

  return (
    <div className="space-y-5 glass rounded-2xl p-6 animate-fade-in-up delay-100">
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">音色名称</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：沉稳男声朗读"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">音色描述（Voice Design）</span>
        <textarea
          value={voiceDescription}
          onChange={(e) => setVoiceDescription(e.target.value)}
          rows={4}
          placeholder="例如：A calm, elderly British male narrator with warm, clear diction suitable for scripture."
          className="mt-1.5 w-full px-4 py-3 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">试听文案</span>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={2}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">语言</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
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
          {loading ? "生成中…" : "生成试听"}
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
        保存音色
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
      if (!res.ok) throw new Error(data.error ?? "上传失败");
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
      alert("请先上传参考音频（约 3–15 秒）");
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
      if (!res.ok) throw new Error(data.error ?? "请求失败");
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
      alert("请填写名称并上传参考音频");
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
    alert("已保存。在阅读页可选择该克隆音色朗读。");
  };

  return (
    <div className="space-y-5 glass rounded-2xl p-6 animate-fade-in-up delay-100">
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">音色名称</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：我的声音"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
        />
      </label>
      <div>
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">参考音频</span>
        <p className="text-[11px] text-text-muted mt-1 mb-2">
          上传 WAV / MP3 / WebM 等短片段（建议 5–30 秒）。将先上传到 WaveSpeed 再用于克隆。
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
          {uploading ? "上传中…" : file ? file.name : "选择文件"}
        </button>
        {referenceUrl && (
          <p className="text-[10px] text-emerald-500/70 mt-2 truncate break-all">参考音频已就绪</p>
        )}
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">参考文案（可选，与录音内容一致更佳）</span>
        <textarea
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
          rows={2}
          placeholder="若你朗读了某段固定文字，可在此填写，有助于对齐。"
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">试听文案（TTS 内容）</span>
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={2}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary focus:outline-none focus:border-accent/40 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">语言</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-bg-secondary/80 border border-border text-sm text-text-primary"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
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
          {loading ? "生成中…" : "生成试听"}
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
        保存克隆音色
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
