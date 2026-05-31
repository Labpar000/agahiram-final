'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@agahiram/ui';

const CommentSection = dynamic(
  () => import('@/components/comment-section').then((m) => m.CommentSection),
  { loading: () => <Skeleton className="mx-4 h-32 w-auto rounded-2xl" /> },
);

type Props = {
  postId: string;
  isOwner: boolean;
  commentsEnabled: boolean;
  highlightCommentId: string | null;
};

/** Defer comments fetch until section nears viewport (C3). */
export function LazyComments(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { rootMargin: '160px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} id="post-comments">
      {show ? <CommentSection {...props} /> : <Skeleton className="mx-4 h-32 rounded-2xl" />}
    </div>
  );
}
