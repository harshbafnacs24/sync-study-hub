import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, TrendingUp } from "lucide-react";
import { PageHeader, SectionHeader, EmptyState } from "../../components/ui-kit/Card";
import { CommunityCard } from "../../components/messaging/CommunityCard";
import { useCommunities, useToggleJoin } from "../../lib/hooks/use-messaging";

export const Route = createFileRoute("/_authenticated/communities")({
  head: () => ({ meta: [{ title: "Explore Communities — Sync & Study" }] }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const { data: list = [] } = useCommunities();
  const join = useToggleJoin();

  const categories = useMemo(() => {
    const s = new Set<string>(list.map((c) => c.category));
    return ["All", ...Array.from(s)];
  }, [list]);

  const filtered = list.filter((c) => {
    if (cat !== "All" && c.category !== cat) return false;
    if (q && !`${c.name} ${c.description} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const trending = filtered.filter((c) => c.trending);
  const recommended = filtered.filter((c) => c.recommended && !c.joined);
  const rest = filtered.filter((c) => !c.trending && !(c.recommended && !c.joined));

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Communities"
        sub="Find your study circle"
        right={
          <Link to="/communities/new" className="ss-btn ss-btn-primary" style={{ padding: "8px 12px", fontSize: "0.78rem" }}>
            <Plus size={14} /> Create
          </Link>
        }
      />
      <div className="ss-body" style={{ padding: 16 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", top: 12, left: 12, color: "var(--color-muted-foreground)" }} />
          <input
            className="ss-input"
            placeholder="Search by subject, tag, or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0 4px", scrollbarWidth: "none" }}>
          {categories.map((c) => {
            const shortNames: Record<string, string> = {
              "All": "All",
              "Interview Prep": "Prep",
              "Engineering": "Dev",
              "Research": "Research",
              "Accountability": "Focus",
              "Competitive": "CP",
              "Exams": "Exams"
            };
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`ss-chip ${cat === c ? "ss-chip-accent" : ""}`}
                style={{ flexShrink: 0, cursor: "pointer", border: 0 }}
              >
                {shortNames[c] || c}
              </button>
            );
          })}
        </div>

        {trending.length > 0 && (
          <>
            <SectionHeader eyebrow="Right now" title="Trending" action={<TrendingUp size={14} style={{ color: "var(--color-primary)" }} />} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trending.map((c) => (
                <CommunityCardWrapper key={c.id} c={c} onJoin={() => join.mutate(c.id)} />
              ))}
            </div>
          </>
        )}

        {recommended.length > 0 && (
          <>
            <SectionHeader eyebrow="For you" title="Recommended" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommended.map((c) => (
                <CommunityCardWrapper key={c.id} c={c} onJoin={() => join.mutate(c.id)} />
              ))}
            </div>
          </>
        )}

        {rest.length > 0 && (
          <>
            <SectionHeader eyebrow="Browse" title="All communities" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rest.map((c) => (
                <CommunityCardWrapper key={c.id} c={c} onJoin={() => join.mutate(c.id)} />
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && <div style={{ marginTop: 20 }}><EmptyState title="No matches" description="Try a different category or search term." /></div>}
      </div>
    </>
  );
}

function CommunityCardWrapper({ c, onJoin }: { c: any; onJoin: () => void }) {
  return (
    <Link to="/communities/$id" params={{ id: c.id }} style={{ textDecoration: "none", color: "inherit" }}>
      <CommunityCard
        community={c}
        action={
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin(); }}
            className={`ss-btn ${c.joined ? "ss-btn-outline" : "ss-btn-primary"}`}
            style={{ padding: "5px 10px", fontSize: "0.7rem", flexShrink: 0 }}
          >
            {c.joined ? "Joined" : "Join"}
          </button>
        }
      />
    </Link>
  );
}
