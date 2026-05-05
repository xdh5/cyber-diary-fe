import axiosInstance from './axiosInstance';

export interface Diary {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  title: string;
  content: string;
}

export interface UpdateDiaryRequest {
  title?: string;
  content?: string;
}

export const diaryApi = {
  getAll: async (): Promise<Diary[]> => {
    return axiosInstance.get('/api/diaries');
  },

  getById: async (id: string): Promise<Diary> => {
    return axiosInstance.get(`/api/diaries/${id}`);
  },

  create: async (data: CreateDiaryRequest): Promise<Diary> => {
    return axiosInstance.post('/api/diaries', data);
  },

  update: async (id: string, data: UpdateDiaryRequest): Promise<Diary> => {
    return axiosInstance.put(`/api/diaries/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return axiosInstance.delete(`/api/diaries/${id}`);
  },
};
