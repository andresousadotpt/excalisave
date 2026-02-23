-- Fix emailHash values that contain plaintext email instead of SHA-256 hashes.
-- SHA-256 hashes are exactly 64 lowercase hex characters.
-- Any emailHash that doesn't match this pattern is plaintext from the initial migration.

-- Step 1: Delete duplicate admin records created by seed after the broken migration.
-- The seed couldn't find the original admin (wrong hash format) so it created a new one.
-- We keep the older record (which has the user's changed password) and delete the newer duplicate.
DELETE FROM "User" WHERE id IN (
  SELECT a.id FROM "User" a
  INNER JOIN "User" b ON a.role = b.role
    AND a.role = 'admin'
    AND a."createdAt" > b."createdAt"
    AND a.id != b.id
);

-- Step 2: Convert plaintext emailHash to proper SHA-256 hash.
-- PostgreSQL's sha256() returns bytea, encode() converts to hex string.
UPDATE "User"
SET "emailHash" = encode(sha256(lower(trim("emailHash"))::bytea), 'hex')
WHERE "emailHash" !~ '^[0-9a-f]{64}$';
