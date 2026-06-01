'use client';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@agahiram/ui';

type CallPeer = {
  id: string;
  username: string | null;
  avatar: string | null;
};

type IncomingCallModalProps = {
  peer: CallPeer;
  onAccept: () => void;
  onReject: () => void;
};

export function IncomingCallModal({ peer, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-6 text-white">
      <Avatar size="xl" className="size-24">
        {peer.avatar ? <AvatarImage src={peer.avatar} alt="" /> : null}
        <AvatarFallback className="text-2xl">{(peer.username ?? '?').slice(0, 2)}</AvatarFallback>
      </Avatar>
      <p className="mt-4 text-lg font-semibold">{peer.username ?? 'کاربر'}</p>
      <p className="mt-1 text-sm text-white/70">تماس تصویری ورودی</p>
      <div className="mt-10 flex gap-4">
        <Button variant="destructive" size="lg" onClick={onReject}>
          رد
        </Button>
        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" onClick={onAccept}>
          پاسخ
        </Button>
      </div>
    </div>
  );
}
