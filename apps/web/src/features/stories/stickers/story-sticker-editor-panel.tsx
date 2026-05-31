'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { GiphyPicker } from './giphy-picker';

export function StoryStickerEditorPanel({
  onAdd,
}: {
  onAdd: (sticker: {
    type: string;
    payload: Record<string, unknown>;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
  }) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<'poll' | 'quiz' | 'slider' | 'link' | 'question' | 'info' | 'gif'>(
    'poll',
  );

  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['بله', 'خیر', '', '']);

  const [quizQ, setQuizQ] = useState('');
  const [quizOpts, setQuizOpts] = useState(['', '', '', '']);
  const [quizCorrect, setQuizCorrect] = useState(0);

  const [sliderQ, setSliderQ] = useState('چقدر دوست داشتید؟');
  const [sliderEmoji, setSliderEmoji] = useState('🔥');

  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('مشاهده');

  const [question, setQuestion] = useState('سوال شما؟');

  const [hashtag, setHashtag] = useState('');
  const [mentionQ, setMentionQ] = useState('');
  const [countdownTitle, setCountdownTitle] = useState('رویداد');
  const [countdownAt, setCountdownAt] = useState('');
  const [cityId, setCityId] = useState('');
  const [productPostId, setProductPostId] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-search-mention', mentionQ],
    queryFn: async () => {
      const r = await apiClient.get<
        Array<{ id: string; username: string | null; avatar: string | null }>
      >('/users/search', { q: mentionQ });
      return r.data ?? [];
    },
    enabled: mentionQ.trim().length >= 2,
  });

  const { data: myPosts } = useQuery({
    queryKey: ['my-posts-product', me?.username],
    queryFn: async () => {
      if (!me?.username) return [];
      const r = await apiClient.get<{ data: Array<{ id: string; title: string }> }>(
        `/posts/user/${me.username}?limit=20`,
      );
      return r.data?.data ?? [];
    },
    enabled: !!me?.username,
  });

  const { data: cities } = useQuery({
    queryKey: ['city-search-sticker', cityId],
    queryFn: async () => {
      const r = await apiClient.get<Array<{ id: string; name: string }>>('/locations/search', {
        q: cityId,
      });
      return r.data ?? [];
    },
    enabled: cityId.trim().length >= 2,
  });

  const pollOptions = pollOpts.map((o) => o.trim()).filter(Boolean);

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto text-xs">
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['poll', 'نظرسنجی'],
            ['quiz', 'آزمون'],
            ['slider', 'اسلایدر'],
            ['link', 'لینک'],
            ['question', 'سوال'],
            ['info', 'اطلاعات'],
            ['gif', 'GIF'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-2 py-0.5 ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'poll' ? (
        <div className="space-y-1">
          <Input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="سوال" />
          {pollOpts.map((o, i) => (
            <Input
              key={i}
              value={o}
              onChange={(e) =>
                setPollOpts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
              }
              placeholder={`گزینه ${i + 1}`}
            />
          ))}
          <Button
            size="sm"
            variant="secondary"
            disabled={pollOptions.length < 2}
            onClick={() =>
              onAdd({
                type: 'POLL',
                payload: { question: pollQ || '؟', options: pollOptions },
                y: 0.55,
              })
            }
          >
            افزودن نظرسنجی
          </Button>
        </div>
      ) : null}

      {tab === 'quiz' ? (
        <div className="space-y-1">
          <Input
            value={quizQ}
            onChange={(e) => setQuizQ(e.target.value)}
            placeholder="سوال آزمون"
          />
          {quizOpts.map((o, i) => (
            <div key={i} className="flex gap-1">
              <input
                type="radio"
                checked={quizCorrect === i}
                onChange={() => setQuizCorrect(i)}
                aria-label={`پاسخ درست ${i + 1}`}
              />
              <Input
                value={o}
                onChange={(e) =>
                  setQuizOpts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                }
                placeholder={`گزینه ${i + 1}`}
                className="flex-1"
              />
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const opts = quizOpts.map((x) => x.trim()).filter(Boolean);
              if (opts.length < 2) return;
              onAdd({
                type: 'QUIZ',
                payload: {
                  question: quizQ || '؟',
                  options: opts,
                  correctIndex: Math.min(quizCorrect, opts.length - 1),
                },
                y: 0.5,
              });
            }}
          >
            افزودن آزمون
          </Button>
        </div>
      ) : null}

      {tab === 'slider' ? (
        <div className="space-y-1">
          <Input value={sliderQ} onChange={(e) => setSliderQ(e.target.value)} />
          <Input
            value={sliderEmoji}
            onChange={(e) => setSliderEmoji(e.target.value)}
            placeholder="ایموجی"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onAdd({
                type: 'SLIDER',
                payload: { question: sliderQ, emoji: sliderEmoji },
                y: 0.6,
              })
            }
          >
            افزودن اسلایدر
          </Button>
        </div>
      ) : null}

      {tab === 'link' ? (
        <div className="space-y-1">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
          />
          <Input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="متن دکمه"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onAdd({ type: 'LINK', payload: { url: linkUrl, label: linkLabel }, y: 0.7 })
            }
          >
            افزودن لینک
          </Button>
        </div>
      ) : null}

      {tab === 'question' ? (
        <div className="space-y-1">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAdd({ type: 'QUESTION', payload: { question }, y: 0.5 })}
          >
            افزودن جعبه سوال
          </Button>
        </div>
      ) : null}

      {tab === 'info' ? (
        <div className="space-y-2">
          <div>
            <p className="mb-1 font-medium">هشتگ</p>
            <Input
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="#tag"
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-1"
              onClick={() =>
                onAdd({
                  type: 'HASHTAG',
                  payload: { tag: hashtag.replace(/^#/, '') },
                  y: 0.35,
                })
              }
            >
              هشتگ
            </Button>
          </div>
          <div>
            <p className="mb-1 font-medium">منشن</p>
            <Input
              value={mentionQ}
              onChange={(e) => setMentionQ(e.target.value)}
              placeholder="@user"
            />
            <ul className="mt-1 max-h-20 overflow-y-auto">
              {(users ?? []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full rounded px-1 py-0.5 text-start hover:bg-muted"
                    onClick={() =>
                      onAdd({
                        type: 'MENTION',
                        payload: { username: u.username, userId: u.id },
                        y: 0.4,
                      })
                    }
                  >
                    @{u.username}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">مکان</p>
            <Input
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              placeholder="نام شهر"
            />
            <ul className="mt-1 max-h-20 overflow-y-auto">
              {(cities ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded px-1 py-0.5 text-start hover:bg-muted"
                    onClick={() =>
                      onAdd({
                        type: 'LOCATION',
                        payload: { cityId: c.id, cityName: c.name },
                        y: 0.65,
                      })
                    }
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onAdd({
                type: 'TIME',
                payload: {
                  label: new Date().toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                y: 0.25,
              })
            }
          >
            زمان الان
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onAdd({
                type: 'DATE',
                payload: { label: new Date().toLocaleDateString('fa-IR') },
                y: 0.3,
              })
            }
          >
            تاریخ امروز
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const pos = await new Promise<GeolocationPosition | null>((resolve) => {
                if (!navigator.geolocation) resolve(null);
                else
                  navigator.geolocation.getCurrentPosition(
                    (p) => resolve(p),
                    () => resolve(null),
                  );
              });
              const lat = pos?.coords.latitude ?? 35.6892;
              const lon = pos?.coords.longitude ?? 51.389;
              const r = await apiClient.get<{ tempC: number; label: string }>(
                '/integrations/weather',
                { lat, lon },
              );
              const w = r.data;
              if (w) {
                onAdd({
                  type: 'WEATHER',
                  payload: { tempC: w.tempC, label: w.label },
                  y: 0.28,
                });
              }
            }}
          >
            آب‌وهوا (GPS)
          </Button>
          <div>
            <p className="mb-1 font-medium">شمارش معکوس</p>
            <Input value={countdownTitle} onChange={(e) => setCountdownTitle(e.target.value)} />
            <Input
              type="datetime-local"
              value={countdownAt}
              onChange={(e) => setCountdownAt(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-1"
              onClick={() =>
                onAdd({
                  type: 'COUNTDOWN',
                  payload: {
                    title: countdownTitle,
                    endsAt: countdownAt
                      ? new Date(countdownAt).toISOString()
                      : new Date(Date.now() + 86400000).toISOString(),
                  },
                  y: 0.45,
                })
              }
            >
              شمارش معکوس
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAdd({ type: 'NOTIFY', payload: {}, y: 0.75 })}
          >
            دکمه «اعلان پست‌های بعدی»
          </Button>
          <div>
            <p className="mb-1 font-medium">آگهی (Product)</p>
            <select
              className="w-full rounded-lg border border-border bg-background px-2 py-1"
              value={productPostId}
              onChange={(e) => setProductPostId(e.target.value)}
            >
              <option value="">انتخاب آگهی</option>
              {(myPosts ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              className="mt-1"
              disabled={!productPostId}
              onClick={() => {
                const post = (myPosts ?? []).find((p) => p.id === productPostId);
                onAdd({
                  type: 'PRODUCT',
                  payload: { postId: productPostId, title: post?.title ?? 'آگهی' },
                  y: 0.72,
                });
              }}
            >
              استیکر آگهی
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'gif' ? (
        <GiphyPicker
          onPick={(g) =>
            onAdd({
              type: 'GIF',
              payload: { url: g.url, previewUrl: g.previewUrl, giphyId: g.id },
              y: 0.5,
              scale: 1.2,
            })
          }
        />
      ) : null}
    </div>
  );
}
