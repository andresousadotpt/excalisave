-- AlterTable: User - replace plaintext email with emailHash + encryptedEmail
ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;
ALTER TABLE "User" ADD COLUMN "encryptedEmail" TEXT;

-- Migrate existing data: hash email for lookups, keep plaintext as encryptedEmail
-- (encryptedEmail will be fixed by the seed script on next run)
UPDATE "User" SET
  "emailHash" = encode(sha256(lower(trim("email"))::bytea), 'hex'),
  "encryptedEmail" = "email";

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
