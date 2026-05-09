import { http } from './http';
import type {
  AgentSettings,
  AgentSettingsUpdate,
  ChatLog,
  ChatReply,
  SendChatPayload,
} from '../types/chat';

export const sendChatMessage = (payload: string | SendChatPayload) => {
  if (typeof payload === 'string') {
    return http.post<ChatReply>('/api/chat', { message: payload }, { timeout: 60000 });
  }

  const hasAttachments = (payload.attachments?.length || 0) > 0 || (payload.image_urls?.length || 0) > 0;
  if (!hasAttachments) {
    return http.post<ChatReply>('/api/chat', { message: payload.message }, { timeout: 60000 });
  }

  const formData = new FormData();
  formData.append('message', payload.message);
  (payload.image_urls || []).forEach((url) => formData.append('image_urls', url));
  (payload.attachments || []).forEach((file) => formData.append('attachments', file));
  return http.post<ChatReply>('/api/chat', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
};

export const getChatLogs = (day: string) => {
  return http.get<ChatLog[]>(`/api/chat/logs?day=${encodeURIComponent(day)}`);
};

export const getChatLogsPage = (params?: { limit?: number; beforeId?: number }) => {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.beforeId) search.set('before_id', String(params.beforeId));
  const query = search.toString();
  const path = query ? `/api/chat/logs/page?${query}` : '/api/chat/logs/page';
  return http.get<ChatLog[]>(path);
};

export const uploadChatImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return http.post<{ url: string }>('/api/v1/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAgentSettings = () => {
  return http.get<AgentSettings>('/api/chat/agent/settings');
};

export const updateAgentSettings = (payload: AgentSettingsUpdate) => {
  return http.patch<AgentSettings>('/api/chat/agent/settings', payload);
};

export const searchChatLogs = (query: string, limit = 50) => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return http.get<ChatLog[]>(`/api/chat/logs/search?${params.toString()}`);
};