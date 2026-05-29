import { FollowersClient } from '../followers-client';

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <FollowersClient username={username} type="following" />;
}
