// Default provider when user first connects
export const DEFAULT_CHAT_PROVIDER: string = "openai";

// Default model (in provider/model format)
export const DEFAULT_CHAT_MODEL: string = "openai/gpt-4o";

export interface ChatModel {
  id: string;
  name: string;
}

// Models are now fetched dynamically from /api/byorouter/models
// based on the user's connected providers
