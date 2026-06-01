-- Voice message metadata + video call models

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'incomingCall';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'missedCall';

ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'call_event';

CREATE TYPE "CallStatus" AS ENUM ('ringing', 'accepted', 'active', 'ended', 'missed', 'rejected', 'busy', 'failed');
CREATE TYPE "CallType" AS ENUM ('video', 'audio');

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS "Call" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "type" "CallType" NOT NULL DEFAULT 'video',
    "status" "CallStatus" NOT NULL DEFAULT 'ringing',
    "roomName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Call_roomName_key" ON "Call"("roomName");
CREATE INDEX IF NOT EXISTS "Call_conversationId_createdAt_idx" ON "Call"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Call_calleeId_status_idx" ON "Call"("calleeId", "status");
CREATE INDEX IF NOT EXISTS "Call_initiatorId_status_idx" ON "Call"("initiatorId", "status");

ALTER TABLE "Call" ADD CONSTRAINT "Call_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Call" ADD CONSTRAINT "Call_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Call" ADD CONSTRAINT "Call_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
