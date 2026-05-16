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

export const countdownService = {
  // Get all countdowns
  async getCountdowns(): Promise<Countdown[]> {
    const response = await http.get('/api/v1/countdown/');
    return response.data;
  },

  // Create a new countdown
  async createCountdown(data: CountdownCreate): Promise<Countdown> {
    const response = await http.post('/api/v1/countdown/', data);
    return response.data;
  },

  // Get a specific countdown
  async getCountdown(id: number): Promise<Countdown> {
    const response = await http.get(`/api/v1/countdown/${id}`);
    return response.data;
  },

  // Update a countdown
  async updateCountdown(id: number, data: CountdownUpdate): Promise<Countdown> {
    const response = await http.patch(`/api/v1/countdown/${id}`, data);
    return response.data;
  },

  // Delete a countdown
  async deleteCountdown(id: number): Promise<void> {
    await http.delete(`/api/v1/countdown/${id}`);
  },
};
