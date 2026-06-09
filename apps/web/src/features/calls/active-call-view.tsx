'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ConnectionQuality,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import { toast } from '@agahiram/ui';
import { Avatar, AvatarFallback, AvatarImage, IgClose, IgMic, IgVideoCall } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { apiClient } from '@/lib/api';

type CallPeer = {
  id: string;
  username: string | null;
  avatar: string | null;
};

type ActiveCallViewProps = {
  callId: string;
  token: string;
  livekitUrl: string;
  peer: CallPeer;
  onEnd: () => void;
};

const TOKEN_REFRESH_MS = 8 * 60 * 1000;
const DISCONNECT_GRACE_MS = 15_000;

function qualityLabel(quality: ConnectionQuality): string {
  if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
    return 'اتصال خوب';
  }
  if (quality === ConnectionQuality.Poor) return 'اتصال ضعیف';
  return 'در حال بررسی…';
}

function qualityTone(quality: ConnectionQuality): string {
  if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
    return 'bg-emerald-500';
  }
  if (quality === ConnectionQuality.Poor) return 'bg-amber-500';
  return 'bg-white/40';
}

export function ActiveCallView({ callId, token, livekitUrl, peer, onEnd }: ActiveCallViewProps) {
  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef(token);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  onEndRef.current = onEnd;
  tokenRef.current = token;

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const micOnRef = useRef(micOn);
  const camOnRef = useRef(camOn);
  micOnRef.current = micOn;
  camOnRef.current = camOn;
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    ConnectionQuality.Unknown,
  );
  const [elapsed, setElapsed] = useState(0);

  const handleEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    onEndRef.current();
  };

  const attachLocalPreview = (room: Room) => {
    const cam = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (cam && localVideoRef.current) cam.attach(localVideoRef.current);
  };

  const refreshToken = async (): Promise<string | null> => {
    const r = await apiClient.post<{ token: string }>(`/calls/${callId}/refresh-token`, {});
    if (!r.success || !r.data?.token) return null;
    tokenRef.current = r.data.token;
    return r.data.token;
  };

  useEffect(() => {
    endedRef.current = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
        facingMode: 'user',
      },
      publishDefaults: {
        simulcast: true,
        videoCodec: 'vp8',
      },
    });
    roomRef.current = room;
    const started = Date.now();

    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    const attachRemote = () => {
      for (const participant of room.remoteParticipants.values()) {
        for (const pub of participant.trackPublications.values()) {
          if (!pub.track) continue;
          if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
            pub.track.attach(remoteVideoRef.current);
          }
          if (pub.kind === Track.Kind.Audio && remoteAudioRef.current) {
            pub.track.attach(remoteAudioRef.current);
          }
        }
      }
    };

    const scheduleDisconnectEnd = () => {
      if (disconnectTimerRef.current) return;
      disconnectTimerRef.current = setTimeout(() => {
        handleEnd();
      }, DISCONNECT_GRACE_MS);
    };

    const clearDisconnectEnd = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };

    const tryReconnectWithFreshToken = async () => {
      const fresh = await refreshToken();
      if (!fresh || endedRef.current) return false;
      try {
        await room.connect(livekitUrl, fresh, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(micOnRef.current);
        await room.localParticipant.setCameraEnabled(camOnRef.current);
        attachLocalPreview(room);
        attachRemote();
        return true;
      } catch {
        return false;
      }
    };

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
      if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
    });

    room.on(RoomEvent.Connected, () => {
      setConnected(true);
      setReconnecting(false);
      clearDisconnectEnd();
      attachRemote();
      attachLocalPreview(room);
    });

    room.on(RoomEvent.Reconnecting, () => {
      setReconnecting(true);
      setConnected(false);
    });

    room.on(RoomEvent.Reconnected, () => {
      setReconnecting(false);
      setConnected(true);
      clearDisconnectEnd();
      attachRemote();
      attachLocalPreview(room);
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      setConnected(false);
      if (reason === DisconnectReason.CLIENT_INITIATED) {
        handleEnd();
        return;
      }
      void (async () => {
        const ok = await tryReconnectWithFreshToken();
        if (!ok) scheduleDisconnectEnd();
      })();
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal) setConnectionQuality(quality);
    });

    void (async () => {
      try {
        await room.connect(livekitUrl, tokenRef.current, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        attachLocalPreview(room);
      } catch {
        toast.error('اتصال برقرار نشد — شبکه یا دسترسی دوربین را بررسی کنید');
        handleEnd();
      }
    })();

    const refreshTimer = setInterval(() => {
      void refreshToken();
    }, TOKEN_REFRESH_MS);

    return () => {
      clearInterval(tick);
      clearInterval(refreshTimer);
      clearDisconnectEnd();
      void room.disconnect();
      roomRef.current = null;
    };
  }, [livekitUrl, token, callId]);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
    if (!next && localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    } else if (next) {
      attachLocalPreview(room);
    }
  };

  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {!connected ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70">
          <p className="text-sm">{reconnecting ? 'در حال اتصال مجدد…' : 'در حال اتصال…'}</p>
        </div>
      ) : null}

      <div className="relative z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {peer.avatar ? <AvatarImage src={peer.avatar} alt="" /> : null}
            <AvatarFallback>{(peer.username ?? '?').slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{peer.username ?? 'کاربر'}</p>
            <p className="text-xs tabular-nums text-white/70">
              {mm}:{ss.toString().padStart(2, '0')}
            </p>
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-1.5 text-xs text-white/70">
            <span
              aria-hidden
              className={cn('size-2 rounded-full', qualityTone(connectionQuality))}
            />
            <span>{qualityLabel(connectionQuality)}</span>
          </div>
        ) : null}
      </div>

      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute end-4 top-20 z-10 h-36 w-28 rounded-xl border border-white/20 object-cover shadow-lg"
      />

      <div className="relative z-10 mt-auto flex items-center justify-center gap-4 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label={micOn ? 'قطع میکروفون' : 'روشن کردن میکروفون'}
          onClick={() => void toggleMic()}
          className={cn(
            'grid size-14 place-items-center rounded-full',
            micOn ? 'bg-white/15' : 'bg-destructive',
          )}
        >
          <IgMic className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="پایان تماس"
          onClick={handleEnd}
          className="grid size-16 place-items-center rounded-full bg-destructive"
        >
          <IgClose className="size-7" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={camOn ? 'قطع دوربین' : 'روشن کردن دوربین'}
          onClick={() => void toggleCam()}
          className={cn(
            'grid size-14 place-items-center rounded-full',
            camOn ? 'bg-white/15' : 'bg-destructive',
          )}
        >
          <IgVideoCall className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
