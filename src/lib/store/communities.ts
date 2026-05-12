import { storage, newId } from "./storage";
import { SEED_COMMUNITIES, SEED_CHANNELS } from "./seed";
import { socketBus, SocketEvents } from "../socket";
import type { Channel, ChannelMessage, Community } from "../types";

const K_COMM = "comm.list";
const K_CHAN = "comm.channels";
const K_MSGS = "comm.messages";

function ensureSeed() {
  if (!storage.get<Community[] | null>(K_COMM, null)) storage.set(K_COMM, SEED_COMMUNITIES);
  if (!storage.get<Channel[] | null>(K_CHAN, null)) storage.set(K_CHAN, SEED_CHANNELS);
  if (!storage.get<Record<string, ChannelMessage[]> | null>(K_MSGS, null)) {
    const now = Date.now();
    const m = (id: string, ch: string, who: string, text: string, mAgo: number, system = false): ChannelMessage => ({
      id, channelId: ch, authorId: who, text, createdAt: new Date(now - mAgo * 60_000).toISOString(), system,
    });
    storage.set<Record<string, ChannelMessage[]>>(K_MSGS, {
      ch_dsa_general: [
        m("dg1", "ch_dsa_general", "p_aanya", "Anyone tackling sliding window today?", 120),
        m("dg2", "ch_dsa_general", "p_kabir", "Doing it after my 90-min DP block. Ping me at 7.", 110),
        m("dg3", "ch_dsa_general", "me",      "Same — I'll join the focus room.", 95),
      ],
      ch_dsa_progress: [
        m("dp1", "ch_dsa_progress", "p_arjun", "Day 14 — finished 6 graph problems, weak on union-find.", 240),
        m("dp2", "ch_dsa_progress", "p_aanya", "Day 14 — 4 sliding window + 2 reviews. Streak: 14.", 30),
        m("dp3", "ch_dsa_progress", "system",  "Aanya started a 50-min focus session in #session-links", 12, true),
      ],
      ch_dsa_resources: [
        m("dr1", "ch_dsa_resources", "p_kabir", "Pinned: Striver SDE sheet + LeetCode patterns repo.", 60 * 24),
      ],
      ch_web_general: [
        m("wg1", "ch_web_general", "p_kabir", "Anyone else seeing the React 19 form action edge case?", 90),
        m("wg2", "ch_web_general", "me",      "Yes — workaround with useTransition.", 80),
      ],
      ch_swm_sessions: [
        m("ws1", "ch_swm_sessions", "p_meera",  "Starting a 25-min Pomodoro at :00. Join in.", 6),
        m("ws2", "ch_swm_sessions", "system",   "Meera started a focus session", 6, true),
      ],
    });
  }
}

export const communitiesStore = {
  list(): Community[] { ensureSeed(); return storage.get<Community[]>(K_COMM, []); },
  get(id: string): Community | undefined {
    return communitiesStore.list().find((c) => c.id === id || c.slug === id);
  },
  create(input: { name: string; description: string; category: string; tags: string[]; iconChar?: string }): Community {
    ensureSeed();
    const c: Community = {
      id: newId(),
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: input.name,
      description: input.description,
      category: input.category,
      tags: input.tags,
      members: 1,
      iconChar: input.iconChar?.[0] ?? input.name[0]?.toUpperCase() ?? "•",
      joined: true,
    };
    const list = storage.get<Community[]>(K_COMM, []);
    storage.set(K_COMM, [c, ...list]);
    // bootstrap default channels
    const defaults = ["general", "resources", "daily-progress", "questions"];
    const channels = storage.get<Channel[]>(K_CHAN, []);
    const fresh: Channel[] = defaults.map((name) => ({
      id: newId(), communityId: c.id, name, topic: name === "general" ? "Community-wide chat" : undefined,
    }));
    storage.set(K_CHAN, [...fresh, ...channels]);
    return c;
  },
  toggleJoin(id: string): Community | undefined {
    const list = storage.get<Community[]>(K_COMM, []);
    const idx = list.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const next = { ...list[idx], joined: !list[idx].joined, members: list[idx].members + (list[idx].joined ? -1 : 1) };
    list[idx] = next;
    storage.set(K_COMM, list);
    return next;
  },

  channels(communityId: string): Channel[] {
    ensureSeed();
    return storage.get<Channel[]>(K_CHAN, []).filter((ch) => ch.communityId === communityId);
  },
  channelByName(communityId: string, name: string): Channel | undefined {
    return communitiesStore.channels(communityId).find((ch) => ch.name === name);
  },

  channelMessages(channelId: string): ChannelMessage[] {
    ensureSeed();
    const all = storage.get<Record<string, ChannelMessage[]>>(K_MSGS, {});
    return all[channelId] ?? [];
  },
  postChannel(channelId: string, text: string, opts: { system?: boolean; authorId?: string } = {}): ChannelMessage {
    ensureSeed();
    const all = storage.get<Record<string, ChannelMessage[]>>(K_MSGS, {});
    const msg: ChannelMessage = {
      id: newId(),
      channelId,
      authorId: opts.authorId ?? "me",
      text,
      createdAt: new Date().toISOString(),
      system: opts.system,
    };
    all[channelId] = [...(all[channelId] ?? []), msg];
    storage.set(K_MSGS, all);
    socketBus.emit(SocketEvents.ChannelMessage, { channelId, message: msg });
    return msg;
  },
};
