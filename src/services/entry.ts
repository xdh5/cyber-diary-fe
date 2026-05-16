import { http } from './http';
import type { Entry, EntryPayload } from '../types/entry';

export const getEntries = () => {
  return http.get<Entry[]>('/api/v1/entries/');
};

export const getEntry = (id: number) => {
  return http.get<Entry>(`/api/v1/entries/${id}`);
};

export const createEntry = (data: EntryPayload) => {
  return http.post<Entry>('/api/v1/entries/', data);
};

export const updateEntry = (id: number, data: EntryPayload) => {
  return http.put<Entry>(`/api/v1/entries/${id}`, data);
};

export const deleteEntry = (id: number) => {
  return http.delete(`/api/v1/entries/${id}`);
};

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return http.post<{ url: string }>('/api/v1/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export interface DiaryGenerateResult {
  content: string;
  title: string;
  date: string;
}

export const generateDiary = (data: { text?: string; image_urls?: string[]; date: string }) => {
  return http.post<DiaryGenerateResult>('/api/diary/generate', data);
};

export interface StreamDiaryEvent {
  status: 'generating' | 'streaming' | 'complete' | 'error';
  content?: string;
  delta?: string;
  title?: string;
  date?: string;
  message?: string;
}

export const generateDiaryStream = (
  data: { text?: string; image_urls?: string[]; date: string },
  onProgress: (event: StreamDiaryEvent) => void,
) => {
  return new Promise<DiaryGenerateResult>(async (resolve, reject) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const token = localStorage.getItem('access_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/api/diary/generate-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const parsed: StreamDiaryEvent = JSON.parse(line.substring(6));
              onProgress(parsed);

              if (parsed.status === 'complete') {
                resolve({
                  content: parsed.content || '',
                  title: parsed.title || '',
                  date: parsed.date || data.date,
                });
                return;
              } else if (parsed.status === 'error') {
                reject(new Error(parsed.message || '流式生成失败'));
                return;
              }
            } catch (error) {
              console.error('[Stream] 解析SSE消息失败:', error);
            }
          }
        }
      }

      reject(new Error('流式生成未正常完成'));
    } catch (error) {
      reject(error);
    }
  });
};