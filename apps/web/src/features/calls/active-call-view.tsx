'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Avatar, AvatarFallback, AvatarImage, IgClose, IgMic, IgVideoCall } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

type CallPeer = {
  id: string;
  username: string | null;
  avatar: string | null;
};

type ActiveCallViewProps = {
  token: string;
  livekitUrl: string;
  peer: CallPeer;
  onEnd: () => void;
};

export function ActiveCallView({ token, livekitUrl, peer, onEnd }: ActiveCallViewProps) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const handleEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEndRef.current();
  };

  useEffect(() => {
    endedRef.current = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
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
      attachRemote();
      const localVideo = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (localVideo && localVideoRef.current) localVideo.attach(localVideoRef.current);
    });

    room.on(RoomEvent.Disconnected, handleEnd);

    void (async () => {
      try {
        await room.connect(livekitUrl, token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        const cam = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (cam && localVideoRef.current) cam.attach(localVideoRef.current);
      } catch {
        handleEnd();
      }
    })();

    return () => {
      clearInterval(tick);
      room.off(RoomEvent.Disconnected, handleEnd);
      void room.disconnect();
      roomRef.current = null;
    };
  }, [livekitUrl, token]);

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
          <p className="text-sm">در حال اتصال…</p>
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
