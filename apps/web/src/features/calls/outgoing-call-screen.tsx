'use client';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@agahiram/ui';

type CallPeer = {
  id: string;
  username: string | null;
  avatar: string | null;
};

type OutgoingCallScreenProps = {
  peer: CallPeer;
  onCancel: () => void;
};

export function OutgoingCallScreen({ peer, onCancel }: OutgoingCallScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-6 text-white">
      <Avatar size="xl" className="size-24 animate-pulse">
        {peer.avatar ? <AvatarImage src={peer.avatar} alt="" /> : null}
        <AvatarFallback className="text-2xl">{(peer.username ?? '?').slice(0, 2)}</AvatarFallback>
      </Avatar>
      <p className="mt-4 text-lg font-semibold">{peer.username ?? 'کاربر'}</p>
      <p className="mt-1 text-sm text-white/70">در حال زنگ خوردن…</p>
      <Button variant="destructive" size="lg" className="mt-10" onClick={onCancel}>
        لغو
      </Button>
    </div>
  );
}
