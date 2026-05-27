'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  type CompleteProfileInput,
  type SendOtpInput,
  type VerifyOtpInput,
} from '@agahiram/shared';
import type { AuthTokens, UserProfile } from '@agahiram/shared';
import { apiClient, setAuthCookies } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { mockUser } from '@/lib/mock-data';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const fetchMe = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<UserProfile>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        return res.data;
      }
      if (process.env.NODE_ENV === 'development') {
        setUser(mockUser);
        return mockUser;
      }
      setUser(null);
      return null;
    },
    enabled: typeof window !== 'undefined',
    staleTime: 5 * 60 * 1000,
  });

  const sendOtp = useMutation({
    mutationFn: async (input: SendOtpInput) => {
      const parsed = sendOtpSchema.parse(input);
      return apiClient.post<{ message: string }>('/auth/otp/send', parsed);
    },
  });

  const verifyOtp = useMutation({
    mutationFn: async (input: VerifyOtpInput) => {
      const parsed = verifyOtpSchema.parse(input);
      const res = await apiClient.post<AuthTokens & { user: UserProfile; isNewUser: boolean }>(
        '/auth/otp/verify',
        parsed,
      );
      if (res.success && res.data) {
        setAuthCookies(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
      }
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
  });

  const completeProfile = useMutation({
    mutationFn: async (input: CompleteProfileInput) => {
      const parsed = completeProfileSchema.parse(input);
      const res = await apiClient.post<UserProfile>('/auth/profile', parsed);
      if (res.success && res.data) setUser(res.data);
      return res;
    },
  });

  const handleLogout = useCallback(() => {
    logout();
    queryClient.clear();
  }, [logout, queryClient]);

  return {
    user: user ?? fetchMe.data ?? null,
    isAuthenticated,
    isLoading: isLoading || fetchMe.isLoading,
    sendOtp,
    verifyOtp,
    completeProfile,
    logout: handleLogout,
    refetch: fetchMe.refetch,
  };
}
