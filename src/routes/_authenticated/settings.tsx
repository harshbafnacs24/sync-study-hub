import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { PageHeader, Card, SectionHeader } from "../../components/ui-kit/Card";
import { useAuth } from "../../lib/auth-context";
import { THEMES, useTheme } from "../../lib/theme";
import { api } from "../../lib/api-client";
import { avatarsForGender } from "../../lib/avatars";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Sync & Study" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
  });

  const profile = profileData?.profile;
  const avatarOptions = avatarsForGender(profile?.gender ?? "other");

  const updateAvatar = useMutation({
    mutationFn: (avatar: string) => api.updateMyProfile({ avatar }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Avatar updated");
    },
    onError: () => toast.error("Failed to update avatar"),
  });

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" sub={user?.email} />
      <div className="ss-body">
        <SectionHeader eyebrow="Profile" title="Avatar" />
        <Card>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0" }}>
            {avatarOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => updateAvatar.mutate(emoji)}
                style={{
                  width: 48, height: 48, borderRadius: 12, fontSize: "1.5rem", cursor: "pointer",
                  border: profile?.avatar === emoji ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: "var(--bg-2)",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Card>

        <SectionHeader eyebrow="Account" title="Profile" />
        <Card>
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Display name" value={profile?.name ?? user?.name ?? "Set in Profile"} />
          <Row label="University" value={profile?.school ?? "—"} />
          <Row label="Branch" value={profile?.branch ?? "—"} />
        </Card>

        <SectionHeader eyebrow="Appearance" title="Theme Options" />
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10,
                  border: theme === t.id ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: "var(--bg-2)", cursor: "pointer", color: "var(--color-foreground)",
                  transition: "all 0.2s", width: "100%", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${t.primary}, ${t.bg})`,
                    border: "1px solid rgba(255,255,255,0.15)",
                  }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: theme === t.id ? 700 : 500 }}>{t.name}</span>
                </div>
                {theme === t.id && (
                  <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-primary)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        <button
          className="ss-btn ss-btn-danger"
          onClick={() => { logout(); navigate({ to: "/login" }); }}
          style={{ marginTop: 22, width: "100%" }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "var(--color-foreground)" }}>{value}</span>
    </div>
  );
}
