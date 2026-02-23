-- AlterTable
ALTER TABLE "User" ADD COLUMN "verificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "inviteTokenExpiresAt" TIMESTAMP(3);
