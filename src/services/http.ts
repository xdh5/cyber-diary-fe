import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import type { LoginRequest, AuthResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const getToken = () => localStorage.getItem('access_token');

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.status === 204) {
      return null;
    }
    return response.data;
  },
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请稍后重试');
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const message = data?.detail || `API error: ${status}`;
      throw new HttpError(status, message);
    }

    throw error;
  }
);

export const http = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.get<T>(url, config);
    return response as T;
  },
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, config);
    return response as T;
  },
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, config);
    return response as T;
  },
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.patch<T>(url, data, config);
    return response as T;
  },
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, config);
    return response as T;
  },
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const getAuthToken = getToken;

export const loginRequest = async (payload: LoginRequest): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/api/v1/auth/login', new URLSearchParams(payload as any), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response as unknown as AuthResponse;
};