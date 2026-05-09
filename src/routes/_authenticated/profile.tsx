import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { api } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { ProfilePatch } from "../../lib/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Sync & Study" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
  });

  const [form, setForm] = useState<ProfilePatch>({});
  useEffect(() => {
    if (data?.profile) {
      setForm({
        name: data.profile.name,
        bio: data.profile.bio ?? "",
        school: data.profile.school ?? "",
        year: data.profile.year ?? "",
        subjects: data.profile.subjects ?? [],
        goals: data.profile.goals ?? "",
        timezone: data.profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (patch: ProfilePatch) => api.updateMyProfile(patch),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const subjectsValue = (form.subjects ?? []).join(", ");

  return (
    <>
      <div className="ss-ph">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ss-ph-label">Profile</div>
            <h1 className="ss-ph-title" style={{ fontSize: "1.4rem" }}>
              {isLoading ? "Loading…" : (form.name || user?.email)}
            </h1>
            <p className="ss-ph-sub">{user?.email}</p>
          </div>
          <button
            className="ss-btn ss-btn-danger"
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            style={{ padding: "8px 12px", fontSize: "0.8rem" }}
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>

      <form
        className="ss-body"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            ...form,
            subjects: subjectsValue
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
        }}
      >
        <Field label="Display name">
          <input className="ss-input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="School / University">
          <input className="ss-input" value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="e.g. IIT Bombay" />
        </Field>
        <Field label="Year">
          <input className="ss-input" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2nd year" />
        </Field>
        <Field label="Subjects (comma separated)">
          <input
            className="ss-input"
            value={subjectsValue}
            onChange={(e) => setForm({ ...form, subjects: e.target.value.split(",").map((s) => s.trim()) })}
            placeholder="Calculus, Physics, DSA"
          />
        </Field>
        <Field label="Bio">
          <textarea className="ss-textarea" value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A line about you" />
        </Field>
        <Field label="Study goals">
          <textarea className="ss-textarea" value={form.goals ?? ""} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="What are you working towards?" />
        </Field>
        <Field label="Timezone">
          <input className="ss-input" value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </Field>

        <button className="ss-btn ss-btn-primary" type="submit" disabled={mut.isPending} style={{ marginTop: 8 }}>
          {mut.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ss-field">
      <label className="ss-label">{label}</label>
      {children}
    </div>
  );
}
