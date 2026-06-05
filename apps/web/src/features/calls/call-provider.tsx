'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from '@agahiram/ui';
import { CALL_EVENTS } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { connectCallSocket, disconnectCallSocket } from '@/lib/call-socket';
import { useAuthStore } from '@/lib/auth-store';
import { ActiveCallView } from '@/features/calls/active-call-view';
import { IncomingCallModal } from '@/features/calls/incoming-call-modal';
import { OutgoingCallScreen } from '@/features/calls/outgoing-call-screen';
import { startRingtone, stopRingtone } from '@/features/calls/ringtone';

export type CallPeer = {
  id: string;
  username: string | null;
  avatar: string | null;
  name?: string | null;
};

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active';
type CallRole = 'initiator' | 'callee' | null;

type CallContextValue = {
  phase: CallPhase;
  startOutgoingCall: (conversationId: string, peer: CallPeer) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    return {
      phase: 'idle' as CallPhase,
      startOutgoingCall: async () => {},
      acceptCall: async () => {},
      rejectCall: async () => {},
      endCall: async () => {},
    };
  }
  return ctx;
}

type InvitePayload = {
  callId: string;
  conversationId: string;
  type: string;
  initiator: CallPeer;
};

type ConnectedPayload = {
  callId: string;
  conversationId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
};

type MissedPayload = { callId: string; silent?: boolean };

async function requestCallMedia(): Promise<boolean> {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    return true;
  } catch {
    toast.error('دسترسی به دوربین و میکروفون لازم است');
    return false;
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [_conversationId, setConversationId] = useState<string | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [callRole, setCallRole] = useState<CallRole>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const callRoleRef = useRef(callRole);
  callRoleRef.current = callRole;

  const reset = useCallback(() => {
    stopRingtone();
    setPhase('idle');
    setCallId(null);
    setConversationId(null);
    setPeer(null);
    setToken(null);
    setLivekitUrl(null);
    setCallRole(null);
  }, []);

  const endCall = useCallback(async () => {
    const id = callId;
    try {
      if (id) await apiClient.post(`/calls/${id}/end`, {});
    } finally {
      reset();
    }
  }, [callId, reset]);

  const acceptCall = useCallback(async () => {
    if (!callId) return;
    stopRingtone();
    const ok = await requestCallMedia();
    if (!ok) return;
    try {
      const r = await apiClient.post<{ token: string; livekitUrl: string }>(
        `/calls/${callId}/accept`,
        {},
      );
      if (!r.success || !r.data) throw new Error(r.error ?? 'accept failed');
      setToken(r.data.token);
      setLivekitUrl(r.data.livekitUrl);
      setPhase('active');
    } catch {
      toast.error('پاسخ به تماس ناموفق بود');
      reset();
    }
  }, [callId, reset]);

  const rejectCall = useCallback(async () => {
    if (!callId) return reset();
    stopRingtone();
    await apiClient.post(`/calls/${callId}/reject`, {});
    reset();
  }, [callId, reset]);

  const cancelOutgoing = useCallback(async () => {
    if (!callId) return reset();
    stopRingtone();
    await apiClient.post(`/calls/${callId}/cancel`, {});
    reset();
  }, [callId, reset]);

  const startOutgoingCall = useCallback(async (convId: string, other: CallPeer) => {
    if (phaseRef.current !== 'idle') return;
    const ok = await requestCallMedia();
    if (!ok) return;

    try {
      const r = await apiClient.post<{
        call: { id: string };
        token: string;
        livekitUrl: string;
      }>('/calls', { conversationId: convId, type: 'video' });
      if (!r.success || !r.data) {
        toast.error(r.error ?? 'شروع تماس ناموفق بود');
        return;
      }

      setCallId(r.data.call.id);
      setConversationId(convId);
      setPeer(other);
      setCallRole('initiator');
      setToken(r.data.token);
      setLivekitUrl(r.data.livekitUrl);
      setPhase('outgoing');
      startRingtone();
    } catch {
      toast.error('شروع تماس ناموفق بود');
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectCallSocket();
      reset();
      return;
    }
    const socket = connectCallSocket();

    const onInvite = (payload: InvitePayload) => {
      if (phaseRef.current !== 'idle') return;
      setCallId(payload.callId);
      setConversationId(payload.conversationId);
      setPeer(payload.initiator);
      setCallRole('callee');
      setPhase('incoming');
      startRingtone();
    };

    const onConnected = (payload: ConnectedPayload) => {
      stopRingtone();
      setCallId(payload.callId);
      setConversationId(payload.conversationId);
      setToken(payload.token);
      setLivekitUrl(payload.livekitUrl);
      setPhase('active');
    };

    const onEnd = () => reset();
    const onMissed = (payload?: MissedPayload) => {
      if (!payload?.silent && callRoleRef.current === 'initiator') {
        toast.error('تماس پاسخ داده نشد');
      }
      reset();
    };
    const onReject = () => {
      if (callRoleRef.current === 'initiator') toast.error('تماس رد شد');
      reset();
    };
    const onCancel = () => reset();
    const onBusy = () => {
      toast.error('طرف مقابل مشغول است');
      reset();
    };

    socket.on(CALL_EVENTS.INVITE, onInvite);
    socket.on(CALL_EVENTS.CONNECTED, onConnected);
    socket.on(CALL_EVENTS.END, onEnd);
    socket.on(CALL_EVENTS.MISSED, onMissed);
    socket.on(CALL_EVENTS.REJECT, onReject);
    socket.on(CALL_EVENTS.CANCEL, onCancel);
    socket.on(CALL_EVENTS.BUSY, onBusy);

    return () => {
      socket.off(CALL_EVENTS.INVITE, onInvite);
      socket.off(CALL_EVENTS.CONNECTED, onConnected);
      socket.off(CALL_EVENTS.END, onEnd);
      socket.off(CALL_EVENTS.MISSED, onMissed);
      socket.off(CALL_EVENTS.REJECT, onReject);
      socket.off(CALL_EVENTS.CANCEL, onCancel);
      socket.off(CALL_EVENTS.BUSY, onBusy);
    };
  }, [isAuthenticated, reset]);

  const value = useMemo(
    () => ({
      phase,
      startOutgoingCall,
      acceptCall,
      rejectCall,
      endCall,
    }),
    [phase, startOutgoingCall, acceptCall, rejectCall, endCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {phase === 'incoming' && peer ? (
        <IncomingCallModal
          peer={peer}
          onAccept={() => void acceptCall()}
          onReject={() => void rejectCall()}
        />
      ) : null}
      {phase === 'outgoing' && peer ? (
        <OutgoingCallScreen peer={peer} onCancel={() => void cancelOutgoing()} />
      ) : null}
      {phase === 'active' && peer && token && livekitUrl ? (
        <ActiveCallView
          token={token}
          livekitUrl={livekitUrl}
          peer={peer}
          onEnd={() => void endCall()}
        />
      ) : null}
    </CallContext.Provider>
  );
}
