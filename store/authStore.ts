import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  accessToken: null,

  login: async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    set({ isLoggedIn: true, accessToken: token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({ isLoggedIn: false, accessToken: null });
  },

  initAuth: async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      set({ isLoggedIn: true, accessToken: token });
    }
  },
}));
