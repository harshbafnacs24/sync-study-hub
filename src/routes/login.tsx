import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { GoogleButton } from "../components/auth/GoogleButton";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Sync & Study" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, loginEmail, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  async function onGoogle() {
    setError(null);
    try { await loginGoogle(); }
    catch (e: any) { setError(e?.message ?? "Google sign-in failed"); }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await loginEmail(email, password);
      navigate({ to: "/home" });
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 48px" }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div className="ss-display" style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>
            S&S
          </div>
          <div className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 6 }}>
            Sync & Study Hub
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-foreground)", marginBottom: 6 }}>
            Study smarter together
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Focus timer · Study rooms · AI companion
          </div>
        </div>

        {/* Google Sign In — PRIMARY */}
        <div style={{ width: "100%", marginBottom: 16 }}>
          <GoogleButton onSignIn={onGoogle} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ width: "100%", padding: "10px 14px", background: "rgba(255,69,69,0.1)", border: "1px solid rgba(255,69,69,0.25)", borderRadius: 8, fontSize: "0.82rem", color: "#ff4545", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, margin: "8px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>

        {/* Email toggle */}
        {!showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            className="btn-ghost"
            style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
          >
            Continue with email instead
          </button>
        ) : (
          <form onSubmit={onSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "11px 14px", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-foreground)", fontSize: "0.9rem", boxSizing: "border-box" }}
            />
            <input
              type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "11px 14px", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-foreground)", fontSize: "0.9rem", boxSizing: "border-box" }}
            />
            <button type="submit" disabled={submitting} className="ss-btn ss-btn-primary" style={{ width: "100%", padding: 12, justifyContent: "center" }}>
              {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Sign in"}
            </button>
            <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
              No account? <Link to="/signup" style={{ color: "var(--color-primary)" }}>Sign up</Link>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, fontSize: "0.72rem", color: "var(--color-muted-foreground)", textAlign: "center", lineHeight: 1.6 }}>
          By continuing you agree to our Terms of Service.<br />Your data is stored securely.
        </div>
      </div>
    </MobileShell>
  );
}
