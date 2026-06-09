'use client';

// FIXED: IntersectionObserver-based active reel detection instead of manual scrollTop math.
// Always snap (even in landscape). IntersectionObserver threshold 0.7 per Instagram spec.
import { usePathname } from 'next/navigation';
import { ReelsViewer } from '@/components/reels-viewer';
import { fetchReelsPage } from '@/lib/query-definitions';

export default function ReelsPage() {
  const pathname = usePathname() ?? '/';
  const onReelsTab = pathname === '/reels';

  return <ReelsViewer queryKey={['reels']} queryFn={fetchReelsPage} playbackActive={onReelsTab} />;
}
