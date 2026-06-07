import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "../components/shell/MobileShell";
import { Sparkles, Users, Rocket, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Sync & Study" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <MobileShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#060606", overflow: "auto" }}>
        {/* Hero */}
        <div style={{
          padding: "48px 24px 32px",
          textAlign: "center",
          background: "radial-gradient(circle at 50% 30%, rgba(232,255,71,0.06) 0%, transparent 60%)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
            background: "rgba(232,255,71,0.08)", border: "1.5px solid rgba(232,255,71,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="ss-display" style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--color-primary)" }}>S&S</span>
          </div>
          <h1 className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Connect. Learn. Grow.
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", marginTop: 12, lineHeight: 1.6, maxWidth: 320, margin: "12px auto 0" }}>
            The ultimate student network for learning, collaboration, and career growth — built for engineering students.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
            <Link to="/signup" className="ss-btn ss-btn-primary" style={{ justifyContent: "center", padding: 14, fontSize: "0.88rem" }}>
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="ss-btn ss-btn-outline" style={{ justifyContent: "center", padding: 12, fontSize: "0.85rem" }}>
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ padding: "0 20px 40px" }}>
          <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
            Everything you need
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: Sparkles, title: "Sage AI Mentor", desc: "Engineering tutor with flashcards, quizzes, and interview prep", color: "#4361ee" },
              { icon: Users, title: "Friend Network", desc: "Find study partners by university, branch, and interests", color: "#06d6a0" },
              { icon: Rocket, title: "Tech & Career Feed", desc: "Hackathons, internships, jobs, and engineering news", color: "#ffb703" },
            ].map((f) => (
              <div key={f.title} className="ss-card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, flexShrink: 0 }}>
                  <f.icon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 3, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
