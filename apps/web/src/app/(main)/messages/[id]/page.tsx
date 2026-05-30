'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Camera, MessageSquare, Mic, Send } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  EmptyState,
  IconButton,
  Skeleton,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useUploadManager } from '@/lib/upload-manager';
import { ChatMessage } from '@/components/chat-message';

interface Message {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; username: string | null; avatar: string | null };
}

interface ConvHead {
  id: string;
  otherUser?: { id: string; username: string | null; avatar: string | null; isVerified?: boolean };
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { uploadFile } = useUploadManager();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: head } = useQuery({
    queryKey: ['conv-head', id],
    queryFn: async () => {
      const r = await apiClient.get<ConvHead>(`/messages/conversations/${id}/head`);
      return r.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['chat', id],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Message[]; meId?: string }>(
        `/messages/conversations/${id}`,
      );
      if (r.data?.meId) setMeId(r.data.meId);
      return r.data?.data ?? [];
    },
  });

  useEffect(() => {
    if (data) setMessages(data);
  }, [data]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length]);

  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const isFirstOfGroup = !prev || prev.senderId !== m.senderId;
      const isLastOfGroup = !next || next.senderId !== m.senderId;
      const isMine = m.senderId === 'me' || m.senderId === meId;
      return { ...m, isMine, isFirstOfGroup, isLastOfGroup };
    });
  }, [messages, meId]);

  const sendMessage = async (content: string, type: 'text' | 'image' | 'voice' = 'text') => {
    const tempId = 'temp-' + Date.now();
    setMessages((m) => [
      ...m,
      {
        id: tempId,
        content,
        type,
        senderId: 'me',
        createdAt: new Date().toISOString(),
        sender: { id: 'me', username: null, avatar: null },
      },
    ]);
    const r = await apiClient.post<{ message: Message }>('/messages', {
      conversationId: id,
      content,
      type,
    });
    if (r.success && r.data) {
      setMessages((m) => m.map((x) => (x.id === tempId ? r.data!.message : x)));
    } else {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      toast.error(r.error ?? 'ارسال پیام ناموفق بود');
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    const tmp = text;
    setText('');
    await sendMessage(tmp, 'text');
  };

  const sendImage = async (file: File) => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
      '/media/presign',
      { folder: 'messages', fileName: file.name, contentType: file.type, extension: ext },
    );
    if (!presign.success || !presign.data) {
      toast.error('خطا در آپلود تصویر');
      return;
    }
    const ok = await uploadFile({
      label: 'ارسال تصویر',
      url: presign.data.uploadUrl,
      file,
      contentType: file.type,
    });
    if (!ok) return;
    await apiClient.post('/media/confirm', { key: presign.data.key });
    await sendMessage(presign.data.publicUrl, 'image');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
          '/media/presign',
          { folder: 'messages', fileName: file.name, contentType: file.type, extension: 'webm' },
        );
        if (!presign.success || !presign.data) {
          toast.error('خطا در آپلود صدا');
          return;
        }
        const ok = await uploadFile({
          label: 'ارسال پیام صوتی',
          url: presign.data.uploadUrl,
          file,
          contentType: file.type,
        });
        if (!ok) return;
        await apiClient.post('/media/confirm', { key: presign.data.key });
        await sendMessage(presign.data.publicUrl, 'voice');
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
      voiceTimerRef.current = setTimeout(
        () => {
          toast.error('حداکثر زمان ضبط ۵ دقیقه است');
          stopVoice();
        },
        5 * 60 * 1000,
      );
    } catch {
      toast.error('دسترسی به میکروفون ممکن نیست');
    }
  };

  const stopVoice = () => {
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
      }}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface/95 px-3 py-2 shadow-xs backdrop-blur-md">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          asChild={false}
          onClick={() => history.back()}
        />
        {head?.otherUser ? (
          <Link
            href={`/profile/${head.otherUser.username}`}
            className="flex min-w-0 items-center gap-2 rounded-full tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar size="sm" verified={head.otherUser.isVerified}>
              {head.otherUser.avatar ? <AvatarImage src={head.otherUser.avatar} alt="" /> : null}
              <AvatarFallback>{(head.otherUser.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-semibold">{head.otherUser.username}</span>
          </Link>
        ) : (
          <span className="text-sm font-semibold">گفتگو</span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-10 ${i % 2 === 0 ? 'me-auto w-2/5' : 'ms-auto w-3/5'} rounded-2xl`}
              />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="size-7" aria-hidden />}
            title="گفتگو خالی است"
            description="اولین پیام خود را بفرستید"
          />
        ) : (
          grouped.map((m) => (
            <ChatMessage
              key={m.id}
              id={m.id}
              content={m.content}
              type={m.type}
              isMine={m.isMine}
              createdAt={m.createdAt}
              sender={m.sender ?? undefined}
              isFirstOfGroup={m.isFirstOfGroup}
              isLastOfGroup={m.isLastOfGroup}
              status={m.id.startsWith('temp-') ? 'sending' : 'sent'}
            />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur-md"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void sendImage(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          aria-label="ارسال تصویر"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={recording ? 'پایان ضبط' : 'ضبط پیام صوتی'}
          className={`grid size-10 place-items-center rounded-full ${recording ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          onMouseDown={() => void startVoice()}
          onMouseUp={stopVoice}
          onTouchStart={() => void startVoice()}
          onTouchEnd={stopVoice}
        >
          <Mic className="size-5" aria-hidden />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیام بنویسید…"
          aria-label="نوشتن پیام"
          className="h-11 flex-1 rounded-full border border-transparent bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        <button
          type="submit"
          aria-label="ارسال"
          disabled={!text.trim()}
          className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-[0.96] disabled:opacity-50 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Send className="size-5 swap-x" aria-hidden />
        </button>
      </form>
    </div>
  );
}
