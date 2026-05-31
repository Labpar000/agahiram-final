'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageType, type SendMessageInput } from '@agahiram/shared';
import { toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { connectSocket, SOCKET_EVENTS } from '@/lib/socket';

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
  sender: { id: string; username: string | null; avatar: string | null };
  storyPreview?: StoryPreviewInMessage;
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
      return r.data;
    },
    enabled: !!conversationId,
  });

  const messagesQuery = useQuery({
    queryKey: ['chat', conversationId],
    queryFn: async () => {
      const r = await apiClient.get<{ data: ChatMessageRow[]; meId?: string }>(
        `/messages/conversations/${conversationId}`,
      );
      return { messages: r.data?.data ?? [], meId: r.data?.meId ?? null };
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
          (m) => !(m.id.startsWith('temp-') && m.senderId === msg.senderId),
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
    socket.on(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
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
    }: {
      content: string;
      type?: SendMessageInput['type'];
      tempId?: string;
    }) => {
      const r = await apiClient.post<{ message: ChatMessageRow }>('/messages', {
        conversationId,
        content,
        type,
      } satisfies SendMessageInput);
      if (!r.success || !r.data?.message) throw r;
      return { message: r.data.message, tempId };
    },
    onMutate: async ({ content, type = MessageType.TEXT, tempId }) => {
      const optimisticId = tempId ?? `temp-${Date.now()}`;
      const me = messagesQuery.data?.meId;
      const optimistic: ChatMessageRow = {
        id: optimisticId,
        content,
        type,
        senderId: me ?? 'me',
        createdAt: new Date().toISOString(),
        sender: { id: me ?? 'me', username: null, avatar: null },
      };
      setLiveMessages((prev) => [...prev, optimistic]);
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

  return {
    head: headQuery.data,
    headLoading: headQuery.isLoading && !headQuery.data,
    messages,
    meId: messagesQuery.data?.meId ?? null,
    isLoading: messagesQuery.isLoading && !messagesQuery.data,
    sendMessage,
  };
}
