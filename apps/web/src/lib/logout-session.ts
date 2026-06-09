import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import { useAuthStore } from './auth-store';
import { disconnectCallSocket } from './call-socket';
import { disconnectSocket } from './socket';

/** Clear client auth state without calling the API or navigating away. */
export function clearLocalSession(queryClient?: QueryClient) {
  useAuthStore.getState().logout();
  void useAuthStore.persist.clearStorage();
  disconnectSocket();
  disconnectCallSocket();
  queryClient?.setQueryData(['auth', 'me'], null);
  queryClient?.clear();
}

/**
 * End the user session: revoke tokens server-side, clear all client state, redirect to login.
 * Local cleanup always runs even if the logout API call fails.
 */
export async function endUserSession(queryClient?: QueryClient) {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    /* proceed — cookies may already be cleared or the network may be down */
  } finally {
    clearLocalSession(queryClient);
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }
}
