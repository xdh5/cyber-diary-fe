export interface ChatLog {
  id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SendChatPayload {
  message: string;
  image_urls?: string[];
  attachments?: File[];
}

export interface ChatReply {
  answer: string;
}

export interface AgentSettings {
  agent_name: string;
  agent_system_prompt?: string | null;
}

export interface AgentSettingsUpdate {
  agent_name?: string;
  agent_system_prompt?: string;
}
