import { http } from './http';
import type { FoodBatchUploadResult, FoodPhotoDay, FoodPhotoComment } from '../types/food';

const createTrackId = () => {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  return `track-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const getFoodPhotos = () => {
  return http.get<FoodPhotoDay[]>('/api/v1/food/photos');
};

export const getFoodPhotoComments = (groupId: string) => {
  return http.get<FoodPhotoComment[]>(`/api/v1/food/groups/${groupId}/comments`);
};

export const addFoodPhotoComment = (groupId: string, content: string) => {
  return http.post<FoodPhotoComment>(`/api/v1/food/groups/${groupId}/comments`, {
    content,
  });
};

export const uploadFoodPhotos = async (files: File[], comment?: string, shotDate?: string) => {
  const formData = new FormData();
  const trackId = createTrackId();

  files.forEach((file) => {
    formData.append('files', file);
  });
  if (comment && comment.trim()) {
    formData.append('comment', comment.trim());
  }
  if (shotDate) {
    formData.append('shot_date', shotDate);
  }

  return http.post<FoodBatchUploadResult>('/api/v1/food/photos', formData, {
    timeout: 120000,
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Track-Id': trackId,
    },
  });
};