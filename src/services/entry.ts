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