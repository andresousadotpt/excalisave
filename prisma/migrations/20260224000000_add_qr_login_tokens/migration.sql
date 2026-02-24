-- CreateTable
CREATE TABLE "QrLoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "authToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrLoginToken_token_key" ON "QrLoginToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "QrLoginToken_shortCode_key" ON "QrLoginToken"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "QrLoginToken_authToken_key" ON "QrLoginToken"("authToken");

-- CreateIndex
CREATE INDEX "QrLoginToken_expiresAt_idx" ON "QrLoginToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "QrLoginToken" ADD CONSTRAINT "QrLoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
