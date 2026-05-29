import { FollowersClient } from '../followers-client';

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <FollowersClient username={username} type="followers" />;
}
