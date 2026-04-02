import { useState } from "react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const token = searchParams.get("verifyToken");
    if (!token) return;
    setLoading(true);
    fetch("/api/auth/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { error?: string };
        if (!r.ok) throw new Error(data.error || "Verify failed");
        setInfo("Email verified successfully. You can now access first 5 chapters.");
        searchParams.delete("verifyToken");
        setSearchParams(searchParams, { replace: true });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [searchParams, setSearchParams]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        const res = await authClient.signUp.email({
          name: name.trim() || email.split("@")[0] || "User",
          email: email.trim(),
          password,
        });
        if (res.error) throw new Error(res.error.message || "Sign up failed");
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) throw new Error(res.error.message || "Sign in failed");
      }
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 pt-16">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold">BibleVox Account</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`px-3 py-2 rounded-lg text-sm ${mode === "sign-in" ? "bg-accent text-bg-primary" : "bg-bg-secondary text-text-secondary"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`px-3 py-2 rounded-lg text-sm ${mode === "sign-up" ? "bg-accent text-bg-primary" : "bg-bg-secondary text-text-secondary"}`}
          >
            Sign Up
          </button>
        </div>
        {mode === "sign-up" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-emerald-400">{info}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading || !email || !password}
          className="w-full py-2.5 rounded-lg bg-accent text-bg-primary font-semibold disabled:opacity-40"
        >
          {loading ? "Please wait..." : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
        <p className="text-xs text-text-muted">
          Unverified users can read first 2 chapters. Verified users can read 5 chapters.
        </p>
        {session?.user && !session.user.emailVerified && (
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                credentials: "include",
              });
              if (res.ok) setInfo("Verification email sent.");
            }}
            className="w-full py-2 rounded-lg bg-bg-secondary text-text-secondary text-sm"
          >
            Resend verification email
          </button>
        )}
      </div>
    </div>
  );
}
