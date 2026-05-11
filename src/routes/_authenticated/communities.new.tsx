import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useCreateCommunity } from "../../lib/hooks/use-messaging";

export const Route = createFileRoute("/_authenticated/communities/new")({
  head: () => ({ meta: [{ title: "Create Community — Sync & Study" }] }),
  component: NewCommunityPage,
});

const CATEGORIES = ["Engineering", "Interview Prep", "Research", "Accountability", "Competitive", "Exams", "College", "Other"];

function NewCommunityPage() {
  const nav = useNavigate();
  const create = useCreateCommunity();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
    const created = await create.mutateAsync({ name: name.trim(), description: description.trim(), category, tags });
    nav({ to: "/communities/$id", params: { id: created.id } });
  };

  return (
    <>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link to="/communities" className="ss-btn ss-btn-ghost" style={{ padding: 6 }}><ChevronLeft size={18} /></Link>
        <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>New community</span>
      </div>
      <div className="ss-body">
        <h1 className="ss-display" style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Create a community</h1>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.85rem", marginTop: 6 }}>
          Build a focused space for collaborative studying, accountability, and resource sharing.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          <div className="ss-field">
            <label className="ss-label">Name</label>
            <input className="ss-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GATE 2026 Aspirants" maxLength={60} required />
          </div>
          <div className="ss-field">
            <label className="ss-label">Description</label>
            <textarea className="ss-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community for?" maxLength={280} />
          </div>
          <div className="ss-field">
            <label className="ss-label">Category</label>
            <select className="ss-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="ss-field">
            <label className="ss-label">Tags (comma separated, up to 5)</label>
            <input className="ss-input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="DSA, Mocks, Daily" />
          </div>

          <div className="ss-card" style={{ background: "var(--bg-3)", fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
            We'll bootstrap your community with <strong style={{ color: "var(--color-foreground)" }}>#general</strong>, <strong style={{ color: "var(--color-foreground)" }}>#resources</strong>, <strong style={{ color: "var(--color-foreground)" }}>#daily-progress</strong>, and <strong style={{ color: "var(--color-foreground)" }}>#questions</strong>.
          </div>

          <button type="submit" className="ss-btn ss-btn-primary" disabled={create.isPending || !name.trim()} style={{ marginTop: 4 }}>
            {create.isPending ? "Creating…" : "Create community"}
          </button>
        </form>
      </div>
    </>
  );
}
