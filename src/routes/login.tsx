import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Sync & Study" }] }),
  component: LoginPage,
});

// ─── Terms & Conditions Modal ─────────────────────────────────────────────────

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "flex-end",
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

const AVATAR_COLORS = [
  "linear-gradient(135deg,#E8FF47,#c6e600)",
  "linear-gradient(135deg,#4a9eff,#2575ff)",
  "linear-gradient(135deg,#aa66ff,#7722ee)",
  "linear-gradient(135deg,#3ddc84,#00aa55)",
  "linear-gradient(135deg,#ff6b6b,#ee2244)",
  "linear-gradient(135deg,#ffb347,#ff7700)",
];
function avatarGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function LoginPage() {
  const { user, loading, loginEmail, loginGoogle, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("sas.demo_users");
      if (raw) {
        setDemoUsers(JSON.parse(raw));
      } else {
        const SEED_USERS = [
          { id: "dev-user", initials: "DU", name: "Dev User", handle: "dev_user", avatar: "🧑‍🎓" },
          { id: "aanya_id", initials: "AM", name: "Aanya Mehta", handle: "aanya_mehta", avatar: "👩‍🎓" },
          { id: "kabir_id", initials: "KS", name: "Kabir Singh", handle: "kabir_singh", avatar: "👨‍🎓" },
          { id: "riya_id", initials: "RS", name: "Riya Sharma", handle: "riya_sharma", avatar: "👩‍🏫" },
          { id: "arjun_id", initials: "AV", name: "Arjun Verma", handle: "arjun_verma", avatar: "👨‍💻" },
          { id: "meera_id", initials: "MI", name: "Meera Iyer", handle: "meera_iyer", avatar: "👩‍💻" },
        ];
        setDemoUsers(SEED_USERS);
      }
    }
  }, [user]);

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
      {/* Premium Embedded Styles */}
      <style>{`
        .login-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          background-color: #060606;
          overflow: hidden;
          height: 100%;
        }

        .login-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(232, 255, 71, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232, 255, 71, 0.012) 1px, transparent 1px);
          background-size: 50px 50px;
          background-position: center;
          pointer-events: none;
        }

        .login-glow-1 {
          position: absolute;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, rgba(232, 255, 71, 0.045) 0%, transparent 70%);
          filter: blur(40px);
          pointer-events: none;
          animation: float-glow-1 14s ease-in-out infinite;
        }

        .login-glow-2 {
          position: absolute;
          bottom: 25%;
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          height: 250px;
          background: radial-gradient(circle, rgba(232, 255, 71, 0.02) 0%, transparent 70%);
          filter: blur(35px);
          pointer-events: none;
          animation: float-glow-2 18s ease-in-out infinite;
        }

        @keyframes float-glow-1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-45%, -52%) scale(1.08); }
        }

        @keyframes float-glow-2 {
          0%, 100% { transform: translateX(-50%) translate(0, 0) scale(1); }
          50% { transform: translateX(-50%) translate(15px, -15px) scale(1.05); }
        }

        .orbit-container {
          position: absolute;
          top: -90px;
          left: -90px;
          width: 360px;
          height: 360px;
          pointer-events: none;
        }

        .orbit-circle-1 {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(232, 255, 71, 0.04);
          border-radius: 50%;
        }

        .orbit-circle-2 {
          position: absolute;
          inset: 50px;
          border: 1px solid rgba(232, 255, 71, 0.025);
          border-radius: 50%;
        }

        .orbit-circle-3 {
          position: absolute;
          inset: 100px;
          border: 1px solid rgba(232, 255, 71, 0.015);
          border-radius: 50%;
          animation: rotate-orbit 34s linear infinite;
        }

        .orbit-dot {
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          background-color: var(--color-primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--color-primary);
        }

        @keyframes rotate-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .mountains-container {
          position: absolute;
          bottom: 30%;
          left: 0;
          right: 0;
          height: 120px;
          pointer-events: none;
          opacity: 0.9;
        }

        .auth-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 14px;
        }

        .auth-card {
          background: rgba(18, 18, 18, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-card:hover {
          background: rgba(28, 28, 28, 0.85);
          border-color: rgba(232, 255, 71, 0.22);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .auth-card-title {
          font-size: 0.68rem;
          color: #777;
          font-weight: 500;
          letter-spacing: 0.03em;
          font-family: var(--font-body);
        }

        .auth-card:hover .auth-card-title {
          color: #fff;
        }

        .email-transition-container {
          animation: slide-up-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slide-up-fade {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .demo-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(232, 255, 71, 0.3) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
      `}</style>

      <div className="login-container">
        {/* Background Grid and Glowing Spots */}
        <div className="login-grid" />
        <div className="login-glow-1" />
        <div className="login-glow-2" />

        {/* Orbit Lines Decoration */}
        <div className="orbit-container">
          <div className="orbit-circle-1" />
          <div className="orbit-circle-2" />
          <div className="orbit-circle-3">
            <div className="orbit-dot" />
          </div>
        </div>

        {/* Ambient Mountain Lines Decoration */}
        <div className="mountains-container">
          <svg viewBox="0 0 400 120" fill="none" style={{ width: "100%", height: "100%" }}>
            <path d="M0 80 Q100 50, 200 80 T400 60 L400 120 L0 120 Z" fill="url(#mountain-grad-1)" opacity="0.3" />
            <path d="M0 95 Q120 75, 240 100 T400 85 L400 120 L0 120 Z" fill="url(#mountain-grad-2)" opacity="0.15" />
            
            <path d="M0 80 Q100 50, 200 80 T400 60" stroke="rgba(232, 255, 71, 0.35)" strokeWidth="1" />
            <path d="M0 95 Q120 75, 240 100 T400 85" stroke="rgba(232, 255, 71, 0.22)" strokeWidth="1" />
            <path d="M0 105 Q150 90, 280 110 T400 98" stroke="rgba(232, 255, 71, 0.1)" strokeWidth="0.8" />
            
            <defs>
              <linearGradient id="mountain-grad-1" x1="200" y1="50" x2="200" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e8ff47" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mountain-grad-2" x1="200" y1="75" x2="200" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e8ff47" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#e8ff47" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── Branding Section (Upper 2/3) ── */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          paddingTop: 40,
          zIndex: 10
        }}>
          {/* Logo container with dot */}
          <div style={{ marginBottom: 28, position: "relative" }}>
            <div style={{
              width: 76, height: 76, borderRadius: 22,
              background: "rgba(10, 10, 10, 0.8)",
              border: "1.5px solid rgba(232, 255, 71, 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(232, 255, 71, 0.04)"
            }}>
              <span className="ss-display" style={{ 
                fontSize: "1.7rem", 
                fontWeight: 900, 
                color: "var(--color-primary)", 
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-display)"
              }}>S&amp;S</span>
            </div>
            {/* Glowing corner dot */}
            <div style={{ 
              position: "absolute", top: -3, right: -3, 
              width: 14, height: 14, borderRadius: "50%", 
              background: "var(--color-primary)",
              boxShadow: "0 0 12px var(--color-primary), 0 0 4px var(--color-primary)" 
            }} />
          </div>

          {/* Branding labels */}
          <div style={{ textAlign: "center" }}>
            <h1 className="ss-display" style={{ 
              fontSize: "1.18rem", 
              fontWeight: 800, 
              color: "#ffffff", 
              letterSpacing: "0.26em", 
              lineHeight: 1, 
              marginBottom: 10,
              textIndent: "0.26em", // adjust spacing center bias
              textTransform: "uppercase",
              fontFamily: "var(--font-display)"
            }}>
              Sync<span style={{ color: "var(--color-primary)" }}>&</span>Study
            </h1>
            <p className="ss-mono" style={{ 
              fontSize: "0.78rem", 
              color: "#6c6c6c", 
              letterSpacing: "0.02em",
              fontFamily: "var(--font-mono)"
            }}>
              Focus. Collaborate. <span style={{ color: "var(--color-primary)" }}>Achieve.</span>
            </p>
          </div>
        </div>

        {/* ── Login Actions Section (Lower 1/3) ── */}
        <div style={{ 
          padding: "0 28px 48px", 
          zIndex: 10,
          background: "linear-gradient(to top, #060606 70%, transparent)"
        }}>
          {error && (
            <div style={{
              marginBottom: 14, padding: "10px 14px",
              background: "rgba(255,69,69,0.06)", border: "1px solid rgba(255,69,69,0.15)",
              borderRadius: 10, fontSize: "0.8rem", color: "#ff6b6b",
              textAlign: "center", fontFamily: "var(--font-body)"
            }}>{error}</div>
          )}

          {!showEmail ? (
            /* Standard Auth Landing Panel */
            <div>
              {/* Primary Email CTA */}
              <button 
                onClick={() => setShowEmail(true)} 
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 14,
                  background: "var(--color-primary)", border: "none",
                  color: "#060606", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontFamily: "var(--font-body)",
                  boxShadow: "0 4px 20px rgba(232, 255, 71, 0.2)",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Mail Icon SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                
                <span>Continue with Email</span>
                
                {/* ArrowRight SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>

              {/* Quick Login Accounts Grid */}
              {demoUsers.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 12, textAlign: "center", fontWeight: 700 }}>
                    Quick Sign-In (Demo Mode)
                  </div>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(3, 1fr)", 
                    gap: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    padding: "2px 0",
                    marginBottom: 8
                  }}>
                    {demoUsers.map((du) => {
                      const isEmoji = du.avatar && !(du.avatar.startsWith("http") || du.avatar.startsWith("/") || du.avatar.startsWith("data:"));
                      return (
                        <button
                          key={du.id}
                          onClick={() => {
                            loginDemo(du.id);
                            navigate({ to: "/home" });
                          }}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 12,
                            padding: "10px 4px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          className="demo-account-chip"
                        >
                          {/* Avatar Circle */}
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: isEmoji ? "1.1rem" : "0.78rem", color: isEmoji ? "inherit" : "#0c0c0c"
                          }}>
                            {isEmoji ? du.avatar : (du.initials || du.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2))}
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: "600", color: "#f0f0f0", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {du.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separator Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0 20px" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>

              {/* Secondary Auth Grid */}
              <div className="auth-grid">
                {/* Google Card */}
                <div className="auth-card" onClick={onGoogle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.9-4.53-5.75-4.53z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span className="auth-card-title">Google</span>
                </div>

                {/* GitHub Card */}
                <div className="auth-card" onClick={() => toast.info("GitHub login is coming soon!")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#eee" }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span className="auth-card-title">GitHub</span>
                </div>

                {/* Discord Card */}
                <div className="auth-card" onClick={() => toast.info("Discord login is coming soon!")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#eee" }}>
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                  </svg>
                  <span className="auth-card-title">Discord</span>
                </div>
              </div>
            </div>
          ) : (
            /* Email Login Input Panel */
            <div className="email-transition-container">
              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                  style={{ 
                    width: "100%", padding: "14px 16px", 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid rgba(255,255,255,0.06)", 
                    borderRadius: 12, color: "#fff", fontSize: "0.88rem", 
                    boxSizing: "border-box", outline: "none",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 0.2s"
                  }} 
                  className="login-input"
                />
                
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                  style={{ 
                    width: "100%", padding: "14px 16px", 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid rgba(255,255,255,0.06)", 
                    borderRadius: 12, color: "#fff", fontSize: "0.88rem", 
                    boxSizing: "border-box", outline: "none",
                    fontFamily: "var(--font-body)"
                  }} 
                  className="login-input"
                />

                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="ss-btn ss-btn-primary" 
                  style={{ 
                    width: "100%", padding: 13, justifyContent: "center", borderRadius: 12,
                    fontSize: "0.88rem", marginTop: 4
                  }}
                >
                  {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Sign In"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEmail(false)} 
                    style={{
                      background: "none", border: "none", color: "#666", 
                      fontSize: "0.78rem", cursor: "pointer", padding: "4px 0",
                      fontFamily: "var(--font-body)", textDecoration: "underline"
                    }}
                  >
                    Back to options
                  </button>

                  <div style={{ fontSize: "0.78rem", color: "#555", fontFamily: "var(--font-body)" }}>
                    No account? <Link to="/signup" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: "600" }}>Sign up</Link>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Premium Footer Consent Section */}
          <div style={{ 
            marginTop: 32, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 6,
            fontSize: "0.68rem", 
            color: "#555", 
            lineHeight: 1.5,
            textAlign: "center"
          }}>
            {/* ShieldCheck Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary)", flexShrink: 0 }}>
              <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>

            <span>
              By continuing, you agree to our{" "}
              <button 
                onClick={() => setShowTerms(true)} 
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#777", textDecoration: "underline", fontSize: "0.68rem",
                  fontFamily: "var(--font-body)", padding: 0, fontWeight: "500"
                }}
              >
                Terms & Conditions
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* T&C Modal */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </MobileShell>
  );
}
