import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { 
  LogOut, Flame, Clock, CheckSquare, Download, User, 
  Settings, Info, Layout, ShieldCheck, Heart, Sparkles, RefreshCw
} from "lucide-react";
import { api, API_BASE_URL } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { tasksStore } from "../../lib/store/tasks";
import { sessionsStore, computeAnalytics } from "../../lib/store/sessions";
import type { ProfilePatch } from "../../lib/types";
import { PageTransition } from "../../components/shell/PageTransition";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile & Student Card — Sync & Study" }] }),
  component: ProfilePage,
});

type TabType = "card" | "edit" | "preferences" | "about";
type WallpaperLayout = "ultra" | "dashboard" | "deep";

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Tab Navigation State (Renamed tab from passport to card)
  const [activeTab, setActiveTab] = useState<TabType>("card");

  // Wallpaper Modal State
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<WallpaperLayout>("ultra");
  const [showClock, setShowClock] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load User Profile
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
  });

  const [form, setForm] = useState<ProfilePatch>({});
  useEffect(() => {
    if (data?.profile) {
      setForm({
        name: data.profile.name,
        avatar: data.profile.avatar ?? "",
        bio: data.profile.bio ?? "",
        school: data.profile.school ?? "",
        year: data.profile.year ?? "",
        subjects: data.profile.subjects ?? [],
        goals: data.profile.goals ?? "",
        timezone: data.profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [data]);

  // Load Pomodoro Preferences from localStorage (with fallbacks)
  const [prefFocus, setPrefFocus] = useState(25);
  const [prefShortBreak, setPrefShortBreak] = useState(5);
  const [prefLongBreak, setPrefLongBreak] = useState(15);
  const [prefAiModel, setPrefAiModel] = useState("gemini-2.0-flash-lite");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefFocus(Number(localStorage.getItem("ss.pref.focus") ?? "25"));
      setPrefShortBreak(Number(localStorage.getItem("ss.pref.short") ?? "5"));
      setPrefLongBreak(Number(localStorage.getItem("ss.pref.long") ?? "15"));
      setPrefAiModel(localStorage.getItem("ss.pref.aimodel") ?? "gemini-2.0-flash-lite");
    }
  }, []);

  const savePreferences = () => {
    localStorage.setItem("ss.pref.focus", String(prefFocus));
    localStorage.setItem("ss.pref.short", String(prefShortBreak));
    localStorage.setItem("ss.pref.long", String(prefLongBreak));
    localStorage.setItem("ss.pref.aimodel", prefAiModel);
    toast.success("Preferences updated successfully");
  };

  // Profile update mutation
  const mut = useMutation({
    mutationFn: (patch: ProfilePatch) => api.updateMyProfile(patch),
    onSuccess: () => {
      toast.success("Profile saved successfully");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setActiveTab("card");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  // Calculate live study metrics
  const analytics = computeAnalytics();
  const allTasks = tasksStore.list();
  const completedTasksCount = allTasks.filter((t) => t.status === "done").length;
  const totalTasksCount = allTasks.length;

  const subjectsValue = (form.subjects ?? []).join(", ");

  // --- Premium Minimalistic Wallpaper Generator Logic ---
  const drawWallpaper = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set mobile Lockscreen high resolution (1080x1920 px)
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Draw Deep Black Background
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle Dot Grid (Linear/Raycast aesthetic)
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    const dotSpacing = 60;
    for (let x = 0; x < canvas.width; x += dotSpacing) {
      for (let y = 0; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Optional Date/Time at the Top (iOS style clock)
    if (showClock) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();

      // Clock
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "300 130px sans-serif";
      ctx.fillText(timeStr, 540, 240);

      // Date
      ctx.fillStyle = "#E8FF47"; // Neon yellow accent date
      ctx.font = "bold 26px monospace";
      ctx.fillText(dateStr, 540, 330);
    }

    // Extract Explicit Goals from Profile
    const profileGoals = (form.goals || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Extract Active Tasks as study goals (limit to top 4 to avoid clutter)
    const taskGoals = allTasks
      .filter((t) => t.status !== "done")
      .map((t) => (t.subject ? `${t.subject}: ${t.title}` : t.title).toUpperCase())
      .slice(0, 4);

    // Combine custom profile goals and active tasks, eliminating any duplicates
    const combinedGoals = Array.from(new Set([...profileGoals, ...taskGoals]));
    const goalsList = combinedGoals.length > 0 ? combinedGoals : ["STAY FOCUSED", "DO BETTER."];

    // 3. Draw Layout Variations
    if (selectedLayout === "ultra") {
      // --- Layout 1: Ultra-Minimal (Goals List Only) ---
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Small Section Eyebrow
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 24px monospace";
      ctx.fillText("CURRENT FOCUS", 540, 720);

      // List of Goals
      let startY = 820;
      ctx.fillStyle = "#E8FF47"; // Neon yellow accents
      ctx.font = "bold 56px sans-serif";
      for (const goal of goalsList) {
        ctx.fillText(goal, 540, startY);
        startY += 90;
      }
    } 
    else if (selectedLayout === "dashboard") {
      // --- Layout 2: Focus Dashboard (Goals + Progress Bar) ---
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const startX = 140;

      // Small Eyebrow
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 24px monospace";
      ctx.fillText("FOCUS WORKSPACE", startX, 660);

      // List of Goals
      let startY = 750;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 52px sans-serif";
      for (const goal of goalsList) {
        // Draw bullet dot
        ctx.fillStyle = "#E8FF47";
        ctx.beginPath();
        ctx.arc(startX + 10, startY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(goal, startX + 45, startY);
        startY += 85;
      }

      // Bottom Progress / Metric Bar
      if (showProgress) {
        const barY = 1520;
        const barW = 800;

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(startX, barY, barW, 8, 4);
        ctx.fill();

        // Neon Yellow Progress Fill (represented as 70% intensity)
        ctx.fillStyle = "#E8FF47";
        ctx.beginPath();
        ctx.roundRect(startX, barY, barW * 0.7, 8, 4);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "bold 20px monospace";
        ctx.fillText("FOCUS INTENSITY · 70%", startX, barY - 30);
      }
    } 
    else {
      // --- Layout 3: Deep Work Mode (Single dominant goal) ---
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 24px monospace";
      ctx.fillText("DEEP WORK", 540, 860);

      // Single dominant goal
      const primaryGoal = goalsList[0] || "FOCUS WORK";
      ctx.fillStyle = "#E8FF47"; // Giant glowing neon text
      ctx.font = "bold 84px sans-serif";
      ctx.fillText(primaryGoal, 540, 960);

      // Sub indicator
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.font = "italic 26px sans-serif";
      ctx.fillText("distraction state: muted", 540, 1060);
    }
  };

  const handleDownload = () => {
    drawWallpaper();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `sync-study-goals-wallpaper.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Wallpaper downloaded! Set it as your phone background.");
    setShowWallpaperModal(false);
  };

  // Auto-draw canvas when preview is triggered
  useEffect(() => {
    if (showWallpaperModal) {
      setTimeout(drawWallpaper, 100);
    }
  }, [showWallpaperModal, selectedLayout, showClock, showProgress]);

  return (
    <PageTransition>
      {/* Redesigned Premium Top Banner */}
      <div className="ss-ph" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ss-ph-label">STUDENT DASHBOARD</div>
            <h1 className="ss-ph-title" style={{ fontSize: "1.45rem", display: "flex", alignItems: "center", gap: 8 }}>
              {isLoading ? "Loading…" : (form.name || "Sync Student")}
            </h1>
            <p className="ss-ph-sub">{user?.email}</p>
          </div>
          <button
            className="ss-btn ss-btn-outline"
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            style={{ 
              padding: "8px 12px", 
              fontSize: "0.78rem", 
              borderColor: "rgba(255, 69, 69, 0.3)", 
              color: "#ff6b6b" 
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {/* Tab Selection Row */}
        <div style={{ 
          display: "flex", 
          gap: 4, 
          marginTop: 18, 
          background: "rgba(255,255,255,0.03)", 
          padding: 3, 
          borderRadius: 8, 
          border: "1px solid rgba(255,255,255,0.05)" 
        }}>
          {(["card", "edit", "preferences", "about"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="ss-mono"
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: "0.62rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab ? "rgba(232, 255, 71, 0.08)" : "transparent",
                color: activeTab === tab ? "var(--color-primary)" : "#666",
                fontWeight: activeTab === tab ? "bold" : "normal",
                transition: "all 0.15s ease",
              }}
            >
              {tab === "card" ? "Student Card" : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>

        {/* ========================================== */}
        {/* TABS 1: STUDENT CARD VIEW                 */}
        {/* ========================================== */}
        {activeTab === "card" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Cyber student card block (Replaced Passport with Student Card) */}
            <div style={{
              background: "rgba(20, 20, 20, 0.8)",
              borderRadius: 18,
              border: "1px solid rgba(232, 255, 71, 0.15)",
              padding: 22,
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Futuristic card decor */}
              <div style={{ 
                position: "absolute", top: 12, right: 16, 
                fontSize: "0.58rem", fontFamily: "var(--font-mono)", 
                color: "var(--color-primary)", opacity: 0.8 
              }}>
                STATE: ACTIVE
              </div>
              
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
                {/* Profile Avatar */}
                {form.avatar ? (
                  <img
                    src={form.avatar}
                    alt=""
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      objectFit: "cover",
                      border: "1px solid var(--color-border)"
                    }}
                  />
                ) : (
                  <div style={{
                    width: 54, height: 54, borderRadius: 14,
                    background: "rgba(232, 255, 71, 0.06)",
                    border: "1px solid rgba(232, 255, 71, 0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-primary)", fontWeight: "bold", fontSize: "1.2rem"
                  }}>
                    {String(form.name || "S").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="ss-display" style={{ fontWeight: 800, fontSize: "1.15rem", color: "#F0F0F0" }}>
                    {form.name || "Student"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#888" }}>
                    {form.school || "No University Set"} · {form.year || "Year 1"}
                  </div>
                  {data?.profile?.publicId && (
                    <div style={{ 
                      fontSize: "0.68rem", 
                      color: "var(--color-primary)", 
                      fontFamily: "var(--font-mono)", 
                      marginTop: 3,
                      background: "rgba(232,255,71,0.06)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      display: "inline-block",
                      border: "1px solid rgba(232,255,71,0.12)"
                    }}>
                      STUDY ID: {data.profile.publicId}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio and metadata */}
              {form.bio && (
                <p style={{ fontSize: "0.82rem", color: "#aaa", lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
                  “ {form.bio} ”
                </p>
              )}

              {/* Subject Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                {form.subjects && form.subjects.length > 0 ? (
                  form.subjects.map((sub) => (
                    <span key={sub} style={{
                      padding: "3px 8px", borderRadius: 12, fontSize: "0.68rem",
                      background: "rgba(232, 255, 71, 0.05)", border: "1px solid rgba(232, 255, 71, 0.12)",
                      color: "var(--color-primary)", fontFamily: "var(--font-mono)"
                    }}>
                      {sub}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "#444" }}>No academic subjects listed.</span>
                )}
              </div>
            </div>

            {/* Performance Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="ss-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <Flame size={20} style={{ color: "#E8FF47" }} />
                <span className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF", marginTop: 4 }}>
                  {analytics.streakDays} Days
                </span>
                <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#666", textTransform: "uppercase" }}>
                  Active Streak
                </span>
              </div>
              <div className="ss-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <Clock size={20} style={{ color: "#4a9eff" }} />
                <span className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF", marginTop: 4 }}>
                  {analytics.weeklyFocusMinutes} m
                </span>
                <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#666", textTransform: "uppercase" }}>
                  This Week Focus
                </span>
              </div>
              <div className="ss-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <CheckSquare size={20} style={{ color: "#3ddc84" }} />
                <span className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF", marginTop: 4 }}>
                  {completedTasksCount} / {totalTasksCount}
                </span>
                <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#666", textTransform: "uppercase" }}>
                  Tasks Completed
                </span>
              </div>
              <div className="ss-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <Sparkles size={20} style={{ color: "#aa66ff" }} />
                <span className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF", marginTop: 4 }}>
                  {analytics.weeklySessions}
                </span>
                <span className="ss-mono" style={{ fontSize: "0.58rem", color: "#666", textTransform: "uppercase" }}>
                  Sessions Completed
                </span>
              </div>
            </div>

            {/* Study Goals wallpaper trigger card */}
            <div className="ss-card" style={{ 
              padding: 20, 
              display: "flex", 
              flexDirection: "column", 
              gap: 12,
              background: "linear-gradient(135deg, rgba(20,20,20,0.8), rgba(30,30,30,0.5))"
            }}>
              <div>
                <span className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase" }}>Study Goals & Tasks</span>
                <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: 2, color: "#F0F0F0" }}>Current Focus Goals</h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0" }}>
                {form.goals && (
                  <div style={{ borderLeft: "2.5px solid var(--color-primary)", paddingLeft: 12 }}>
                    <div style={{ fontSize: "0.62rem", color: "#666", textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: "bold", letterSpacing: "0.05em" }}>Profile Goals</div>
                    <p style={{ fontSize: "0.82rem", color: "#ccc", margin: "2px 0 0 0" }}>{form.goals}</p>
                  </div>
                )}
                
                {allTasks.filter(t => t.status !== "done").length > 0 && (
                  <div style={{ borderLeft: "2.5px solid #4a9eff", paddingLeft: 12 }}>
                    <div style={{ fontSize: "0.62rem", color: "#666", textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: "bold", letterSpacing: "0.05em" }}>Active Home Tasks</div>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: 14, fontSize: "0.82rem", color: "#ccc", listStyleType: "square" }}>
                      {allTasks.filter(t => t.status !== "done").slice(0, 3).map(t => (
                        <li key={t.id} style={{ marginBottom: 2 }}>{t.title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!form.goals && allTasks.filter(t => t.status !== "done").length === 0 && (
                  <p style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", margin: 0 }}>
                    No focus goals set. Add goals in the Edit tab or create tasks on the Homepage to generate your wallpaper.
                  </p>
                )}
              </div>
              
              <button 
                onClick={() => {
                  const activeTasksCount = allTasks.filter(t => t.status !== "done").length;
                  if (!form.goals && activeTasksCount === 0) {
                    toast.error("Please add study goals in the Edit tab or create tasks on the Homepage first!");
                    return;
                  }
                  setShowWallpaperModal(true);
                }}
                className="ss-btn ss-btn-primary" 
                style={{ 
                  marginTop: 6, 
                  justifyContent: "center", 
                  gap: 8,
                  fontSize: "0.82rem" 
                }}
              >
                <Download size={14} /> Goal Wallpaper Generator
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TABS 2: EDIT PROFILE FORM                  */}
        {/* ========================================== */}
        {activeTab === "edit" && (
          <form
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
            <Field label="Choose Profile Photo">
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "4px 0", marginBottom: 4 }}>
                {[
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"
                ].map((url, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setForm({ ...form, avatar: url })}
                    style={{
                      padding: 0,
                      background: "none",
                      border: form.avatar === url ? "3px solid var(--color-primary)" : "2px solid rgba(255,255,255,0.06)",
                      borderRadius: "50%",
                      cursor: "pointer",
                      width: 50,
                      height: 50,
                      flexShrink: 0,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      transition: "all 0.2s"
                    }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Display name">
              <input className="ss-input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
            <Field label="Study goals (comma separated for wallpaper lists)">
              <textarea className="ss-textarea" value={form.goals ?? ""} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="e.g. AI/ML, System Design, Leetcode" />
            </Field>
            <Field label="Timezone">
              <input className="ss-input" value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </Field>

            <button className="ss-btn ss-btn-primary" type="submit" disabled={mut.isPending} style={{ marginTop: 8, justifyContent: "center" }}>
              {mut.isPending ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* TABS 3: PREFERENCES & POMODORO SETTINGS    */}
        {/* ========================================== */}
        {activeTab === "preferences" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <span className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase" }}>Focus defaults</span>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", marginTop: 2, marginBottom: 12 }}>Pomodoro Durations</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="ss-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ss-mono" style={{ fontSize: "0.75rem", color: "#aaa" }}>Focus Time (Min)</span>
                  <input 
                    type="number" 
                    value={prefFocus} 
                    onChange={e => setPrefFocus(Number(e.target.value))}
                    style={{ width: 80, padding: 8, background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", color: "#FFF", borderRadius: 6, textAlign: "center" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ss-mono" style={{ fontSize: "0.75rem", color: "#aaa" }}>Short Break (Min)</span>
                  <input 
                    type="number" 
                    value={prefShortBreak} 
                    onChange={e => setPrefShortBreak(Number(e.target.value))}
                    style={{ width: 80, padding: 8, background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", color: "#FFF", borderRadius: 6, textAlign: "center" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ss-mono" style={{ fontSize: "0.75rem", color: "#aaa" }}>Long Break (Min)</span>
                  <input 
                    type="number" 
                    value={prefLongBreak} 
                    onChange={e => setPrefLongBreak(Number(e.target.value))}
                    style={{ width: 80, padding: 8, background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", color: "#FFF", borderRadius: 6, textAlign: "center" }}
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase" }}>AI Assistant</span>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", marginTop: 2, marginBottom: 12 }}>Sage AI Settings</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="ss-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="ss-mono" style={{ fontSize: "0.75rem", color: "#aaa" }}>Selected Model</span>
                  <select 
                    value={prefAiModel} 
                    onChange={e => setPrefAiModel(e.target.value)}
                    style={{ padding: 8, background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)", color: "#FFF", borderRadius: 6, outline: "none" }}
                  >
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Free Tier)</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={savePreferences}
              className="ss-btn ss-btn-primary" 
              style={{ justifyContent: "center", marginTop: 8 }}
            >
              Save Preferences
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* TABS 4: ABOUT PAGE REDESIGNED              */}
        {/* ========================================== */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Mission Statement */}
            <div className="ss-card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="ss-mono" style={{ fontSize: "0.68rem", color: "var(--color-primary)", textTransform: "uppercase" }}>Our Offering</div>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.2rem", color: "#FFF" }}>Learn, Focus, and Grow Together</h3>
              <p style={{ fontSize: "0.85rem", color: "#ccc", lineHeight: 1.6, marginTop: 6 }}>
                Sync & Study Hub is designed to solve the isolation and distraction of modern remote learning. By combining scientific productivity workflows with real-time peer groups and AI coaching, we help students build focus habits that stick.
              </p>
            </div>

            {/* Core Features list for students */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem" }}>How Sync & Study Helps You</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { title: "⏰ Group Pomodoro Blocks", desc: "Start customized study timers and invite classmates to study synchronously, keeping everyone accountable." },
                  { title: "💬 Real-Time Study Communities", desc: "Create interest-based servers and subject channels. Share files, notes, and ask for help instantly." },
                  { title: "🤖 Sage AI Study Companion", desc: "Interact with an AI coach backed by Google Gemini to analyze your goals, create schedules, and suggest focus strategies." },
                  { title: "📊 Personal Insights Dashboard", desc: "Track your active daily streaks, weekly study hours, and task progress using visual metrics." }
                ].map((item, idx) => (
                  <div key={idx} className="ss-card" style={{ padding: "14px 18px", borderLeft: "3px solid var(--color-primary)" }}>
                    <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFF" }}>{item.title}</div>
                    <p style={{ fontSize: "0.78rem", color: "#aaa", marginTop: 4, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Credits */}
            <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#444", marginTop: 8 }}>
              Sync & Study Hub is made with <Heart size={10} style={{ color: "#ff6b6b", display: "inline-block", margin: "0 2px" }} /> for student productivity.
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* WALLPAPER GENERATOR PREVIEW MODAL          */}
      {/* ========================================== */}
      {showWallpaperModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.95)", display: "flex", 
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          {/* Header */}
          <div style={{ width: "100%", maxWidth: 340, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", color: "#FFF" }}>Goal Wallpaper</h3>
            <button 
              onClick={() => setShowWallpaperModal(false)}
              style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: "0.82rem", cursor: "pointer" }}
            >
              Close
            </button>
          </div>

          {/* Canvas Preview Box */}
          <div style={{ 
            width: "100%", maxWidth: 300, 
            aspectRatio: "9/16",
            border: "1px solid rgba(232, 255, 71, 0.15)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            background: "#050505"
          }}>
            <canvas 
              ref={canvasRef} 
              style={{ width: "100%", height: "100%", objectFit: "contain" }} 
            />
          </div>

          {/* Control Options (Linear / Nothing OS Aesthetic) */}
          <div style={{ 
            width: "100%", maxWidth: 320, 
            display: "flex", flexDirection: "column", gap: 12,
            marginTop: 18 
          }}>
            
            {/* Layout selectors */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="ss-mono" style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase" }}>Layout Style</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { id: "ultra", label: "Minimal" },
                  { id: "dashboard", label: "Dashboard" },
                  { id: "deep", label: "Deep Work" }
                ].map((lay) => (
                  <button
                    key={lay.id}
                    onClick={() => setSelectedLayout(lay.id as WallpaperLayout)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      fontSize: "0.7rem",
                      borderRadius: 6,
                      cursor: "pointer",
                      border: "none",
                      background: selectedLayout === lay.id ? "rgba(232,255,71,0.08)" : "rgba(255,255,255,0.02)",
                      color: selectedLayout === lay.id ? "var(--color-primary)" : "#666",
                      fontWeight: selectedLayout === lay.id ? "bold" : "normal",
                      transition: "all 0.1s ease"
                    }}
                  >
                    {lay.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle checkboxes */}
            <div style={{ display: "flex", gap: 14, justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.72rem", color: "#aaa" }}>
                <input 
                  type="checkbox" 
                  checked={showClock} 
                  onChange={e => setShowClock(e.target.checked)}
                  style={{ accentColor: "var(--color-primary)" }}
                />
                Show Lock Clock
              </label>

              {selectedLayout === "dashboard" && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.72rem", color: "#aaa" }}>
                  <input 
                    type="checkbox" 
                    checked={showProgress} 
                    onChange={e => setShowProgress(e.target.checked)}
                    style={{ accentColor: "var(--color-primary)" }}
                  />
                  Show Focus Bar
                </label>
              )}
            </div>

            {/* Export and Regenerate buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button 
                onClick={() => {
                  // Cycle Layout style (Regenerate Layout action)
                  const layouts: WallpaperLayout[] = ["ultra", "dashboard", "deep"];
                  const currentIdx = layouts.indexOf(selectedLayout);
                  const nextIdx = (currentIdx + 1) % layouts.length;
                  setSelectedLayout(layouts[nextIdx]);
                  toast.success(`Swapped to ${layouts[nextIdx].toUpperCase()} layout!`);
                }}
                className="ss-btn ss-btn-outline" 
                style={{ flex: 1, justifyContent: "center", gap: 6, padding: 10, fontSize: "0.8rem" }}
              >
                <RefreshCw size={13} /> Layout
              </button>
              <button 
                onClick={handleDownload}
                className="ss-btn ss-btn-primary" 
                style={{ flex: 2, justifyContent: "center", gap: 6, padding: 10, fontSize: "0.8rem" }}
              >
                <Download size={13} /> Save Lockscreen
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
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
