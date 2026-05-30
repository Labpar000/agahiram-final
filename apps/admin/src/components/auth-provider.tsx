'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminPhone, type UserProfile } from '@agahiram/shared';
import { Spinner, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAdminSocket } from '@/lib/use-admin-socket';

interface AuthState {
  me: UserProfile | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  me: null,
  isLoading: true,
  refetch: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

/**
 * Verifies on first paint that the cookie-based session is an admin/moderator.
 * If not, kicks the user back to /login. The middleware only checks _presence_
 * of a cookie; this is the role-level gate.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [isLoading, setLoading] = useState(true);

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/');

  const refetch = async () => {
    setLoading(true);
    const r = await apiClient.get<UserProfile>('/auth/me');
    setLoading(false);
    if (r.success && r.data) {
      const role = r.data.role as string;
      const isElevated = role === 'admin' || role === 'moderator';
      if (!isElevated || !isAdminPhone(r.data.phone)) {
        toast.error('این حساب اجازه‌ی ورود به پنل ادمین را ندارد.');
        await apiClient.post('/auth/logout');
        router.replace('/login');
        return;
      }
      setMe(r.data);
    } else {
      setMe(null);
      if (!isPublic) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  };

  useEffect(() => {
    if (isPublic) {
      setLoading(false);
      return;
    }
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublic]);

  useEffect(() => {
    if (isPublic || !me) return;

    const refresh = () => {
      void apiClient.post('/auth/refresh', undefined, { silent401: true });
    };

    const interval = setInterval(refresh, 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isPublic, me]);

  const logout = async () => {
    await apiClient.post('/auth/logout');
    setMe(null);
    router.replace('/login');
  };

  useAdminSocket(!!me && !isPublic);

  if (!isPublic && isLoading && !me) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <AuthCtx.Provider value={{ me, isLoading, refetch, logout }}>{children}</AuthCtx.Provider>;
}
