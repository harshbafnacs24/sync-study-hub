import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, Plus, X, Loader2, MessageSquare, Pin } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui-kit/Card";
import { useConversations, useCommunities, useUnreadNotifications, useLiveInbox } from "../../lib/hooks/use-messaging";
import { api } from "../../lib/api-client";
import { DEV_OFFLINE_MODE } from "../../lib/dev-mode";
import { messagesStore } from "../../lib/store/messages";
import { Avatar, UnreadBadge, timeAgo } from "../../components/messaging/Avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Sync & Study" }] }),
  component: MessagesPage,
});

type Tab = "dms" | "communities";

// ─── New DM search modal ──────────────────────────────────────────────────────

function NewDMModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; email: string; avatar: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const startConv = useMutation({
    mutationFn: async (peerId: string) => {
      if (DEV_OFFLINE_MODE) {
        const id = `conv_${peerId}`;
        return { conversation: { id, peerId, peerName: results.find(r => r.id === peerId)?.name ?? "User" } };
      }
      return api.startConversation(peerId);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      const convId = data?.conversation?.id;
      if (convId) {
        onClose();
        navigate({ to: "/messages/dm/$id", params: { id: convId } });
      }
    },
    onError: () => toast.error("Could not start conversation"),
  });

  const search = async (val: string) => {
    setQ(val);
    if (val.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      if (DEV_OFFLINE_MODE) {
        // Offline: search mock peers
        const peers = messagesStore.conversations()
          .map((c: any) => ({ id: c.peerId, name: c.peer?.name ?? c.peerId, email: "", avatar: null }))
          .filter((p: any) => p.name.toLowerCase().includes(val.toLowerCase()));
        setResults(peers);
      } else {
        const { users } = await api.searchUsers(val);
        setResults(users);
      }
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", background: "var(--bg-1)", borderRadius: "20px 20px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        {/* Handle */}
        <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", display: "inline-block" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px" }}>
          <div className="ss-display" style={{ fontWeight: 800, fontSize: "1rem" }}>New Message</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: "0 16px 12px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-foreground)" }} />
          <input
            autoFocus
            placeholder="Search by name or email…"
            value={q}
            onChange={e => search(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 36px", background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-foreground)", fontSize: "0.88rem", boxSizing: "border-box", outline: "none" }}
          />
        </div>
        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 28px" }}>
          {searching && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--color-muted-foreground)" }} />
            </div>
          )}
          {!searching && q.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, fontSize: "0.85rem", color: "var(--color-muted-foreground)" }}>
              No users found for "{q}"
            </div>
          )}
          {!searching && q.length < 2 && (
            <div style={{ textAlign: "center", padding: 20, fontSize: "0.82rem", color: "var(--color-muted-foreground)" }}>
              Type at least 2 characters to search
            </div>
          )}
          {results.map(user => (
            <div key={user.id} onClick={() => startConv.mutate(user.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
              <Avatar name={user.name} avatar={user.avatar} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{user.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>{user.email}</div>
              </div>
              {startConv.isPending ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--color-muted-foreground)" }} />
              ) : (
                <MessageSquare size={16} style={{ color: "var(--color-primary)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MessagesPage() {
  const [tab, setTab] = useState<Tab>("dms");
  const [q, setQ] = useState("");
  const [showNewDM, setShowNewDM] = useState(false);
  const conversations = useConversations();
  const communities = useCommunities();
  const { data: unread = 0 } = useUnreadNotifications();
  useLiveInbox();

  const convList = (conversations.data ?? []).filter(c =>
    !q || (c as any).peerName?.toLowerCase().includes(q.toLowerCase()) || c.lastPreview?.toLowerCase().includes(q.toLowerCase())
  );

  const commList = (communities.data ?? []).filter(c =>
    !q || c.name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        sub={unread > 0 ? `${unread} unread` : "All caught up"}
        right={
          <button
            className="ss-btn ss-btn-primary"
            style={{ padding: "7px 12px", fontSize: "0.75rem" }}
            onClick={() => setShowNewDM(true)}
          >
            <Plus size={14} /> New
          </button>
        }
      />

      <div className="ss-body">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["dms", "communities"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? "ss-btn ss-btn-primary" : "ss-btn ss-btn-outline"}
              style={{ padding: "6px 16px", fontSize: "0.78rem" }}>
              {t === "dms" ? "Direct Messages" : "Communities"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-foreground)" }} />
          <input
            placeholder={tab === "dms" ? "Search conversations…" : "Search communities…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 10, color: "var(--color-foreground)", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* DMs */}
        {tab === "dms" && (
          <>
            {conversations.isLoading && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-muted-foreground)" }} />
              </div>
            )}
            {!conversations.isLoading && convList.length === 0 && (
              <EmptyState
                title="No messages yet"
                description="Start a conversation with a friend by tapping the + New button above."
                action={
                  <button className="ss-btn ss-btn-primary" style={{ padding: "8px 18px", fontSize: "0.82rem" }} onClick={() => setShowNewDM(true)}>
                    <Plus size={14} /> Start a DM
                  </button>
                }
              />
            )}
            {convList.map((conv: any) => (
              <Link key={conv.id} to="/messages/dm/$id" params={{ id: conv.id }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={conv.peerName ?? conv.peerId} avatar={conv.peerAvatar ?? null} size={44} online={conv.peerOnline} />
                  {conv.unread > 0 && <UnreadBadge count={conv.unread} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                      {conv.peerName ?? conv.peerId}
                      {conv.pinned && <Pin size={10} style={{ color: "var(--color-primary)", opacity: 0.7 }} />}
                    </div>
                    <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)" }}>
                      {timeAgo(conv.lastMessageAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.lastPreview?.startsWith("__ROOM_INVITE__") ? "📚 Room invite" : (conv.lastPreview || "No messages yet")}
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}

        {/* Communities */}
        {tab === "communities" && (
          <>
            {communities.isLoading && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--color-muted-foreground)" }} />
              </div>
            )}
            {!communities.isLoading && commList.length === 0 && (
              <EmptyState
                title="No communities yet"
                description="Join a community from the Spaces tab to see channels here."
              />
            )}
            {commList.map((c: any) => (
              <Link key={c.id} to="/communities/$id" params={{ id: c.id }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                  {c.iconChar ?? c.name?.[0] ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
                    {c.memberCount ?? 0} members · {c.category}
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
    </>
  );
}
