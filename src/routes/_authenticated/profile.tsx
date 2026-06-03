import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { 
  LogOut, Flame, Clock, CheckSquare, Download, User, 
  Settings, Info, Layout, ShieldCheck, Heart, Sparkles 
} from "lucide-react";
import { api, API_BASE_URL } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { tasksStore } from "../../lib/store/tasks";
import { sessionsStore, computeAnalytics } from "../../lib/store/sessions";
import type { ProfilePatch } from "../../lib/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile & Passport — Sync & Study" }] }),
  component: ProfilePage,
});

type TabType = "passport" | "edit" | "preferences" | "about";
type WallpaperTheme = "neon" | "minimal" | "forest";

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("passport");

  // Wallpaper Modal State
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<WallpaperTheme>("neon");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // System health states
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

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

  // Check Backend Status
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok) setBackendStatus("online");
        else if (alive) setBackendStatus("offline");
      })
      .catch(() => {
        if (alive) setBackendStatus("offline");
      });
    return () => { alive = false; };
  }, [activeTab]);

  // Profile update mutation
  const mut = useMutation({
    mutationFn: (patch: ProfilePatch) => api.updateMyProfile(patch),
    onSuccess: () => {
      toast.success("Profile saved successfully");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setActiveTab("passport");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  // Calculate live study metrics
  const analytics = computeAnalytics();
  const allTasks = tasksStore.list();
  const completedTasksCount = allTasks.filter((t) => t.status === "done").length;
  const totalTasksCount = allTasks.length;

  const subjectsValue = (form.subjects ?? []).join(", ");

  // --- HTML5 Canvas Wallpaper Generator Logic ---
  const drawWallpaper = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set mobile Lockscreen resolution (1080x1920 px)
    canvas.width = 1080;
    canvas.height = 1920;

    const theme = selectedTheme;
    const studentName = form.name || user?.name || "STUDENT";
    const studentSchool = form.school || "SELF EDUCATION";
    const studentGoals = form.goals || "Stay focused, make progress daily.";

    // 1. Draw Background
    if (theme === "neon") {
      // Neon Cyber Dark Grey
      ctx.fillStyle = "#0C0C0C";
      ctx.fillRect(0, 0, 1080, 1920);

      // Neon-Yellow Glowing Border
      ctx.strokeStyle = "#E8FF47";
      ctx.lineWidth = 16;
      ctx.strokeRect(40, 40, 1000, 1840);

      // Futuristic Matrix grid lines
      ctx.fillStyle = "rgba(232, 255, 71, 0.02)";
      for (let y = 100; y < 1820; y += 40) {
        ctx.fillRect(80, y, 920, 2);
      }
    } else if (theme === "forest") {
      // Mindfulness Forest Green Slate Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, "#08100C");
      grad.addColorStop(1, "#1B2A22");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle forest border
      ctx.strokeStyle = "rgba(61, 220, 132, 0.2)";
      ctx.lineWidth = 12;
      ctx.strokeRect(50, 50, 980, 1820);
    } else {
      // Midnight Minimal Deep Black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 1080, 1920);

      // Minimal white thin border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, 960, 1800);
    }

    // 2. Draw Top Headers & Clock Accent
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Standard clock text
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();

    // Clock
    ctx.fillStyle = theme === "neon" ? "#E8FF47" : "#FFFFFF";
    ctx.font = "bold 160px sans-serif";
    ctx.fillText(timeStr, 540, 260);

    // Date
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "32px monospace";
    ctx.fillText(dateStr, 540, 370);

    // Divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(200, 440);
    ctx.lineTo(880, 440);
    ctx.stroke();

    // 3. Draw Passport Box in Center
    const boxX = 140;
    const boxY = 560;
    const boxW = 800;
    const boxH = 920;

    // Glassmorphic passport container
    ctx.fillStyle = "rgba(20, 20, 20, 0.75)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 32);
    ctx.fill();
    ctx.strokeStyle = theme === "neon" ? "rgba(232, 255, 71, 0.18)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Passport Header Bar
    ctx.fillStyle = theme === "neon" ? "rgba(232, 255, 71, 0.04)" : "rgba(255, 255, 255, 0.02)";
    ctx.beginPath();
    ctx.roundRect(boxX + 2, boxY + 2, boxW - 4, 120, [30, 30, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(boxX + 40, boxY + 120);
    ctx.lineTo(boxX + boxW - 40, boxY + 120);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = theme === "neon" ? "#E8FF47" : "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("STUDENT STUDY PASSPORT", boxX + 60, boxY + 60);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "24px monospace";
    ctx.fillText("ID: " + String(user?.id ?? "DEV-MODE").slice(0, 10).toUpperCase(), boxX + boxW - 60, boxY + 60);

    // Student Info Block
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText(studentName, boxX + 60, boxY + 220);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "32px sans-serif";
    ctx.fillText(studentSchool.toUpperCase() + " · " + (form.year || "YEAR 1").toUpperCase(), boxX + 60, boxY + 280);

    // Goal block title
    ctx.fillStyle = theme === "neon" ? "#E8FF47" : "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 28px monospace";
    ctx.fillText("ACTIVE STUDY GOALS", boxX + 60, boxY + 410);

    // Goal Details (Wrapped text)
    ctx.fillStyle = "#F0F0F0";
    ctx.font = "italic 38px sans-serif";
    wrapText(ctx, `“ ${studentGoals} ”`, boxX + 60, boxY + 490, boxW - 120, 56);

    // Dynamic stats badges inside card
    const statY = boxY + 760;
    
    // Left Stat Badge (Streak)
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(boxX + 60, statY, 320, 100, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.stroke();

    ctx.fillStyle = "#E8FF47";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`🔥 ${analytics.streakDays} DAYS`, boxX + 80, statY + 50);

    // Right Stat Badge (Total minutes)
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(boxX + boxW - 380, statY, 320, 100, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`⏱️ ${analytics.weeklyFocusMinutes} MIN`, boxX + boxW - 360, statY + 50);

    // 4. Draw Footer details
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "24px monospace";
    ctx.fillText("SYNC & STUDY HUB · MOBILE PASS", 540, 1650);

    // Draw Barcode accent
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    let startX = 400;
    const barWidths = [4, 8, 2, 6, 2, 8, 4, 12, 2, 4, 8, 2, 6, 8, 2, 4];
    for (const w of barWidths) {
      ctx.fillRect(startX, 1690, w, 50);
      startX += w + 6;
    }
  };

  const handleDownload = () => {
    drawWallpaper();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `sync-study-${selectedTheme}-wallpaper.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Wallpaper downloaded! Check your downloads.");
    setShowWallpaperModal(false);
  };

  // Auto-draw canvas when preview is triggered
  useEffect(() => {
    if (showWallpaperModal) {
      setTimeout(drawWallpaper, 100);
    }
  }, [showWallpaperModal, selectedTheme]);

  // Helper text wrapping function for Canvas
  function wrapText(
    ctx: CanvasRenderingContext2D, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number
  ) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  return (
    <>
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
          {(["passport", "edit", "preferences", "about"] as TabType[]).map((tab) => (
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
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>

        {/* ========================================== */}
        {/* TABS 1: PASSPORT CARD VIEW                 */}
        {/* ========================================== */}
        {activeTab === "passport" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Cyber student card block */}
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
                {/* Mock Avatar */}
                <div style={{
                  width: 54, height: 54, borderRadius: 14,
                  background: "rgba(232, 255, 71, 0.06)",
                  border: "1px solid rgba(232, 255, 71, 0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--color-primary)", fontWeight: "bold", fontSize: "1.2rem"
                }}>
                  {String(form.name || "S").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="ss-display" style={{ fontWeight: 800, fontSize: "1.15rem", color: "#F0F0F0" }}>
                    {form.name || "Student"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#888" }}>
                    {form.school || "No University Set"} · {form.year || "Year 1"}
                  </div>
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
                <span className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase" }}>Study Goals</span>
                <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: 2, color: "#F0F0F0" }}>Current Aspiration</h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "#aaa", fontStyle: "italic", borderLeft: "2px solid var(--color-primary)", paddingLeft: 12, margin: "6px 0" }}>
                “ {form.goals || "What are you working towards? Set your goals in the Edit tab."} ”
              </p>
              
              <button 
                onClick={() => {
                  if (!form.goals) {
                    toast.error("Please add your study goals in the Edit tab first!");
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
                <Download size={14} /> Create Phone Wallpaper
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
            <Field label="Study goals">
              <textarea className="ss-textarea" value={form.goals ?? ""} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="What are you working towards?" />
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
        {/* TABS 4: ABOUT & DEPLOYMENT CHECKER         */}
        {/* ========================================== */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Version block */}
            <div className="ss-card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="ss-mono" style={{ fontSize: "0.68rem", color: "var(--color-primary)", textTransform: "uppercase" }}>System Version</div>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.2rem", color: "#FFF" }}>Sync & Study Hub v1.2.0</h3>
              <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.5, marginTop: 4 }}>
                Collaborative pomodoro sessions, real-time community messaging, and AI study assistance built for focused students.
              </p>
            </div>

            {/* Live System Health Tracker */}
            <div>
              <span className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase" }}>Development Checks</span>
              <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", marginTop: 2, marginBottom: 12 }}>Connection Health</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="ss-card">
                
                {/* Cloudflare Edge Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Layout size={16} style={{ color: "#E8FF47" }} />
                    <span className="ss-mono" style={{ fontSize: "0.78rem", color: "#FFF" }}>Cloudflare Workers</span>
                  </div>
                  <span style={{ 
                    fontSize: "0.68rem", padding: "2px 8px", borderRadius: 10, 
                    background: "rgba(61, 220, 132, 0.1)", color: "#3ddc84", fontWeight: "bold" 
                  }}>
                    LIVE / EDGE
                  </span>
                </div>

                {/* Railway Server Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={16} style={{ color: "#4a9eff" }} />
                    <span className="ss-mono" style={{ fontSize: "0.78rem", color: "#FFF" }}>Railway Backend API</span>
                  </div>
                  <span style={{ 
                    fontSize: "0.68rem", padding: "2px 8px", borderRadius: 10, 
                    background: backendStatus === "online" ? "rgba(61, 220, 132, 0.1)" : "rgba(255, 69, 69, 0.1)", 
                    color: backendStatus === "online" ? "#3ddc84" : "#ff6b6b", fontWeight: "bold" 
                  }}>
                    {backendStatus === "checking" ? "CHECKING..." : backendStatus.toUpperCase()}
                  </span>
                </div>

                {/* MongoDB Atlas Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={16} style={{ color: "#3ddc84" }} />
                    <span className="ss-mono" style={{ fontSize: "0.78rem", color: "#FFF" }}>MongoDB Atlas</span>
                  </div>
                  <span style={{ 
                    fontSize: "0.68rem", padding: "2px 8px", borderRadius: 10, 
                    background: backendStatus === "online" ? "rgba(61, 220, 132, 0.1)" : "rgba(255, 69, 69, 0.1)", 
                    color: backendStatus === "online" ? "#3ddc84" : "#ff6b6b", fontWeight: "bold" 
                  }}>
                    {backendStatus === "checking" ? "CHECKING..." : backendStatus === "online" ? "CONNECTED" : "OFFLINE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Credits */}
            <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#444", marginTop: 8 }}>
              Sync & Study Hub is made with <Heart size={10} style={{ color: "#ff6b6b", display: "inline-block", margin: "0 2px" }} /> for students.
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
          background: "rgba(0,0,0,0.9)", display: "flex", 
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          {/* Header */}
          <div style={{ width: "100%", maxWidth: 360, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.1rem", color: "#FFF" }}>Lockscreen Creator</h3>
            <button 
              onClick={() => setShowWallpaperModal(false)}
              style={{ background: "none", border: "none", color: "#888", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
            >
              Cancel
            </button>
          </div>

          {/* Canvas Preview Box */}
          <div style={{ 
            width: "100%", maxWidth: 340, 
            aspectRatio: "9/16",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            background: "#0C0C0C"
          }}>
            <canvas 
              ref={canvasRef} 
              style={{ width: "100%", height: "100%", objectFit: "contain" }} 
            />
          </div>

          {/* Theme selector controls */}
          <div style={{ 
            width: "100%", maxWidth: 340, 
            display: "flex", flexDirection: "column", gap: 10,
            marginTop: 18 
          }}>
            <span className="ss-mono" style={{ fontSize: "0.62rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>
              Select Wallpaper Theme
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["neon", "minimal", "forest"] as WallpaperTheme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: "0.78rem",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: selectedTheme === theme ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.06)",
                    background: selectedTheme === theme ? "rgba(232,255,71,0.06)" : "#141414",
                    color: selectedTheme === theme ? "var(--color-primary)" : "#888",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease"
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>

            {/* Export trigger */}
            <button 
              onClick={handleDownload}
              className="ss-btn ss-btn-primary" 
              style={{ width: "100%", justifyContent: "center", gap: 8, padding: 12, marginTop: 4 }}
            >
              <Download size={16} /> Download PNG Wallpaper
            </button>
          </div>
        </div>
      )}
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
