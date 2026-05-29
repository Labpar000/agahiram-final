import type { Metadata } from 'next';
import { ProfileClient } from './profile-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  // Intentionally synthetic — we do NOT block the navigation on an upstream
  // fetch here. Hitting the API for every profile open made bottom-nav tab
  // switches feel sluggish (each prefetch + actual click had to wait on a
  // round trip to the Iran VPS). Crawlers still get a meaningful title,
  // and the rich profile data is rendered client-side immediately after.
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `پروفایل @${username} در آگهی‌گرام`,
    openGraph: {
      title: `@${username} | آگهی‌گرام`,
      description: `پروفایل @${username} در آگهی‌گرام`,
      type: 'profile',
    },
  };
}

/**
 * User profile page. Fully client-rendered so tab switches don't have to
 * wait on a personalised upstream fetch — `loading.tsx` covers the brief
 * client transition and React Query hydrates the actual profile data.
 */
export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ProfileClient username={username} />;
}
