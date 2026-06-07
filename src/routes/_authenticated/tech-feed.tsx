import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, ExternalLink, Heart, Rocket, Briefcase, Newspaper, Trophy, GraduationCap } from "lucide-react";
import { PageTransition } from "../../components/shell/PageTransition";
import { useTechFeed, useToggleTechLike, useToggleTechBookmark } from "../../lib/hooks/use-tech-feed";
import type { TechFeedItem } from "../../lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tech-feed")({
  head: () => ({ meta: [{ title: "Tech Feed — Sync & Study" }] }),
  component: TechFeedPage,
});

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "hackathon", label: "Hackathons" },
  { id: "internship", label: "Internships" },
  { id: "job", label: "Jobs" },
  { id: "news", label: "News" },
  { id: "competition", label: "Competitions" },
  { id: "scholarship", label: "Scholarships" },
];

const CATEGORY_FILTERS = [
  { id: "all", label: "All Topics" },
  { id: "ai", label: "AI" },
  { id: "programming", label: "Programming" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "data_science", label: "Data Science" },
  { id: "cloud", label: "Cloud" },
  { id: "research", label: "Research" },
];

const TYPE_ICONS: Record<string, any> = {
  hackathon: Rocket,
  internship: Briefcase,
  job: Briefcase,
  news: Newspaper,
  competition: Trophy,
  scholarship: GraduationCap,
};

function TechFeedPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const { data: items = [], isLoading } = useTechFeed(typeFilter === "all" ? undefined : typeFilter, catFilter === "all" ? undefined : catFilter);
  const toggleLike = useToggleTechLike();
  const toggleBookmark = useToggleTechBookmark();

  return (
    <PageTransition>
      <div className="ss-ph">
        <div className="ss-ph-label">Career & Tech</div>
        <h1 className="ss-ph-title" style={{ fontSize: "1.3rem" }}>Tech Feed</h1>
        <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 4 }}>
          Hackathons, internships, jobs, and engineering news
        </p>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 4 }} className="hide-scrollbar">
          {TYPE_FILTERS.map((f) => (
            <FilterChip key={f.id} active={typeFilter === f.id} onClick={() => setTypeFilter(f.id)} label={f.label} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }} className="hide-scrollbar">
          {CATEGORY_FILTERS.map((f) => (
            <FilterChip key={f.id} active={catFilter === f.id} onClick={() => setCatFilter(f.id)} label={f.label} small />
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Loading opportunities…</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No items match your filters.</div>
        ) : (
          items.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onLike={() => toggleLike.mutate(item.id)}
              onBookmark={() => {
                toggleBookmark.mutate(item.id, {
                  onSuccess: () => toast.success(item.bookmarked ? "Removed bookmark" : "Saved for later"),
                });
              }}
            />
          ))
        )}
      </div>
    </PageTransition>
  );
}

function FilterChip({ active, onClick, label, small }: { active: boolean; onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "4px 10px" : "6px 12px",
        borderRadius: 999,
        fontSize: small ? "0.68rem" : "0.72rem",
        fontWeight: active ? 700 : 500,
        border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: active ? "rgba(232,255,71,0.1)" : "var(--bg-2)",
        color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function FeedCard({ item, onLike, onBookmark }: { item: TechFeedItem; onLike: () => void; onBookmark: () => void }) {
  const Icon = TYPE_ICONS[item.type] ?? Newspaper;
  const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);

  return (
    <div className="ss-card" style={{ padding: 14, marginBottom: 12, border: item.featured ? "1px solid rgba(232,255,71,0.25)" : undefined }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span className="ss-mono" style={{ fontSize: "0.58rem", color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{typeLabel}</span>
            {item.featured && <span style={{ fontSize: "0.58rem", color: "#ffb703" }}>★ Featured</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: 4, lineHeight: 1.3 }}>{item.title}</div>
          {item.company && <div style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>{item.company}{item.location ? ` · ${item.location}` : ""}</div>}
        </div>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "10px 0" }}>{item.summary}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {item.prizePool && <Tag text={`🏆 ${item.prizePool}`} />}
        {item.deadline && <Tag text={`⏰ ${new Date(item.deadline).toLocaleDateString()}`} />}
        {item.eligibility && <Tag text={item.eligibility.slice(0, 40)} />}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
        <button onClick={onLike} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: item.liked ? "#ff4d6d" : "var(--color-muted-foreground)", fontSize: "0.75rem" }}>
          <Heart size={14} fill={item.liked ? "#ff4d6d" : "none"} /> {item.likeCount}
        </button>
        <button onClick={onBookmark} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: item.bookmarked ? "var(--color-primary)" : "var(--color-muted-foreground)", fontSize: "0.75rem" }}>
          <Bookmark size={14} fill={item.bookmarked ? "var(--color-primary)" : "none"} /> Save
        </button>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--color-primary)", fontSize: "0.72rem", textDecoration: "none" }}>
            Open <ExternalLink size={12} />
          </a>
        )}
        <Link to="/sage" search={{ prompt: `Tell me more about: ${item.title}` }} style={{ fontSize: "0.72rem", color: "var(--color-primary)", textDecoration: "none" }}>
          Ask Sage
        </Link>
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", background: "var(--bg-3)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }}>
      {text}
    </span>
  );
}
