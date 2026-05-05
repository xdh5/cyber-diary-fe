import axiosInstance from './axiosInstance';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return axiosInstance.post('/api/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    return axiosInstance.post('/api/auth/register', data);
  },

  logout: async (): Promise<void> => {
    return axiosInstance.post('/api/auth/logout');
  },

  getProfile: async (): Promise<LoginResponse['user']> => {
    return axiosInstance.get('/api/auth/profile');
  },
};
