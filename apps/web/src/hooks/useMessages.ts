'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConversationSummary } from '@agahiram/shared';
import { MessageType } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { connectSocket, SOCKET_EVENTS } from '@/lib/socket';
import { mockConversations } from '@/lib/mock-data';

interface ChatMessage {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  createdAt: string;
  isMine: boolean;
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await apiClient.get<ConversationSummary[]>('/messages/conversations');
      if (res.success && res.data) return res.data;
      return mockConversations;
    },
  });
}

export function useChat(conversationId: string) {
  const qc = useQueryClient();
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await apiClient.get<ChatMessage[]>(`/messages/${conversationId}`);
      if (res.success && res.data) return res.data;
      return [
        {
          id: 'm1',
          content: 'سلام، آگهی هنوز موجوده؟',
          type: MessageType.TEXT,
          senderId: 'other',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isMine: false,
        },
        {
          id: 'm2',
          content: 'بله، موجوده. می‌تونید تماس بگیرید.',
          type: MessageType.TEXT,
          senderId: 'me',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          isMine: true,
        },
      ] as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    const socket = connectSocket();
    const onMessage = (msg: ChatMessage & { conversationId: string }) => {
      if (msg.conversationId === conversationId) {
        setLiveMessages((prev) => [...prev, msg]);
      }
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    socket.on(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_RECEIVE, onMessage);
    };
  }, [conversationId, qc]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<ChatMessage>(`/messages/${conversationId}`, { content });
      if (res.success && res.data) return res.data;
      return {
        id: `local-${Date.now()}`,
        content,
        type: MessageType.TEXT,
        senderId: 'me',
        createdAt: new Date().toISOString(),
        isMine: true,
      } as ChatMessage;
    },
    onSuccess: (msg) => setLiveMessages((prev) => [...prev, msg]),
  });

  const messages = [...(query.data ?? []), ...liveMessages];

  return { ...query, messages, sendMessage };
}
