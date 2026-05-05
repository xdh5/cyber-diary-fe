import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/env';
import { useAuthStore } from '@/store/authStore';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: env.baseUrl,
  timeout: env.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const { logout } = useAuthStore.getState();

    if (error.response) {
      switch (error.response.status) {
        case 401:
          await logout();
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
