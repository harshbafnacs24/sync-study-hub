/**
 * Unified AI provider interface. Swap Gemini for Claude/OpenAI without
 * touching consumers. All providers implement chat() and stream().
 */
export interface AiMessage { role: "system" | "user" | "assistant"; content: string }
export interface AiProvider {
  name: string;
  chat(messages: AiMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
  stream(messages: AiMessage[], onToken: (t: string) => void, opts?: { temperature?: number; maxTokens?: number }): Promise<void>;
}
