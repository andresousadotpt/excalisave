-- AlterTable
ALTER TABLE "User" ADD COLUMN "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");
