'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageType, MESSAGE_EDIT_WINDOW_MS, type SendMessageInput } from '@agahiram/shared';
import { toast } from '@agahiram/ui';
import { apiClient, assertSuccess } from '@/lib/api';
import { connectSocket, SOCKET_EVENTS } from '@/lib/socket';
import type { VoiceMessageMetadata } from '@/components/chat-message';

export interface StoryPreviewInMessage {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
  overlayJson?: unknown;
  ownerUserId?: string;
  ownerUsername?: string | null;
  ownerAvatar?: string | null;
}

export interface ChatMessageRow {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  editedAt?: string | null;
  metadata?: VoiceMessageMetadata | null;
  sender: { id: string; username: string | null; avatar: string | null };
  storyPreview?: StoryPreviewInMessage;
}

export function canEditMessage(message: Pick<ChatMessageRow, 'type' | 'createdAt' | 'id'>) {
  if (message.id.startsWith('temp-')) return false;
  if (message.type !== MessageType.TEXT) return false;
  const ageMs = Date.now() - new Date(message.createdAt).getTime();
  return ageMs <= MESSAGE_EDIT_WINDOW_MS;
}

export function canDeleteMessage(message: Pick<ChatMessageRow, 'id'>) {
  return !message.id.startsWith('temp-');
}

export function useConversation(conversationId: string) {
  const qc = useQueryClient();
  const [liveMessages, setLiveMessages] = useState<ChatMessageRow[]>([]);

  const headQuery = useQuery({
    queryKey: ['conv-head', conversationId],
    queryFn: async () => {
      const r = await apiClient.get<{
        id: string;
        otherUser?: {
          id: string;
          username: string | null;
          avatar: string | null;
          isVerified?: boolean;
        };
      }>(`/messages/conversations/${conversationId}/head`);
      return assertSuccess(r);
    },
    enabled: !!conversationId,
  });

  const messagesQuery = useQuery({
    queryKey: ['chat', conversationId],
    queryFn: async () => {
      const r = await apiClient.get<{ data: ChatMessageRow[]; meId?: string }>(
        `/messages/conversations/${conversationId}`,
      );
      const data = assertSuccess(r);
      return { messages: data.data ?? [], meId: data.meId ?? null };
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });

  useEffect(() => {
    setLiveMessages([]);
  }, [conversationId]);

  useEffect(() => {
    const socket = connectSocket();
    const onMessage = (msg: ChatMessageRow & { conversationId?: string }) => {
      if (msg.conversationId && msg.conversationId !== conversationId) return;
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const cleaned = prev.filter(
          (m) => !(m.id.startsWith('temp-') && m.senderId === msg.senderId && m.type === msg.type),
        );
        return [...cleaned, msg];
      });
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          const base = old.messages.filter((m) => !m.id.startsWith('temp-'));
          if (base.some((m) => m.id === msg.id)) return old;
          return { ...old, messages: [...base, msg] };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    const onUpdate = (msg: ChatMessageRow & { conversationId?: string }) => {
      if (msg.conversationId && msg.conversationId !== conversationId) return;
      const patch = (m: ChatMessageRow) =>
        m.id === msg.id
          ? {
              ...m,
              ...msg,
              editedAt: msg.editedAt ?? new Date().toISOString(),
            }
          : m;
      setLiveMessages((prev) => prev.map(patch));
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map(patch) };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    const onDelete = (payload: { messageId: string; conversationId?: string }) => {
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      setLiveMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.filter((m) => m.id !== payload.messageId),
          };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    socket.on(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATE, onUpdate);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETE, onDelete);
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATE, onUpdate);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETE, onDelete);
    };
  }, [conversationId, qc]);

  const messages = useMemo(() => {
    const base = messagesQuery.data?.messages ?? [];
    const merged = [...base];
    for (const m of liveMessages) {
      if (!merged.some((x) => x.id === m.id)) merged.push(m);
    }
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messagesQuery.data?.messages, liveMessages]);

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      type = MessageType.TEXT,
      tempId,
      metadata,
    }: {
      content: string;
      type?: SendMessageInput['type'];
      tempId?: string;
      metadata?: SendMessageInput['metadata'];
    }) => {
      const r = await apiClient.post<{ message: ChatMessageRow }>('/messages', {
        conversationId,
        content,
        type,
        metadata,
      } satisfies SendMessageInput);
      if (!r.success || !r.data?.message) throw r;
      return { message: r.data.message, tempId };
    },
    onMutate: async ({ content, type = MessageType.TEXT, tempId, metadata }) => {
      const optimisticId = tempId ?? `temp-${Date.now()}`;
      const me = messagesQuery.data?.meId;
      const optimistic: ChatMessageRow = {
        id: optimisticId,
        content,
        type,
        metadata: metadata ?? null,
        senderId: me ?? 'me',
        createdAt: new Date().toISOString(),
        sender: { id: me ?? 'me', username: null, avatar: null },
      };
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === optimisticId)) return prev;
        return [...prev, optimistic];
      });
      return { optimisticId };
    },
    onSuccess: ({ message, tempId }, _vars, ctx) => {
      const replaceId = tempId ?? ctx?.optimisticId;
      setLiveMessages((prev) => {
        const withoutTemp = replaceId ? prev.filter((m) => m.id !== replaceId) : prev;
        if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
        return [...withoutTemp, message];
      });
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          const base = replaceId ? old.messages.filter((m) => m.id !== replaceId) : old.messages;
          if (base.some((m) => m.id === message.id)) return { ...old, messages: base };
          return { ...old, messages: [...base, message] };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.optimisticId) {
        setLiveMessages((prev) => prev.filter((m) => m.id !== ctx.optimisticId));
      }
      const apiErr = err as { success?: boolean; error?: string };
      if (apiErr && typeof apiErr === 'object' && 'success' in apiErr && !apiErr.success) {
        toast.error(apiErr.error ?? 'ارسال پیام ناموفق بود');
      } else {
        toast.error('ارسال پیام ناموفق بود');
      }
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const r = await apiClient.patch<ChatMessageRow>(`/messages/${messageId}`, { content });
      if (!r.success || !r.data) throw r;
      return r.data;
    },
    onSuccess: (message) => {
      const patch = (m: ChatMessageRow) => (m.id === message.id ? { ...m, ...message } : m);
      setLiveMessages((prev) => prev.map(patch));
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map(patch) };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      const apiErr = err as { success?: boolean; error?: string };
      if (apiErr && typeof apiErr === 'object' && 'success' in apiErr && !apiErr.success) {
        toast.error(apiErr.error ?? 'ویرایش پیام ناموفق بود');
      } else {
        toast.error('ویرایش پیام ناموفق بود');
      }
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const r = await apiClient.delete<{ ok: boolean }>(`/messages/${messageId}`);
      if (!r.success) throw r;
      return messageId;
    },
    onSuccess: (messageId) => {
      setLiveMessages((prev) => prev.filter((m) => m.id !== messageId));
      qc.setQueryData(
        ['chat', conversationId],
        (old: { messages: ChatMessageRow[]; meId: string | null } | undefined) => {
          if (!old) return old;
          return { ...old, messages: old.messages.filter((m) => m.id !== messageId) };
        },
      );
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('پیام حذف شد');
    },
    onError: (err) => {
      const apiErr = err as { success?: boolean; error?: string };
      if (apiErr && typeof apiErr === 'object' && 'success' in apiErr && !apiErr.success) {
        toast.error(apiErr.error ?? 'حذف پیام ناموفق بود');
      } else {
        toast.error('حذف پیام ناموفق بود');
      }
    },
  });

  const refetch = () => {
    void headQuery.refetch();
    void messagesQuery.refetch();
  };

  return {
    head: headQuery.data,
    headLoading: headQuery.isLoading && !headQuery.data,
    messages,
    meId: messagesQuery.data?.meId ?? null,
    isLoading: messagesQuery.isLoading && !messagesQuery.data,
    isError: headQuery.isError || messagesQuery.isError,
    refetch,
    sendMessage,
    editMessage,
    deleteMessage,
    addOptimisticMessage: (msg: ChatMessageRow) => {
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    removeOptimisticMessage: (id: string) => {
      setLiveMessages((prev) => prev.filter((m) => m.id !== id));
    },
  };
}

export function formatLastMessagePreview(
  msg?: {
    type: string;
    content: string;
  } | null,
): string {
  if (!msg) return 'گفتگو را شروع کنید';
  if (msg.type === 'voice') return 'پیام صوتی';
  if (msg.type === 'image') return 'تصویر';
  if (msg.type === 'post') return 'آگهی';
  if (msg.type === 'call_event') return msg.content;
  return msg.content;
}
