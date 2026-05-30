import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { GoogleButton } from "../components/auth/GoogleButton";
import { Loader2, X, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Sync & Study" }] }),
  component: LoginPage,
});

// ─── Terms & Conditions Modal ─────────────────────────────────────────────────

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxHeight: "85vh", background: "#141414",
        borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Handle */}
        <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px" }}>
          <div>
            <div className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", color: "#F0F0F0" }}>Terms & Conditions</div>
            <div className="ss-mono" style={{ fontSize: "0.6rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Last updated May 2026</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 32px", fontSize: "0.84rem", color: "#aaa", lineHeight: 1.7 }}>
          {[
            { title: "1. Acceptance", body: "By accessing Sync & Study Hub, you agree to be bound by these Terms. If you disagree with any part, you may not access the service." },
            { title: "2. Use of the Service", body: "Sync & Study Hub is intended for educational and collaborative study purposes. You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others." },
            { title: "3. User Accounts", body: "You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account." },
            { title: "4. Study Rooms & Content", body: "When creating study rooms, you are responsible for any external links (e.g. Google Meet, Zoom) you share. We do not host or control external video call services." },
            { title: "5. AI Companion (Sage)", body: "Sage is an AI assistant powered by Google Gemini. Responses are AI-generated and may not always be accurate. Do not rely solely on Sage for critical academic decisions." },
            { title: "6. Privacy", body: "We collect your name, email address, and study activity data to provide the service. We do not sell your personal data to third parties. Study session data is used only to personalize your experience." },
            { title: "7. Data Storage", body: "Your data is stored securely on MongoDB Atlas servers. You may request deletion of your account and associated data at any time by contacting us." },
            { title: "8. Prohibited Conduct", body: "You may not use the platform to harass, abuse, or harm others. You may not attempt to gain unauthorized access to any part of the service or its systems." },
            { title: "9. Intellectual Property", body: "The Sync & Study Hub name, logo, and interface are proprietary. You may not reproduce or distribute any part of the platform without written permission." },
            { title: "10. Limitation of Liability", body: "Sync & Study Hub is provided 'as is' without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service." },
            { title: "11. Changes to Terms", body: "We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms." },
            { title: "12. Contact", body: "If you have any questions about these Terms, please contact us through the app's feedback feature or reach out to the development team." },
          ].map((section, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: "#F0F0F0", marginBottom: 4, fontSize: "0.88rem" }}>{section.title}</div>
              <div>{section.body}</div>
            </div>
          ))}
        </div>
        {/* Accept button */}
        <div style={{ padding: "12px 20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="ss-btn ss-btn-primary" style={{ width: "100%", padding: 12, justifyContent: "center", fontSize: "0.9rem" }}>
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const { user, loading, loginEmail, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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
    try { await loginEmail(email, password); navigate({ to: "/home" }); }
    catch (e: any) { setError(e?.message ?? "Login failed"); }
    finally { setSubmitting(false); }
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px" }}>

        {/* ── Top spacer + branding ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 8 }}>

          {/* Logo mark */}
          <div style={{ marginBottom: 28, position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "rgba(200,255,0,0.08)",
              border: "1px solid rgba(200,255,0,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div className="ss-display" style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--color-primary)", letterSpacing: "-0.04em" }}>S</div>
            </div>
            <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--color-primary)" }} />
          </div>

          {/* Headline */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div className="ss-display" style={{ fontSize: "1.75rem", fontWeight: 900, color: "#F0F0F0", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 10 }}>
              Study smarter,<br />together.
            </div>
            <div style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.6 }}>
              Focus sessions · Study rooms · AI companion
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, marginBottom: 32, flexWrap: "wrap", justifyContent: "center" }}>
            {["⚡ Pomodoro Timer", "🏠 Study Rooms", "✨ Sage AI", "📊 Analytics"].map(f => (
              <span key={f} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#888", fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* ── Auth section ── */}
        <div style={{ paddingBottom: 32 }}>

          {/* Google Sign In */}
          <GoogleButton onSignIn={onGoogle} />

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "rgba(255,69,69,0.08)", border: "1px solid rgba(255,69,69,0.2)",
              borderRadius: 8, fontSize: "0.82rem", color: "#ff6b6b",
            }}>{error}</div>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Email toggle */}
          {!showEmail ? (
            <button onClick={() => setShowEmail(true)} style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#666", fontSize: "0.85rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "var(--font-sans)",
            }}>
              <span>Continue with email</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#F0F0F0", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#F0F0F0", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} />
              <button type="submit" disabled={submitting} className="ss-btn ss-btn-primary" style={{ width: "100%", padding: 12, justifyContent: "center" }}>
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Sign in"}
              </button>
              <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#555" }}>
                No account? <Link to="/signup" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Sign up free</Link>
              </div>
            </form>
          )}

          {/* Terms */}
          <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.72rem", color: "#444", lineHeight: 1.7 }}>
            By continuing, you agree to our{" "}
            <button onClick={() => setShowTerms(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#666", textDecoration: "underline", fontSize: "0.72rem",
              fontFamily: "var(--font-sans)", padding: 0,
            }}>
              Terms & Conditions
            </button>
          </div>
        </div>
      </div>

      {/* T&C Modal */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </MobileShell>
  );
}
