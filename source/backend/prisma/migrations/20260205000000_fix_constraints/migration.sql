-- DropIndex
DROP INDEX IF EXISTS "users_customerCode_key";

-- DropIndex
DROP INDEX IF EXISTS "users_username_key";

-- CreatePartialIndex
CREATE UNIQUE INDEX "users_customerCode_key" ON "users"("customerCode") WHERE "deletedAt" IS NULL;

-- CreatePartialIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username") WHERE "deletedAt" IS NULL;
