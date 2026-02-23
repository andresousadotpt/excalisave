-- AlterTable: User - replace plaintext email with emailHash + encryptedEmail
ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;
ALTER TABLE "User" ADD COLUMN "encryptedEmail" TEXT;

-- Migrate existing data: copy email to both new columns as placeholder
-- (real deployments should re-encrypt; for fresh installs this handles the seed user)
UPDATE "User" SET "emailHash" = "email", "encryptedEmail" = "email";

-- Make columns NOT NULL after backfill
ALTER TABLE "User" ALTER COLUMN "emailHash" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "encryptedEmail" SET NOT NULL;

-- Drop old email column and its unique index
DROP INDEX "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";

-- Create unique index on emailHash
CREATE UNIQUE INDEX "User_emailHash_key" ON "User"("emailHash");

-- AlterTable: Drawing - rename name to encryptedName
ALTER TABLE "Drawing" RENAME COLUMN "name" TO "encryptedName";
