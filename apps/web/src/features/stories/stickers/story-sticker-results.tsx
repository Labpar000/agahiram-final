'use client';

import { formatPersianNumber } from '@agahiram/shared';

export interface StickerResultRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  summary?: {
    options?: string[];
    counts?: number[];
    percents?: number[];
    total?: number;
    average?: number;
    emoji?: string;
    answers?: string[];
  };
  responses?: Array<{
    userId: string;
    user: { id: string; username: string | null; avatar: string | null };
    value: { text?: string; voteIndex?: number; sliderValue?: number };
  }>;
}

export function StoryStickerResultsPanel({ results }: { results: StickerResultRow[] }) {
  const interactive = results.filter((r) =>
    ['POLL', 'QUIZ', 'SLIDER', 'QUESTION'].includes(r.type),
  );
  if (!interactive.length) return null;

  const quizCorrectIndex = (payload: Record<string, unknown>) =>
    typeof payload.correctIndex === 'number' ? payload.correctIndex : undefined;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <h4 className="text-sm font-semibold">نتایج استیکرها</h4>
      {interactive.map((r) => {
        const correctIdx = r.type === 'QUIZ' ? quizCorrectIndex(r.payload) : undefined;
        return (
          <div key={r.id} className="rounded-lg bg-muted/60 p-3 text-xs">
            <p className="mb-2 font-medium">{(r.payload.question as string) ?? r.type}</p>
            {(r.type === 'POLL' || r.type === 'QUIZ') && r.summary?.options ? (
              <ul className="space-y-1">
                {r.summary.options.map((opt, i) => (
                  <li key={opt}>
                    <div className="flex justify-between gap-2">
                      <span>
                        {opt}
                        {correctIdx === i ? ' ✓' : ''}
                      </span>
                      <span>{formatPersianNumber(r.summary?.percents?.[i] ?? 0)}٪</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${r.summary?.percents?.[i] ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
                <p className="mt-1 text-muted-foreground">
                  {formatPersianNumber(r.summary.total ?? 0)} پاسخ
                </p>
              </ul>
            ) : null}
            {r.type === 'SLIDER' && r.summary ? (
              <p>
                میانگین: {formatPersianNumber(Math.round((r.summary.average ?? 0) * 100))}٪{' '}
                {r.summary.emoji} — {formatPersianNumber(r.summary.total ?? 0)} رأی
              </p>
            ) : null}
            {r.type === 'QUESTION' && (r.responses?.length ?? 0) > 0 ? (
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {r.responses!.map((resp) => (
                  <li key={resp.userId} className="rounded bg-background px-2 py-1">
                    <span className="font-medium text-primary">
                      @{resp.user.username ?? resp.userId.slice(0, 8)}
                    </span>
                    : {(resp.value as { text?: string }).text ?? '—'}
                  </li>
                ))}
              </ul>
            ) : r.type === 'QUESTION' && r.summary?.answers?.length ? (
              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {r.summary.answers.map((a, i) => (
                  <li key={i} className="rounded bg-background px-2 py-1">
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
