import { http } from './http';

export interface Countdown {
  id: number;
  name: string;
  target_date: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface CountdownCreate {
  name: string;
  target_date: string;
  emoji?: string;
}

export interface CountdownUpdate {
  name?: string;
  target_date?: string;
  emoji?: string;
}

export const getCountdowns = () => {
  return http.get<Countdown[]>('/api/v1/countdown/');
};

export const getCountdown = (id: number) => {
  return http.get<Countdown>(`/api/v1/countdown/${id}`);
};

export const createCountdown = (data: CountdownCreate) => {
  return http.post<Countdown>('/api/v1/countdown/', data);
};

export const updateCountdown = (id: number, data: CountdownUpdate) => {
  return http.patch<Countdown>(`/api/v1/countdown/${id}`, data);
};

export const deleteCountdown = (id: number) => {
  return http.delete(`/api/v1/countdown/${id}`);
};