import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api';

interface AuthMe {
  username?: string | null;
}

export default async function MyProfilePage() {
  const res = await serverApi<AuthMe>('/auth/me');

  if (!res.success || !res.data) {
    redirect('/login');
  }

  if (!res.data.username) {
    redirect('/onboarding');
  }

  redirect(`/profile/${res.data.username}`);
}
