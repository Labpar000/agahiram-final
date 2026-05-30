'use client';

import Link from 'next/link';

const MENTION_SPLIT = /(@[a-zA-Z0-9_.]+)/g;

export function CommentContent({ content }: { content: string }) {
  const parts = content.split(MENTION_SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={i}
              href={`/profile/${username}`}
              className="font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
