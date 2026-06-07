import { api } from "../api-client";
import type { Channel, ChannelMessage, Community } from "../types";

export const communitiesStore = {
  async list(): Promise<Community[]> {
    try {
      const { communities } = await api.getCommunities();
      return communities ?? [];
    } catch (e) {
      console.error("Error loading communities:", e);
      return [];
    }
  },

  async get(id: string): Promise<Community | undefined> {
    try {
      const { community } = await api.getCommunity(id);
      return community;
    } catch {
      return undefined;
    }
  },

  async create(input: { name: string; description: string; category: string; tags: string[]; iconChar?: string }): Promise<Community> {
    const { community } = await api.createCommunity(input);
    return community;
  },

  async toggleJoin(id: string): Promise<Community | undefined> {
    await api.toggleCommunityJoin(id);
    return this.get(id);
  },

  async channels(communityId: string): Promise<Channel[]> {
    try {
      const { channels } = await api.getCommunityChannels(communityId);
      return channels ?? [];
    } catch (e) {
      console.error("Error loading channels:", e);
      return [];
    }
  },

  async channelByName(communityId: string, name: string): Promise<Channel | undefined> {
    const list = await this.channels(communityId);
    return list.find((ch) => ch.name === name);
  },

  async channelMessages(channelId: string): Promise<ChannelMessage[]> {
    try {
      const { messages } = await api.getChannelMessages(channelId);
      return messages ?? [];
    } catch (e) {
      console.error("Error loading channel messages:", e);
      return [];
    }
  },

  async postChannel(channelId: string, text: string): Promise<ChannelMessage> {
    const { message } = await api.sendChannelMessage(channelId, text);
    return message;
  },
};
