import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "../../lib/api-client";
import { avatarsForGender, randomAvatarForGender, INTEREST_OPTIONS } from "../../lib/avatars";
import type { Gender, ProfileSetupInput } from "../../lib/types";
import { PageTransition } from "../../components/shell/PageTransition";

export const Route = createFileRoute("/_authenticated/profile-setup")({
  head: () => ({ meta: [{ title: "Profile Setup — Sync & Study" }] }),
  component: ProfileSetupPage,
});

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];

function ProfileSetupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
  });

  const [form, setForm] = useState<ProfileSetupInput>({
    name: "",
    school: "",
    branch: "",
    year: "Sophomore",
    bio: "",
    subjects: [],
    gender: "other",
    avatar: randomAvatarForGender("other"),
  });

  useEffect(() => {
    if (profileData?.profile?.profileCompleted) {
      navigate({ to: "/home" });
    } else if (profileData?.profile?.name) {
      setForm((f) => ({ ...f, name: profileData.profile.name }));
    }
  }, [profileData, navigate]);

  useEffect(() => {
    setForm((f) => ({ ...f, avatar: randomAvatarForGender(f.gender) }));
  }, [form.gender]);

  const setup = useMutation({
    mutationFn: (body: ProfileSetupInput) => api.setupProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile setup complete!");
      navigate({ to: "/home" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Setup failed"),
  });

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(interest)
        ? f.subjects.filter((s) => s !== interest)
        : [...f.subjects, interest],
    }));
  };

  const canSubmit =
    form.name.trim() &&
    form.school.trim() &&
    form.branch.trim() &&
    form.year &&
    form.bio.trim() &&
    form.subjects.length > 0 &&
    form.gender;

  const avatarOptions = avatarsForGender(form.gender);

  return (
    <PageTransition>
      <div className="ss-body" style={{ padding: "20px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
        <div className="ss-ph-label" style={{ marginBottom: 4 }}>Welcome</div>
        <h1 className="ss-display" style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 6 }}>Complete Your Profile</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
          Tell us about yourself so we can connect you with the right study partners.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Full Name *">
            <input className="ss-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
          </Field>

          <Field label="University *">
            <input className="ss-input" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="e.g. LMN Tech" />
          </Field>

          <Field label="Branch / Department *">
            <input className="ss-input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. Computer Science" />
          </Field>

          <Field label="Year of Study *">
            <select className="ss-input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>

          <Field label="Bio *">
            <textarea
              className="ss-input"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A short intro about you and your study goals"
              rows={3}
              style={{ resize: "vertical" }}
            />
          </Field>

          <Field label="Gender *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {([
                ["male", "Male"],
                ["female", "Female"],
                ["other", "Other"],
                ["prefer_not_to_say", "Prefer not to say"],
              ] as [Gender, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({ ...form, gender: val })}
                  className="ss-btn"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.78rem",
                    border: form.gender === val ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: form.gender === val ? "rgba(232,255,71,0.08)" : "var(--bg-2)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Choose Avatar">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm({ ...form, avatar: emoji })}
                  style={{
                    width: 44, height: 44, borderRadius: 12, fontSize: "1.4rem",
                    border: form.avatar === emoji ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: "var(--bg-2)", cursor: "pointer",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Interests * (select multiple)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", cursor: "pointer",
                    border: form.subjects.includes(interest) ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: form.subjects.includes(interest) ? "rgba(232,255,71,0.1)" : "var(--bg-2)",
                    color: form.subjects.includes(interest) ? "var(--color-primary)" : "var(--color-muted-foreground)",
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </Field>

          <button
            className="ss-btn ss-btn-primary"
            disabled={!canSubmit || setup.isPending}
            onClick={() => setup.mutate(form)}
            style={{ width: "100%", justifyContent: "center", padding: 14, marginTop: 8 }}
          >
            {setup.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Complete Setup & Continue"}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
