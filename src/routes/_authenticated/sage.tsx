import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, Send, Database, ListChecks, Flame, Plus, MessageSquare, Trash2, AlertTriangle, History,
} from "lucide-react";
import { PageHeader } from "../../components/ui-kit/Card";
import { PageTransition } from "../../components/shell/PageTransition";
import { streamSage, type SageStreamHandle } from "../../lib/sage/client";
import { buildSageContext, type SageContext } from "../../lib/sage/context";
import { sageStore, type SageThread, type SageTurn } from "../../lib/store/sage";
import {
  LEARNING_MODES, SAGE_TOOLS, DIFFICULTY_LEVELS, ENGINEERING_PROMPTS,
  type SageLearningMode, type SageDifficulty, type SageTool,
} from "../../lib/sage/modes";
import { trackSageSession } from "../../lib/achievements";
import { useCommunities } from "../../lib/hooks/use-messaging";

export const Route = createFileRoute("/_authenticated/sage")({
  head: () => ({ meta: [{ title: "Sage — Sync & Study" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
  }),
  component: SagePage,
});

const PROMPTS = ENGINEERING_PROMPTS;

function SagePage() {
  const { prompt } = Route.useSearch();
  const [threads, setThreads] = useState<SageThread[]>(() => sageStore.list());
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.id ?? null);
  const [turns, setTurns] = useState<SageTurn[]>(() =>
    activeId ? sageStore.get(activeId)?.turns ?? [] : [],
  );
  const [input, setInput] = useState(prompt ?? "");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState<SageLearningMode>("general");
  const [difficulty, setDifficulty] = useState<SageDifficulty>("intermediate");
  const [activeTool, setActiveTool] = useState<SageTool>("chat");
  const [showTools, setShowTools] = useState(false);
  const handleRef = useRef<SageStreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: communities = [] } = useCommunities();
  const joined = useMemo(() => communities.filter((c) => c.joined).map((c) => c.name), [communities]);
  const ctx = useMemo<SageContext>(() => buildSageContext(joined), [activeId, turns.length, joined]);

  useEffect(() => () => handleRef.current?.cancel(), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Auto-fire if a prompt was passed in the search param (deep-link from DM/Channel/Community)
  const firedPromptRef = useRef(false);
  useEffect(() => {
    if (prompt && !firedPromptRef.current) {
      firedPromptRef.current = true;
      ask(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const refreshThreads = () => setThreads(sageStore.list());

  const openThread = (id: string) => {
    handleRef.current?.cancel();
    setActiveId(id);
    setTurns(sageStore.get(id)?.turns ?? []);
    setError(null);
    setShowHistory(false);
  };

  const newThread = () => {
    handleRef.current?.cancel();
    setActiveId(null);
    setTurns([]);
    setError(null);
    setInput("");
    setShowHistory(false);
  };

  const removeThread = (id: string) => {
    sageStore.remove(id);
    if (id === activeId) newThread();
    refreshThreads();
  };

  const ask = (text: string) => {
    const value = text.trim();
    if (!value || streaming) return;
    setInput("");
    setError(null);

    let threadId = activeId;
    if (!threadId) {
      const t = sageStore.create(value);
      threadId = t.id;
      setActiveId(threadId);
      refreshThreads();
    }

    const userTurn = sageStore.appendTurn(threadId, { role: "user", text: value });
    const sageTurn = sageStore.appendTurn(threadId, { role: "sage", text: "" });

    const allTurns = sageStore.get(threadId)?.turns ?? [];
    setTurns(allTurns);
    refreshThreads();
    setStreaming(true);

    let acc = "";
    handleRef.current = streamSage(
      {
        messages: allTurns
          .filter((t) => t.id !== sageTurn.id)
          .map((t) => ({ role: t.role, text: t.text })),
        context: ctx,
        mode,
        difficulty,
        tool: activeTool,
      },
      {
        onToken: (chunk) => {
          acc += chunk;
          setTurns((cur) => cur.map((t) => (t.id === sageTurn.id ? { ...t, text: acc } : t)));
          sageStore.updateTurnText(threadId!, sageTurn.id, acc);
        },
        onError: (msg) => {
          setError(msg);
        },
      },
    );
    handleRef.current.done.then(() => {
      setStreaming(false);
      trackSageSession();
      refreshThreads();
    });

    void userTurn;
  };

  const empty = turns.length === 0;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="AI Learning Mentor"
        title="Sage"
        sub="Engineering tutor · OS · DSA · AI/ML · Aptitude & more"
        right={
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="ss-btn ss-btn-ghost"
              style={{ padding: 8 }}
              aria-label="History"
            >
              <History size={16} />
            </button>
            <button
              onClick={newThread}
              className="ss-btn ss-btn-ghost"
              style={{ padding: 8, color: "var(--color-primary)" }}
              aria-label="New conversation"
            >
              <Plus size={16} />
            </button>
          </div>
        }
      />
      <div className="ss-body" style={{ padding: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {showHistory && (
          <HistoryDrawer
            threads={threads}
            activeId={activeId}
            onOpen={openThread}
            onRemove={removeThread}
            onClose={() => setShowHistory(false)}
            onNew={newThread}
          />
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {empty ? <Welcome onPick={ask} /> : turns.map((t) => <Turn key={t.id} t={t} streaming={streaming} />)}
          {error && (
            <div className="ss-card" style={{ display: "flex", gap: 10, alignItems: "flex-start", borderColor: "oklch(0.66 0.24 25 / 0.4)", background: "oklch(0.66 0.24 25 / 0.08)" }}>
              <AlertTriangle size={14} style={{ color: "var(--color-destructive)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: "0.78rem", color: "var(--color-foreground)" }}>
                <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.06em", color: "var(--color-destructive)", textTransform: "uppercase" }}>Sage error</div>
                <div style={{ marginTop: 4 }}>{error}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", padding: "10px 14px", background: "var(--bg-2)", flexShrink: 0 }}>
          {/* Learning modes */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", scrollbarWidth: "none" }} className="hide-scrollbar">
            {LEARNING_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                style={{
                  padding: "4px 10px", borderRadius: 999, fontSize: "0.65rem", cursor: "pointer", flexShrink: 0,
                  border: mode === m.id ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: mode === m.id ? "rgba(232,255,71,0.1)" : "var(--bg-3)",
                  color: mode === m.id ? "var(--color-primary)" : "var(--color-muted-foreground)",
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Difficulty + tools */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                style={{
                  padding: "3px 8px", borderRadius: 6, fontSize: "0.62rem", cursor: "pointer",
                  border: difficulty === d.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: difficulty === d.id ? "rgba(232,255,71,0.08)" : "transparent",
                  color: difficulty === d.id ? "var(--color-primary)" : "var(--color-muted-foreground)",
                }}
              >
                {d.label}
              </button>
            ))}
            <button type="button" onClick={() => setShowTools((v) => !v)} className="ss-btn ss-btn-ghost" style={{ padding: "3px 8px", fontSize: "0.62rem", marginLeft: "auto" }}>
              🛠 Tools
            </button>
          </div>

          {showTools && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {SAGE_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.id);
                    setInput(tool.promptPrefix);
                    setShowTools(false);
                  }}
                  style={{
                    padding: "6px 10px", borderRadius: 8, fontSize: "0.68rem", cursor: "pointer",
                    border: "1px solid var(--color-border)", background: "var(--bg-3)",
                  }}
                >
                  {tool.icon} {tool.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            <ContextChip icon={<ListChecks size={11} />} label={`${ctx.openTasks.length} open`} />
            <ContextChip icon={<Flame size={11} />} label={`${ctx.streakDays}d streak`} />
            <ContextChip icon={<Database size={11} />} label={`${ctx.weeklyFocusMinutes}m / wk`} />
            <ContextChip icon={<Sparkles size={11} />} label={LEARNING_MODES.find((m) => m.id === mode)?.label ?? mode} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} style={{ display: "flex", gap: 8 }}>
            <input
              className="ss-input"
              placeholder="Ask Sage anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              style={{ flex: 1 }}
            />
            <button type="submit" className="ss-btn ss-btn-primary" disabled={streaming || !input.trim()} style={{ padding: "0 14px" }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <>
      <div className="ss-card" style={{ borderColor: "oklch(0.96 0.21 110 / 0.35)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div className="ss-display" style={{ fontWeight: 700, fontSize: "1rem" }}>Hey, I'm Sage — your engineering mentor.</div>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
              I teach CS, Electronics, Mechanical, Civil, AI/ML, DBMS, OS, CN, aptitude, and more. Pick a learning mode, set your difficulty, and ask anything — I remember our conversation.
            </p>
          </div>
        </div>
      </div>
      <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", margin: "6px 0 -4px" }}>
        Try asking
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PROMPTS.map((p) => (
          <button
            key={p}
            className="ss-card"
            style={{ textAlign: "left", cursor: "pointer", padding: 12, fontSize: "0.84rem" }}
            onClick={() => onPick(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </>
  );
}

function Turn({ t, streaming }: { t: SageTurn; streaming: boolean }) {
  if (t.role === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--color-primary)", color: "var(--color-primary-foreground)", padding: "9px 13px", borderRadius: 12, borderTopRightRadius: 4, fontSize: "0.88rem", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {t.text}
      </div>
    );
  }
  const empty = t.text === "";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "92%" }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }}>
        <Sparkles size={12} />
      </div>
      <div style={{ fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--color-foreground)", wordBreak: "break-word" }}>
        {empty && streaming ? (
          <span className="ss-mono" style={{ color: "var(--color-muted-foreground)", fontSize: "0.72rem", display: "inline-flex", gap: 4, alignItems: "center" }}>
            thinking
            <Dot d={0} /><Dot d={150} /><Dot d={300} />
          </span>
        ) : (
          t.text
        )}
      </div>
    </div>
  );
}

function Dot({ d }: { d: number }) {
  return <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--color-muted-foreground)", animation: `ssBlink 1s ${d}ms infinite ease-in-out` }} />;
}

function ContextChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="ss-mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "1px solid var(--color-border)", borderRadius: 999, fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted-foreground)", background: "var(--bg-3)", flexShrink: 0 }}>
      {icon}{label}
    </span>
  );
}

function HistoryDrawer({
  threads, activeId, onOpen, onRemove, onClose, onNew,
}: {
  threads: SageThread[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, background: "oklch(0 0 0 / 0.55)", zIndex: 5, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "82%", maxWidth: 320, height: "100%", background: "var(--bg-2)", borderLeft: "1px solid var(--color-border)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", flex: 1 }}>History</span>
          <button onClick={onNew} className="ss-btn ss-btn-ghost" style={{ padding: 6, color: "var(--color-primary)" }} aria-label="New">
            <Plus size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {threads.length === 0 ? (
            <div style={{ padding: 16, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>No conversations yet.</div>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                  background: t.id === activeId ? "var(--bg-3)" : "transparent",
                  cursor: "pointer", marginBottom: 2,
                }}
                onClick={() => onOpen(t.id)}
              >
                <MessageSquare size={13} style={{ color: t.id === activeId ? "var(--color-primary)" : "var(--color-muted-foreground)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>
                    {t.turns.length} turns
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}
                  className="ss-btn ss-btn-ghost"
                  style={{ padding: 4 }}
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
