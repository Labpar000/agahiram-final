import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@agahiram/shared';
import { clearAuthCookies } from './api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        clearAuthCookies();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'agahiram-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
