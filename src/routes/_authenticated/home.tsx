import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "../../components/shell/PageTransition";
import {
  Bell, ChevronRight, MessageSquare, Sparkles, Users, Timer,
  Rocket, BookOpen, Trophy, TrendingUp, Target, Bookmark,
} from "lucide-react";
import { Card, SectionHeader, StatTile } from "../../components/ui-kit/Card";
import { useAuth } from "../../lib/auth-context";
import { useTasks, useAnalytics, useActiveSession, useProfile } from "../../lib/hooks/use-data";
import { useConnections } from "../../lib/hooks/use-network";
import { useConversations, useUnreadNotifications } from "../../lib/hooks/use-messaging";
import { usePlatformStats, useTrending, useTechBookmarks } from "../../lib/hooks/use-tech-feed";
import { useFeedPosts } from "../../lib/hooks/use-posts";
import { computeAchievements, getDailyGoal, getSageSessionCount } from "../../lib/achievements";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Sync & Study" }] }),
  component: HomePage,
});

const FEATURES = [
  { icon: Sparkles, label: "Sage AI Mentor", desc: "Engineering tutor with 7 learning modes", to: "/sage", color: "#4361ee" },
  { icon: Users, label: "Friend Network", desc: "Connect with study partners", to: "/discover", color: "#06d6a0" },
  { icon: MessageSquare, label: "Real-Time Chat", desc: "Message friends instantly", to: "/messages", color: "#f72585" },
  { icon: Rocket, label: "Tech Feed", desc: "Hackathons, jobs & internships", to: "/tech-feed", color: "#ffb703" },
  { icon: BookOpen, label: "Study Groups", desc: "Join learning communities", to: "/communities", color: "#7209b7" },
  { icon: Timer, label: "Focus Timer", desc: "Pomodoro study sessions", to: "/focus", color: "#ff4d6d" },
];

function HomePage() {
  const { user } = useAuth();
  const profile = useProfile();
  const analytics = useAnalytics();
  const tasks = useTasks();
  const active = useActiveSession();
  const connections = useConnections();
  const conversations = useConversations();
  const { data: unreadCount = 0 } = useUnreadNotifications();
  const { data: platformStats } = usePlatformStats();
  const { data: trending } = useTrending();
  const { data: bookmarks = [] } = useTechBookmarks();
  const { data: posts = [] } = useFeedPosts();

  const displayName = profile.data?.profile?.name || user?.name || "Student";
  const a = analytics.data;
  const friendCount = (connections.data ?? []).filter((c) => c.status === "accepted").length;
  const unreadMsgs = (conversations.data ?? []).reduce((n, c) => n + (c.unread ?? 0), 0);
  const dailyGoal = getDailyGoal();
  const achievements = computeAchievements({
    streakDays: a?.streakDays ?? 0,
    weeklyFocusMinutes: a?.weeklyFocusMinutes ?? 0,
    sageTurns: getSageSessionCount(),
    friendCount,
    postsCount: posts.length,
  });
  const unlocked = achievements.filter((x) => x.unlocked);

  return (
    <PageTransition>
      {/* Hero */}
      <div style={{
        padding: "24px 16px 20px",
        background: "linear-gradient(160deg, rgba(232,255,71,0.08) 0%, transparent 60%)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div className="ss-ph-label">Connect. Learn. Grow.</div>
            <h1 className="ss-display" style={{ fontSize: "1.35rem", fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>
              Hey, {displayName.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 6, lineHeight: 1.4 }}>
              Your student network for learning, collaboration, and career growth.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Link to="/messages" className="ss-btn ss-btn-outline" style={{ width: 36, height: 36, padding: 0, borderRadius: 999, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={15} />
              {unreadMsgs > 0 && <Badge count={unreadMsgs} />}
            </Link>
            <Link to="/notifications" className="ss-btn ss-btn-outline" style={{ width: 36, height: 36, padding: 0, borderRadius: 999, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={15} />
              {unreadCount > 0 && <Badge count={unreadCount} />}
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/sage" className="ss-btn ss-btn-primary" style={{ padding: "8px 14px", fontSize: "0.78rem" }}>
            <Sparkles size={14} /> Talk to Sage
          </Link>
          <Link to="/discover" className="ss-btn ss-btn-outline" style={{ padding: "8px 14px", fontSize: "0.78rem" }}>
            Explore Community
          </Link>
          <Link to="/tech-feed" className="ss-btn ss-btn-outline" style={{ padding: "8px 14px", fontSize: "0.78rem" }}>
            <Rocket size={14} /> Tech Feed
          </Link>
        </div>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>
        {/* Personal dashboard */}
        <SectionHeader eyebrow="Today" title="Your Dashboard" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <StatTile label="Focus streak" value={`${a?.streakDays ?? 0}d`} accent />
          <StatTile label="Today focus" value={`${a?.todayFocusMinutes ?? 0}m`} accent />
          <StatTile label="Learning goal" value={`${dailyGoal.done}/${dailyGoal.target}m`} />
          <StatTile label="Friends" value={friendCount} />
        </div>

        {active.data && (
          <Card style={{ marginBottom: 12, borderColor: "var(--color-primary)" }}>
            <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-primary)", textTransform: "uppercase" }}>Active session</div>
            <Link to="/focus" style={{ color: "inherit", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <span style={{ fontWeight: 700 }}>{active.data.kind === "focus" ? "Focus block" : "Break"} in progress</span>
              <ChevronRight size={16} />
            </Link>
          </Card>
        )}

        {/* Platform stats */}
        {platformStats && (
          <>
            <SectionHeader eyebrow="Community" title="Live Stats" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
              {[
                { v: platformStats.studentsRegistered, l: "Students" },
                { v: platformStats.universitiesConnected, l: "Universities" },
                { v: platformStats.friendConnections, l: "Connections" },
              ].map((s) => (
                <div key={s.l} className="ss-card" style={{ padding: 10, textAlign: "center" }}>
                  <div className="ss-display" style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-primary)" }}>{s.v.toLocaleString()}</div>
                  <div className="ss-mono" style={{ fontSize: "0.55rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Feature showcase */}
        <SectionHeader eyebrow="Explore" title="Features" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ss-card" style={{ padding: 12, height: "100%", transition: "border-color 0.2s" }}>
                <f.icon size={18} style={{ color: f.color, marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{f.label}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", marginTop: 4, lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Trending */}
        {trending && (
          <>
            <SectionHeader eyebrow="Trending" title="What's Hot" />
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <TrendingUp size={14} style={{ color: "var(--color-primary)" }} />
                <span className="ss-mono" style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Topics</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {trending.topics.map((t) => (
                  <Link key={t} to="/sage" search={{ prompt: `Explain ${t} for engineering students` }} style={{ padding: "4px 10px", borderRadius: 999, fontSize: "0.68rem", background: "var(--bg-3)", border: "1px solid var(--color-border)", color: "var(--color-primary)", textDecoration: "none" }}>
                    #{t}
                  </Link>
                ))}
              </div>
              {trending.hackathons?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginBottom: 6 }}>Featured Hackathons</div>
                  {trending.hackathons.map((h: any) => (
                    <Link key={h.id} to="/tech-feed" style={{ display: "block", fontSize: "0.78rem", color: "var(--color-foreground)", textDecoration: "none", padding: "4px 0" }}>
                      🚀 {h.title}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Saved opportunities */}
        {bookmarks.length > 0 && (
          <>
            <SectionHeader eyebrow="Saved" title="Your Opportunities" />
            <Card style={{ marginBottom: 16 }}>
              {bookmarks.slice(0, 3).map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <Bookmark size={12} style={{ color: "var(--color-primary)" }} />
                  <span style={{ fontSize: "0.78rem", flex: 1 }}>{b.title}</span>
                  <Link to="/tech-feed" style={{ fontSize: "0.68rem", color: "var(--color-primary)" }}>View</Link>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* Achievements */}
        <SectionHeader eyebrow="Progress" title="Achievements" />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
          {achievements.map((badge) => (
            <div key={badge.id} style={{
              minWidth: 90, padding: 10, borderRadius: 12, textAlign: "center",
              background: badge.unlocked ? "rgba(232,255,71,0.08)" : "var(--bg-2)",
              border: badge.unlocked ? "1px solid rgba(232,255,71,0.3)" : "1px solid var(--color-border)",
              opacity: badge.unlocked ? 1 : 0.5,
            }}>
              <div style={{ fontSize: "1.4rem" }}>{badge.icon}</div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, marginTop: 4 }}>{badge.label}</div>
            </div>
          ))}
        </div>
        {unlocked.length > 0 && (
          <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 4 }}>
            {unlocked.length} of {achievements.length} badges unlocked
          </p>
        )}

        {/* Quick tasks */}
        <SectionHeader eyebrow="Tasks" title="Upcoming" action={<Link to="/tasks" className="ss-btn ss-btn-ghost" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>All <ChevronRight size={12} /></Link>} />
        {(tasks.data ?? []).filter((t) => t.status !== "done").slice(0, 3).map((t) => (
          <div key={t.id} className="ss-card" style={{ padding: 10, marginBottom: 6, fontSize: "0.82rem" }}>{t.title}</div>
        ))}
      </div>
    </PageTransition>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span style={{
      position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 999,
      background: "var(--color-primary)", color: "#060606", fontSize: "0.5rem", fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {count > 9 ? "9+" : count}
    </span>
  );
}
