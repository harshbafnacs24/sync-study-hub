import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, PriorityBadge } from "../../components/ui-kit/Card";
import { useTasks, useCreateTask, useToggleTask, useDeleteTask } from "../../lib/hooks/use-data";
import type { TaskPriority, TaskStatus } from "../../lib/store/tasks";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Sync & Study" }] }),
  component: TasksPage,
});

const FILTERS: { id: "all" | TaskStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "Doing" },
  { id: "done", label: "Done" },
];

function TasksPage() {
  const tasks = useTasks();
  const create = useCreateTask();
  const toggle = useToggleTask();
  const remove = useDeleteTask();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [open, setOpen] = useState(false);

  const visible = (tasks.data ?? []).filter((t) => filter === "all" || t.status === filter);
  const counts = (tasks.data ?? []).reduce(
    (acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }),
    {} as Record<TaskStatus, number>,
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Tasks"
        sub={`${counts.todo ?? 0} to do · ${counts.in_progress ?? 0} doing · ${counts.done ?? 0} done`}
        right={
          <button
            className="ss-btn ss-btn-primary"
            onClick={() => setOpen(true)}
            style={{ padding: "8px 12px", fontSize: "0.78rem" }}
          >
            <Plus size={14} /> New
          </button>
        }
      />

      <div className="ss-body">
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? "ss-chip ss-chip-accent" : "ss-chip"}
              style={{ cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={filter === "all" ? "No tasks yet" : "Nothing here"}
            description="Create a task to plan your study session."
            action={
              <button className="ss-btn ss-btn-primary" onClick={() => setOpen(true)} style={{ padding: "8px 14px", fontSize: "0.8rem" }}>
                <Plus size={14} /> New task
              </button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((t) => (
              <div key={t.id} className="ss-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => toggle.mutate(t.id)}
                  aria-label="Toggle"
                  style={{
                    width: 20, height: 20, borderRadius: 999,
                    border: "1.5px solid var(--color-border)",
                    background: t.status === "done" ? "var(--color-primary)" : "transparent",
                    cursor: "pointer", flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "var(--color-muted-foreground)" : "var(--color-foreground)" }}>
                    {t.title}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {t.subject && (
                      <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t.subject}
                      </span>
                    )}
                    {t.dueDate && (
                      <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)" }}>
                        Due {t.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
                <button
                  onClick={() => { remove.mutate(t.id); toast.success("Task deleted"); }}
                  className="ss-btn-ghost"
                  style={{ background: "none", border: 0, padding: 6, cursor: "pointer", color: "var(--color-muted-foreground)" }}
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <NewTaskSheet
          onClose={() => setOpen(false)}
          onCreate={(input) => {
            create.mutate(input, {
              onSuccess: () => { toast.success("Task added"); setOpen(false); },
              onError: () => toast.error("Could not create task"),
            });
          }}
          submitting={create.isPending}
        />
      )}
    </>
  );
}

function NewTaskSheet({
  onClose,
  onCreate,
  submitting,
}: {
  onClose: () => void;
  onCreate: (input: { title: string; priority: TaskPriority; dueDate?: string | null; subject?: string | null; notes?: string }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute", inset: 0, background: "oklch(0 0 0 / 0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-2)",
          width: "100%",
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          padding: 20, paddingBottom: 24,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="ss-display" style={{ fontWeight: 700, fontSize: "1.05rem" }}>New task</h3>
          <button onClick={onClose} className="ss-btn-ghost" style={{ background: "none", border: 0, color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onCreate({
              title: title.trim(),
              priority,
              subject: subject.trim() || null,
              dueDate: dueDate || null,
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="ss-field">
            <label className="ss-label">Title</label>
            <input className="ss-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Finish DSA chapter 4" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="ss-field">
              <label className="ss-label">Subject</label>
              <input className="ss-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="DSA" />
            </div>
            <div className="ss-field">
              <label className="ss-label">Due</label>
              <input className="ss-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="ss-field">
            <label className="ss-label">Priority</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={priority === p ? "ss-chip ss-chip-accent" : "ss-chip"}
                  style={{ cursor: "pointer", textTransform: "capitalize" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button className="ss-btn ss-btn-primary" type="submit" disabled={submitting || !title.trim()} style={{ marginTop: 6 }}>
            {submitting ? "Adding…" : "Add task"}
          </button>
        </form>
      </div>
    </div>
  );
}
