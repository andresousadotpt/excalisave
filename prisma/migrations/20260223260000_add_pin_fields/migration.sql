-- AlterTable
ALTER TABLE "User" ADD COLUMN "encryptedMasterKeyPin" TEXT,
ADD COLUMN "masterKeyPinSalt" TEXT,
ADD COLUMN "masterKeyPinIv" TEXT;
