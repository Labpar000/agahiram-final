'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageType } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  IconButton,
  IgArrowBack,
  IgClose,
  IgDirect,
  IgGallery,
  IgInfo,
  IgMic,
  IgSend,
  IgVideoCall,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  toast,
} from '@agahiram/ui';
import { ReportDialog } from '@/components/report-dialog';
import { apiClient } from '@/lib/api';
import { useUploadManager } from '@/lib/upload-manager';
import { ChatMessage } from '@/components/chat-message';
import { MobileInputShell } from '@/components/mobile-input-shell';
import { viewportHeightAboveChrome } from '@/lib/mobile-layout';
import { VoiceRecordOverlay } from '@/components/voice-record-overlay';
import { useConversation, canEditMessage, canDeleteMessage } from '@/hooks/useConversation';
import type { ChatMessageRow } from '@/hooks/useConversation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useCall } from '@/features/calls/call-provider';
import type { VoiceRecordingResult } from '@/lib/voice-recorder';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { uploadFile } = useUploadManager();
  const { startOutgoingCall, phase: callPhase } = useCall();
  const [text, setText] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<ChatMessageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageRow | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    head,
    messages,
    meId,
    isLoading,
    isError,
    refetch,
    sendMessage,
    editMessage,
    deleteMessage,
    addOptimisticMessage,
    removeOptimisticMessage,
  } = useConversation(id);

  const sendVoiceRecording = useCallback(
    async (result: VoiceRecordingResult) => {
      const tempId = `temp-voice-${Date.now()}`;
      const me = meId ?? 'me';
      const localPreviewUrl = URL.createObjectURL(result.blob);
      addOptimisticMessage({
        id: tempId,
        content: localPreviewUrl,
        type: MessageType.VOICE,
        metadata: { durationMs: result.durationMs, mimeType: result.mimeType },
        senderId: me,
        createdAt: new Date().toISOString(),
        sender: { id: me, username: null, avatar: null },
      });

      try {
        const file = new File([result.blob], `voice-${Date.now()}.${result.extension}`, {
          type: result.mimeType,
        });
        const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
          '/media/presign',
          {
            folder: 'messages',
            fileName: file.name,
            contentType: result.mimeType,
            extension: result.extension,
          },
        );
        if (!presign.success || !presign.data) {
          throw new Error('presign failed');
        }
        const ok = await uploadFile({
          label: 'ارسال پیام صوتی',
          url: presign.data.uploadUrl,
          file,
          contentType: result.mimeType,
        });
        if (!ok) throw new Error('upload failed');
        await apiClient.post('/media/confirm', { key: presign.data.key });
        await sendMessage.mutateAsync({
          content: presign.data.publicUrl,
          type: MessageType.VOICE,
          tempId,
          metadata: { durationMs: result.durationMs, mimeType: result.mimeType },
        });
      } catch {
        removeOptimisticMessage(tempId);
        toast.error('خطا در آپلود صدا');
      } finally {
        URL.revokeObjectURL(localPreviewUrl);
      }
    },
    [addOptimisticMessage, meId, removeOptimisticMessage, sendMessage, uploadFile],
  );

  const voice = useVoiceRecorder(sendVoiceRecording);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    requestAnimationFrame(() => {
      el.scrollTo({ top: h, behavior: 'smooth' });
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

  const send = async () => {
    if (!text.trim()) return;
    if (editingMessage) {
      const content = text.trim();
      setText('');
      setEditingMessage(null);
      await editMessage.mutateAsync({ messageId: editingMessage.id, content });
      return;
    }
    const tmp = text;
    setText('');
    const tempId = `temp-${Date.now()}`;
    await sendMessage.mutateAsync({ content: tmp, type: MessageType.TEXT, tempId });
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const startEdit = (message: ChatMessageRow) => {
    setActionMessage(null);
    setEditingMessage(message);
    setText(message.content);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteMessage.mutateAsync(deleteTarget.id);
    if (editingMessage?.id === deleteTarget.id) cancelEdit();
    setDeleteTarget(null);
  };

  const sendMedia = async (publicUrl: string, type: MessageType.IMAGE | MessageType.VOICE) => {
    const tempId = `temp-${Date.now()}`;
    await sendMessage.mutateAsync({ content: publicUrl, type, tempId });
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
    await sendMedia(presign.data.publicUrl, MessageType.IMAGE);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: viewportHeightAboveChrome,
      }}
    >
      <div className="glass flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          asChild={false}
          onClick={() => history.back()}
        />
        {head?.otherUser ? (
          <Link
            href={`/profile/${head.otherUser.username}`}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate text-sm font-semibold">{head.otherUser.username}</span>
          </Link>
        ) : (
          <span className="flex-1 text-center text-sm font-semibold">گفتگو</span>
        )}
        <IconButton
          aria-label="تماس ویدیویی"
          icon={<IgVideoCall className="size-5" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          disabled={!head?.otherUser || callPhase !== 'idle'}
          onClick={() => {
            if (head?.otherUser) void startOutgoingCall(id, head.otherUser);
          }}
        />
        <IconButton
          aria-label="اطلاعات گفتگو"
          icon={<IgInfo className="size-5" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          disabled={!head?.otherUser}
          onClick={() => setInfoOpen(true)}
        />
      </div>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="pb-[calc(var(--safe-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>اطلاعات گفتگو</SheetTitle>
          </SheetHeader>
          {head?.otherUser ? (
            <div className="space-y-4 pt-2">
              <Link
                href={`/profile/${head.otherUser.username}`}
                onClick={() => setInfoOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-muted/60 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar size="lg">
                  {head.otherUser.avatar ? (
                    <AvatarImage src={head.otherUser.avatar} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {(head.otherUser.username ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{head.otherUser.username}</p>
                  <p className="text-xs text-muted-foreground">مشاهده پروفایل</p>
                </div>
              </Link>
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setInfoOpen(false);
                  setReportOpen(true);
                }}
              >
                گزارش کاربر
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {head?.otherUser?.id ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={head.otherUser.id}
          title="گزارش کاربر"
        />
      ) : null}

      <MobileInputShell
        stickyComposer
        composerPadding="var(--chat-composer-stack)"
        scrollRef={scrollRef}
        scrollClassName="px-3 py-4"
        composer={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="relative flex flex-col gap-2 px-3 py-3 pb-[max(0.75rem,var(--safe-bottom))]"
          >
            {editingMessage ? (
              <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                <span className="text-muted-foreground">در حال ویرایش پیام</span>
                <button
                  type="button"
                  aria-label="لغو ویرایش"
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-background"
                  onClick={cancelEdit}
                >
                  <IgClose className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="relative flex min-w-0 items-center gap-2">
              <VoiceRecordOverlay elapsedLabel={voice.elapsedLabel} visible={voice.isRecording} />
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
              <IconButton
                type="button"
                aria-label="ارسال تصویر"
                variant="ghost"
                disabled={!!editingMessage}
                onClick={() => fileInputRef.current?.click()}
                icon={<IgGallery className="size-5" strokeWidth={1.75} aria-hidden />}
              />
              <IconButton
                type="button"
                aria-label={voice.isRecording ? 'پایان ضبط' : 'ضبط پیام صوتی'}
                variant={voice.isRecording ? 'destructive' : 'ghost'}
                disabled={voice.isProcessing || callPhase !== 'idle' || !!editingMessage}
                className="touch-none select-none"
                onPointerDown={voice.handlePointerDown}
                onPointerUp={voice.handlePointerUp}
                onPointerCancel={voice.handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                icon={<IgMic className="size-5" strokeWidth={1.75} aria-hidden />}
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={editingMessage ? 'ویرایش پیام…' : 'پیام بنویسید…'}
                aria-label={editingMessage ? 'ویرایش پیام' : 'نوشتن پیام'}
                className="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <IconButton
                type="submit"
                aria-label={editingMessage ? 'ذخیره ویرایش' : 'ارسال'}
                variant="ig-link"
                className="rounded-full"
                disabled={
                  !text.trim() ||
                  sendMessage.isPending ||
                  editMessage.isPending ||
                  (!!editingMessage && !canEditMessage(editingMessage))
                }
                icon={<IgSend className="size-5 swap-x" strokeWidth={1.75} aria-hidden />}
              />
            </div>
          </form>
        }
      >
        <div>
          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : isLoading ? (
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
              icon={<IgDirect className="size-7" strokeWidth={1.75} aria-hidden />}
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
                metadata={m.metadata}
                isMine={m.isMine}
                createdAt={m.createdAt}
                editedAt={m.editedAt}
                sender={m.sender ?? undefined}
                storyPreview={m.storyPreview}
                isFirstOfGroup={m.isFirstOfGroup}
                isLastOfGroup={m.isLastOfGroup}
                status={m.id.startsWith('temp-') ? 'sending' : 'sent'}
                onLongPress={
                  m.isMine && canDeleteMessage(m) ? () => setActionMessage(m) : undefined
                }
              />
            ))
          )}
        </div>
      </MobileInputShell>

      <Sheet open={!!actionMessage} onOpenChange={(open) => !open && setActionMessage(null)}>
        <SheetContent side="bottom" className="pb-[calc(var(--safe-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>گزینه‌های پیام</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pt-2">
            {actionMessage && canEditMessage(actionMessage) ? (
              <Button variant="outline" fullWidth onClick={() => startEdit(actionMessage)}>
                ویرایش
              </Button>
            ) : null}
            {actionMessage && canDeleteMessage(actionMessage) ? (
              <Button
                variant="destructive"
                fullWidth
                onClick={() => {
                  setDeleteTarget(actionMessage);
                  setActionMessage(null);
                }}
              >
                حذف
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف پیام</DialogTitle>
            <DialogDescription>این پیام برای همه حذف می‌شود. آیا مطمئن هستید؟</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMessage.isPending}
              onClick={() => void confirmDelete()}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
