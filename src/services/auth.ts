import { http, setAuthToken, getAuthToken, loginRequest } from './http';
import type { SendCodeRequest, RegisterRequest, SetPasswordRequest, AuthResponse, UpdateProfileRequest, UserInfo } from '../types/api';

export const sendCode = (payload: SendCodeRequest) => {
  return http.post('/api/v1/auth/send-code', payload);
};

export const register = (payload: RegisterRequest) => {
  return http.post('/api/v1/auth/register', payload);
};

export const login = async (email: string, password: string) => {
  const response = await loginRequest({ username: email, password });
  setAuthToken(response.access_token);
  return response;
};

export const googleVerify = async (credential: string) => {
  const response = await http.post<AuthResponse>('/api/v1/auth/google/verify', { credential });
  setAuthToken(response.access_token);
  return response;
};

export const setPassword = (payload: SetPasswordRequest) => {
  return http.post('/api/v1/auth/set-password', payload);
};

export const getCurrentUser = () => {
  return http.get<UserInfo>('/api/v1/auth/me');
};

export const updateProfile = (payload: UpdateProfileRequest) => {
  return http.patch<UserInfo>('/api/v1/auth/me', payload);
};

export const isAuthenticated = () => {
  return getAuthToken() !== null;
};

export const logout = () => {
  setAuthToken(null);
};