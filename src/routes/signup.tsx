import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { GoogleButton } from "../components/auth/GoogleButton";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Sync & Study" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { user, loading, signupEmail, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null); setSubmitting(true);
    try {
      await signupEmail(email, password, name.trim());
      toast.success("Welcome to Sync & Study");
      navigate({ to: "/profile-setup" });
    } catch (err: any) {
      setError(err?.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    try {
      await loginGoogle();
      navigate({ to: "/profile-setup" });
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    }
  }

  return (
    <MobileShell>
      <div style={{ padding: "48px 28px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="ss-display" style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.05 }}>
          Create<br />account
        </div>
        <p className="ss-mono" style={{ color: "var(--color-muted-foreground)", fontSize: "0.75rem", letterSpacing: "0.06em", marginTop: 6 }}>
          // join the focus
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ss-field">
            <label className="ss-label" htmlFor="name">Name</label>
            <input id="name" className="ss-input" type="text" placeholder="Your name"
              value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="ss-field">
            <label className="ss-label" htmlFor="email">Email</label>
            <input id="email" className="ss-input" type="email" placeholder="you@university.edu"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="ss-field">
            <label className="ss-label" htmlFor="pw">Password</label>
            <input id="pw" className="ss-input" type="password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          {error && <p className="ss-error">{error}</p>}
          <button className="ss-btn ss-btn-primary" type="submit" disabled={submitting} style={{ marginTop: 4 }}>
            {submitting ? "Creating…" : "Create account →"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </div>

        <GoogleButton onSignIn={onGoogle} />

        <p style={{ marginTop: "auto", textAlign: "center", fontSize: "0.85rem", color: "var(--color-muted-foreground)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </MobileShell>
  );
}
